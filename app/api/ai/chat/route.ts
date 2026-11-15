import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loadBundle } from "@/lib/bundle";
import { buildCorpus } from "@/lib/ai/corpus";
import { nothingRelevant, retrieve } from "@/lib/ai/retrieve";
import { callJson, aiErrorResponse, AiNotConfigured } from "@/lib/ai/openai";
import { CHAT_SCHEMA, GAP_SENTENCE, GROUNDING_RULES } from "@/lib/ai/prompts";
import { openaiConfigured } from "@/lib/env";
import { anonymousAiHeaders, enforceAnonymousAiLimit } from "@/lib/ai/anonymous-limit";
import type { AnswerSegment, Citation } from "@/lib/types";

export const maxDuration = 60;

const body = z.object({ projectId: z.string().uuid(), conversationId: z.string().uuid().nullable().optional(), message: z.string().trim().min(1).max(2000) });

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { projectId, message } = parsed.data;
  if (!openaiConfigured()) return aiErrorResponse(new AiNotConfigured());

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const bundle = await loadBundle(supabase, projectId);
  if (!bundle) return Response.json({ error: "Project not found or you don't have access." }, { status: 404 });

  const quota = await enforceAnonymousAiLimit(supabase);
  if (quota.error) return quota.error;

  // Conversation + prior turns
  let conversationId = parsed.data.conversationId ?? null;
  let history: { role: "user" | "assistant"; content: string }[] = [];
  if (conversationId) {
    const { data } = await supabase.from("ai_messages").select("role,content").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(12);
    history = (data ?? []) as typeof history;
  }

  // Retrieval over the project's documented knowledge
  const corpus = buildCorpus(bundle);
  // Short follow-ups ("which research supports this?") borrow the previous user question for retrieval.
  const lastUser = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
  const retrievalQuery = lastUser && (message.split(/\s+/).length < 7 || /\b(this|that|it|those|these|them)\b/i.test(message)) ? `${lastUser} ${message}` : message;
  const hits = retrieve(retrievalQuery, corpus, 10);
  let segments: AnswerSegment[];
  let followups: string[] = [];
  const citations = new Map<string, Citation>();

  if (nothingRelevant(hits)) {
    // Deterministic guard: nothing in the project matches — never ask the model to improvise.
    segments = [{ kind: "gap", citations: [], text: `I couldn't find anything in this project's documented history that relates to that question. If it matters, record it as research, a decision, a revision note or a project note so the next engineer can find it.` }];
  } else {
    const idx = new Map(hits.map((h, i) => [`S${i + 1}`, h.chunk]));
    const sources = hits.map((h, i) => `[S${i + 1}] (${h.chunk.type}) ${h.chunk.title}\n${h.chunk.text}`).join("\n\n---\n\n");
    try {
      const out = await callJson<{ segments: AnswerSegment[]; followups: string[] }>({
        system: GROUNDING_RULES,
        name: "project_answer",
        schema: CHAT_SCHEMA,
        messages: [
          ...history.slice(-6),
          { role: "user", content: `PROJECT: ${bundle.project.name}\n\nSOURCES:\n${sources}\n\nQUESTION: ${message}` },
        ],
      });
      segments = out.segments.map((s) => ({
        ...s,
        citations: [...new Set(s.citations.filter((c) => idx.has(c)))].map((c) => idx.get(c)!.id),
      }));
      // A factual or interpretive claim with no valid citation is not allowed to pose as documented fact.
      segments = segments.map((s) => (s.kind === "fact" && s.citations.length === 0 ? { ...s, kind: "interpretation" as const } : s));
      followups = out.followups.slice(0, 3);
      for (const s of segments) for (const id of s.citations) {
        const c = corpus.find((x) => x.id === id);
        if (c && !citations.has(id)) citations.set(id, { id, type: c.type, title: c.title, href: c.href, excerpt: c.text.split("\n").slice(1, 3).join(" ").slice(0, 200) });
      }
      // Deterministic backstop: if the answer leans on a decision that has no recorded reasoning and no evidence for a
      // "why" question, the exact required sentence must appear even if the model omitted it.
      if (/\b(why|reason|rationale|explain)\b/i.test(message) && !segments.some((s) => s.text.includes(GAP_SENTENCE))) {
        const gapDecision = [...citations.keys()].map((id) => corpus.find((c) => c.id === id)).find((c) => c?.type === "decision" && c.text.includes("DOCUMENTATION GAP"));
        if (gapDecision) segments.push({ kind: "gap", text: GAP_SENTENCE, citations: [gapDecision.id] });
      }
    } catch (e) {
      return aiErrorResponse(e);
    }
  }

  const answerText = segments.map((s) => s.text).join("\n\n");
  if (!conversationId) {
    const { data: conv, error } = await supabase.from("ai_conversations").insert({ project_id: projectId, user_id: auth.user.id, title: message.slice(0, 80) }).select("id").single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    conversationId = conv.id;
  }
  await supabase.from("ai_messages").insert({ project_id: projectId, conversation_id: conversationId, role: "user", content: message });
  const { data: saved } = await supabase.from("ai_messages")
    .insert({ project_id: projectId, conversation_id: conversationId, role: "assistant", content: answerText, segments, citations: [...citations.values()] })
    .select("id,created_at").single();

  return Response.json({ conversationId, followups, message: { id: saved?.id, role: "assistant", content: answerText, segments, citations: [...citations.values()], created_at: saved?.created_at } }, { headers: anonymousAiHeaders(quota) });
}

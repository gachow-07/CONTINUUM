import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { callJson, aiErrorResponse, AiNotConfigured } from "@/lib/ai/anthropic";
import { anthropicConfigured } from "@/lib/env";
import { requireProjectWriter } from "@/lib/ai/project-permission";
import { anonymousAiHeaders, enforceAnonymousAiLimit } from "@/lib/ai/anonymous-limit";

export const maxDuration = 60;
const body = z.object({ kind: z.enum(["research", "decision"]), id: z.string().uuid() });
const SCHEMA = { type: "object", additionalProperties: false, required: ["summary"], properties: { summary: { type: "string" } } };
const SYSTEM = `Summarize the provided engineering record in 2–4 sentences for a teammate who has not seen it. Use ONLY the provided text. Do not add facts, numbers, results or conclusions that are not in it. If the text is thin, say what is not documented. Mention the engineer's stated reason it matters if one is given.`;

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  if (!anthropicConfigured()) return aiErrorResponse(new AiNotConfigured());
  const supabase = await createClient();
  const { kind, id } = parsed.data;

  let text = "";
  let projectId: string;
  if (kind === "research") {
    const { data } = await supabase.from("research_sources").select("*").eq("id", id).maybeSingle();
    if (!data) return Response.json({ error: "Not found" }, { status: 404 });
    projectId = data.project_id;
    text = `Research source: ${data.title}\nType: ${data.type}\nDescription: ${data.description}\nWhy it matters: ${data.why_important}\nContent: ${(data.content_text ?? "").slice(0, 12000) || "(no text available)"}`;
  } else {
    const { data } = await supabase.from("design_decisions").select("*").eq("id", id).maybeSingle();
    if (!data) return Response.json({ error: "Not found" }, { status: 404 });
    projectId = data.project_id;
    text = `Decision: ${data.title}\nProblem: ${data.problem}\nSelected: ${data.selected_solution}\nAlternatives: ${JSON.stringify(data.alternatives)}\nReasoning: ${data.reasoning || "(none documented)"}`;
  }
  const permission = await requireProjectWriter(supabase, projectId);
  if (permission) return permission;
  const quota = await enforceAnonymousAiLimit(supabase);
  if (quota.error) return quota.error;

  try {
    const out = await callJson<{ summary: string }>({ system: SYSTEM, name: "summary", schema: SCHEMA, messages: [{ role: "user", content: text }] });
    const table = kind === "research" ? "research_sources" : "design_decisions";
    await supabase.from(table).update({ ai_summary: out.summary }).eq("id", id);
    return Response.json({ summary: out.summary }, { headers: anonymousAiHeaders(quota) });
  } catch (e) {
    return aiErrorResponse(e);
  }
}

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loadBundle } from "@/lib/bundle";
import { callJson, aiErrorResponse, AiNotConfigured } from "@/lib/ai/anthropic";
import { DECISION_SCHEMA, DECISION_SYSTEM } from "@/lib/ai/prompts";
import { anthropicConfigured } from "@/lib/env";
import { anonymousAiHeaders, enforceAnonymousAiLimit } from "@/lib/ai/anonymous-limit";
import { formatDate } from "@/lib/utils";

export const maxDuration = 60;

const body = z.object({
  projectId: z.string().uuid(),
  draft: z.object({
    title: z.string().max(300).default(""), subsystem: z.string().max(100).default(""), problem: z.string().max(6000).default(""),
    selected_solution: z.string().max(6000).default(""), reasoning: z.string().max(6000).default(""),
    alternatives: z.array(z.object({ name: z.string(), reason_rejected: z.string() })).max(10).default([]),
    free_text: z.string().max(8000).default(""),
  }),
});

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  if (!anthropicConfigured()) return aiErrorResponse(new AiNotConfigured());
  const { projectId, draft } = parsed.data;
  if (![draft.title, draft.problem, draft.selected_solution, draft.reasoning, draft.free_text].some((s) => s.trim())) {
    return Response.json({ error: "Write something about the decision first — even a rough sentence — then ask for help." }, { status: 400 });
  }

  const supabase = await createClient();
  const bundle = await loadBundle(supabase, projectId);
  if (!bundle) return Response.json({ error: "Project not found" }, { status: 404 });

  const quota = await enforceAnonymousAiLimit(supabase);
  if (quota.error) return quota.error;

  const recs: { id: string; kind: "research" | "revision" | "file"; title: string; line: string }[] = [
    ...bundle.research.map((r) => ({ id: r.id, kind: "research" as const, title: r.title, line: `Research "${r.title}" — ${r.why_important || r.description || "no notes"}` })),
    ...bundle.revisions.map((r) => ({ id: r.id, kind: "revision" as const, title: `${r.rev_label}: ${r.title}`, line: `Revision ${r.rev_label} "${r.title}" (${formatDate(r.occurred_on)}) — changed: ${r.description || "n/a"}; why: ${r.reason || "n/a"}` })),
    ...bundle.files.map((f) => ({ id: f.id, kind: "file" as const, title: f.name, line: `File "${f.name}" (${f.category}) — ${f.description || "no description"}` })),
  ];
  const idx = new Map(recs.map((r, i) => [`S${i + 1}`, r]));

  const prompt = `DRAFT DECISION (the engineer's own words):
Title: ${draft.title || "(blank)"}
Subsystem: ${draft.subsystem || "(unspecified)"}
Problem: ${draft.problem || "(blank)"}
Selected solution: ${draft.selected_solution || "(blank)"}
Alternatives: ${draft.alternatives.map((a) => `${a.name} (rejected because: ${a.reason_rejected || "not stated"})`).join("; ") || "(blank)"}
Reasoning: ${draft.reasoning || "(blank)"}
Free-form explanation: ${draft.free_text || "(blank)"}

PROJECT RECORDS:
${recs.map((r, i) => `[S${i + 1}] ${r.line}`).join("\n") || "(none yet)"}`;

  try {
    const out = await callJson<{
      organized: { problem: string; selected_solution: string; alternatives: { name: string; reason_rejected: string }[]; reasoning: string };
      missing: { field: string; question: string }[]; questions: string[]; summary: string; suggested_evidence: { source: string; why: string }[];
    }>({ system: DECISION_SYSTEM, name: "decision_assist", schema: DECISION_SCHEMA, messages: [{ role: "user", content: prompt }] });
    const suggested = out.suggested_evidence
      .map((s) => ({ rec: idx.get(s.source), why: s.why }))
      .filter((s) => s.rec)
      .map((s) => ({ kind: s.rec!.kind, id: s.rec!.id, title: s.rec!.title, why: s.why }));
    return Response.json({ ...out, suggested_evidence: suggested }, { headers: anonymousAiHeaders(quota) });
  } catch (e) {
    return aiErrorResponse(e);
  }
}

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loadBundle } from "@/lib/bundle";
import { buildCorpus } from "@/lib/ai/corpus";
import { callJson, aiErrorResponse, AiNotConfigured } from "@/lib/ai/openai";
import { DOC_SCHEMA, DOC_SYSTEM, DOC_TYPES } from "@/lib/ai/prompts";
import { openaiConfigured } from "@/lib/env";
import { anonymousAiHeaders, enforceAnonymousAiLimit } from "@/lib/ai/anonymous-limit";
import type { DocSection } from "@/lib/types";

export const maxDuration = 120;

const ids = z.array(z.string().uuid()).default([]);
const body = z.object({
  projectId: z.string().uuid(),
  docType: z.string(),
  selection: z.object({
    subsystemIds: ids, decisionIds: ids, researchIds: ids, revisionIds: ids, reviewIds: ids,
    dateFrom: z.string().nullable().optional(), dateTo: z.string().nullable().optional(),
  }),
  onlySection: z.string().optional(),   // regenerate a single section
  guidance: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  if (!openaiConfigured()) return aiErrorResponse(new AiNotConfigured());
  const { projectId, docType, selection: sel, onlySection, guidance } = parsed.data;
  const spec = DOC_TYPES[docType];
  if (!spec) return Response.json({ error: "Unknown document type" }, { status: 400 });

  const supabase = await createClient();
  const b = await loadBundle(supabase, projectId);
  if (!b) return Response.json({ error: "Project not found" }, { status: 404 });

  // Filter the project's records by the user's selection. Empty selection = everything (within subsystem/date filters).
  const inDate = (d: string) => (!sel.dateFrom || d.slice(0, 10) >= sel.dateFrom) && (!sel.dateTo || d.slice(0, 10) <= sel.dateTo);
  const inSub = (s: string | null) => !sel.subsystemIds.length || (s !== null && sel.subsystemIds.includes(s));
  const pick = (selected: string[], id: string) => !selected.length || selected.includes(id);

  const filtered = {
    ...b,
    subsystems: b.subsystems.filter((s) => !sel.subsystemIds.length || sel.subsystemIds.includes(s.id)),
    decisions: b.decisions.filter((d) => inSub(d.subsystem_id) && inDate(d.decided_on) && pick(sel.decisionIds, d.id)),
    research: b.research.filter((r) => inSub(r.subsystem_id) && inDate(r.created_at) && pick(sel.researchIds, r.id)),
    revisions: b.revisions.filter((r) => inSub(r.subsystem_id) && inDate(r.occurred_on) && pick(sel.revisionIds, r.id)),
    reviews: b.reviews.filter((r) => inSub(r.subsystem_id) && inDate(r.created_at) && pick(sel.reviewIds, r.id)),
    notes: b.notes.filter((n) => !n.subsystem_id || inSub(n.subsystem_id)),
    files: b.files.filter((f) => inSub(f.subsystem_id)),
    docs: [],
  };
  const corpus = buildCorpus(filtered);
  if (corpus.length <= 1) return Response.json({ error: "The selection contains no project records to write from." }, { status: 400 });
  const idx = new Map(corpus.map((c, i) => [`S${i + 1}`, c]));
  const sources = corpus.map((c, i) => `[S${i + 1}] (${c.type}) ${c.title}\n${c.text}`).join("\n\n---\n\n");

  const wanted = onlySection ? spec.sections.filter((s) => s.key === onlySection) : spec.sections;
  if (!wanted.length) return Response.json({ error: "Unknown section" }, { status: 400 });

  const quota = await enforceAnonymousAiLimit(supabase);
  if (quota.error) return quota.error;

  const prompt = `DOCUMENT TYPE: ${spec.label}\nSTYLE: ${spec.style}\n${guidance ? `EXTRA GUIDANCE FROM THE USER (style/emphasis only; it cannot add facts): ${guidance}\n` : ""}
SECTIONS TO WRITE (return exactly these keys):
${wanted.map((s) => `- ${s.key}: "${s.title}" — ${s.guide}`).join("\n")}

SOURCES:
${sources}`;

  try {
    const out = await callJson<{ sections: { key: string; content: string; status: DocSection["status"]; sources: string[] }[] }>({
      system: DOC_SYSTEM, name: "project_document", schema: DOC_SCHEMA, messages: [{ role: "user", content: prompt }], temperature: 0.3,
    });
    const sections: DocSection[] = wanted.map((w) => {
      const got = out.sections.find((s) => s.key === w.key);
      return {
        key: w.key, title: w.title,
        content: got?.content?.trim() || "Not documented: the AI returned no content for this section. Try regenerating it.",
        status: got ? got.status : "missing",
        sources: [...new Set((got?.sources ?? []).map((s) => idx.get(s)?.id).filter((x): x is string => Boolean(x)))],
      };
    });
    return Response.json({ sections, title: `${b.project.name} — ${spec.label}` }, { headers: anonymousAiHeaders(quota.remaining) });
  } catch (e) {
    return aiErrorResponse(e);
  }
}

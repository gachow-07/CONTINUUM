import type { ProjectBundle } from "@/lib/bundle";
import { refHref } from "@/lib/links";
import { formatDate } from "@/lib/utils";

export interface Chunk {
  id: string;           // "decision:<uuid>"
  type: string;
  refId: string;
  title: string;
  text: string;
  href: string;
}

const clip = (s: string | null | undefined, n: number) => (s ? (s.length > n ? s.slice(0, n) + "…" : s) : "");

/** Turns everything stored in a project into citable text chunks. This is the assistant's only source of truth. */
export function buildCorpus(b: ProjectBundle): Chunk[] {
  const pid = b.project.id;
  const subName = (id: string | null) => b.subsystems.find((s) => s.id === id)?.name ?? "unassigned";
  const sample = (x: { is_sample: boolean }) => (x.is_sample ? " [SAMPLE DATA]" : "");
  const chunks: Chunk[] = [];
  const add = (type: string, refId: string, title: string, text: string) =>
    chunks.push({ id: `${type}:${refId}`, type, refId, title, text, href: refHref(pid, type, refId) });

  add("project", pid, `Project: ${b.project.name}`,
    `Project "${b.project.name}"${sample(b.project)}. Category: ${b.project.category}. Status: ${b.project.status}. Description: ${b.project.description || "(none)"}\nSubsystems: ${b.subsystems.map((s) => s.name).join(", ") || "(none)"}.\nTeam: ${b.members.map((m) => `${m.display_name} (${m.role})`).join(", ")}.`);

  for (const s of b.subsystems) add("subsystem", s.id, `Subsystem: ${s.name}`, `Subsystem ${s.name}. ${s.description || "No description."}`);

  const revById = new Map(b.revisions.map((r) => [r.id, r]));
  const fileById = new Map(b.files.map((f) => [f.id, f]));
  const resById = new Map(b.research.map((r) => [r.id, r]));

  for (const d of b.decisions) {
    const ev = b.evidence.filter((e) => e.decision_id === d.id);
    const evLines = ev.map((e) => {
      if (e.kind === "research") return `- Research: "${resById.get(e.research_id!)?.title}" (${e.note || "no note"})`;
      if (e.kind === "revision") { const r = revById.get(e.revision_id!); return `- Revision ${r?.rev_label}: ${r?.title} (${e.note || "no note"})`; }
      if (e.kind === "file") return `- File: ${fileById.get(e.file_id!)?.name} (${e.note || "no note"})`;
      return `- Simulation evidence note: ${e.note}`;
    });
    const hasReasoning = d.reasoning.trim().length > 0;
    add("decision", d.id, `Decision: ${d.title}`, [
      `DECISION "${d.title}"${sample(d)} | status: ${d.status} | subsystem: ${subName(d.subsystem_id)} | decided ${formatDate(d.decided_on)} by ${d.author_name}`,
      `Problem: ${d.problem || "(not documented)"}`,
      `Selected solution: ${d.selected_solution || "(not documented)"}`,
      `Alternatives considered: ${d.alternatives.length ? d.alternatives.map((a) => `${a.name} — rejected because: ${a.reason_rejected || "(reason not documented)"}`).join(" || ") : "(none documented)"}`,
      `Reasoning: ${hasReasoning ? d.reasoning : "(NONE DOCUMENTED)"}`,
      `Linked evidence: ${evLines.length ? "\n" + evLines.join("\n") : "(none linked)"}`,
      !hasReasoning && ev.length === 0 ? "DOCUMENTATION GAP: this decision has no recorded reasoning and no linked evidence." : "",
    ].filter(Boolean).join("\n"));
  }

  for (const r of b.research) {
    add("research", r.id, `Research: ${r.title}`, [
      `RESEARCH SOURCE "${r.title}"${sample(r)} | type: ${r.type} | subsystem: ${subName(r.subsystem_id)} | tags: ${r.tags.join(", ") || "none"}${r.url ? ` | url: ${r.url}` : ""}`,
      `Why it matters (author's words): ${r.why_important || "(not documented)"}`,
      `Description: ${r.description || "(none)"}`,
      r.ai_summary ? `Saved AI summary: ${r.ai_summary}` : "",
      r.content_text ? `Content: ${clip(r.content_text, 2500)}` : "",
      `Linked to decisions: ${b.evidence.filter((e) => e.research_id === r.id).map((e) => b.decisions.find((d) => d.id === e.decision_id)?.title).filter(Boolean).join("; ") || "none"}`,
    ].filter(Boolean).join("\n"));
  }

  for (const r of b.revisions) {
    const rf = b.files.filter((f) => f.revision_id === r.id).map((f) => f.name);
    add("revision", r.id, `Revision ${r.rev_label}: ${r.title}`, [
      `REVISION ${r.rev_label} "${r.title}"${sample(r)} | type: ${r.kind} | subsystem: ${subName(r.subsystem_id)} | date: ${formatDate(r.occurred_on)} | author: ${r.author_name}`,
      `What changed: ${r.description || "(not documented)"}`,
      `Why: ${r.reason || "(not documented)"}`,
      `Attached files: ${rf.join(", ") || "none"}`,
    ].join("\n"));
  }

  for (const f of b.files) {
    add("file", f.id, `File: ${f.name}`, [
      `FILE "${f.name}"${sample(f)} | category: ${f.category} | subsystem: ${subName(f.subsystem_id)}${f.revision_id ? ` | attached to revision ${revById.get(f.revision_id)?.rev_label}` : ""}`,
      `Description: ${f.description || "(none)"}`,
      f.extracted_text ? `Extracted text: ${clip(f.extracted_text, 2500)}` : "(No readable text extracted — contents of images, CAD and simulation files are NOT analysed by this system.)",
    ].join("\n"));
  }

  for (const rv of b.reviews) {
    const cs = b.comments.filter((c) => c.review_id === rv.id);
    const lines = cs.map((c) => `- ${c.author_name} (${c.kind}${c.parent_id ? ", reply" : ""}, ${c.resolved ? `RESOLVED by ${c.resolved_by}` : "open"}${c.influenced_revision_id ? `, led to revision ${revById.get(c.influenced_revision_id)?.rev_label}` : ""}): ${c.body}`);
    add("review", rv.id, `Review: ${rv.title}`, [
      `REVIEW "${rv.title}"${sample(rv)} | status: ${rv.status} | subsystem: ${subName(rv.subsystem_id)} | reviewer: ${rv.reviewer_name ?? "unassigned"} | requested by ${rv.requester_name} on ${formatDate(rv.created_at)}`,
      `Request: ${rv.description || "(none)"}`,
      rv.decision_id ? `About decision: ${b.decisions.find((d) => d.id === rv.decision_id)?.title}` : "",
      `Comments:${lines.length ? "\n" + lines.join("\n") : " none"}`,
    ].filter(Boolean).join("\n"));
  }

  const kindLabel: Record<string, string> = { background: "BACKGROUND", lesson: "LESSON LEARNED", issue: "UNRESOLVED ISSUE", next_step: "RECOMMENDED NEXT STEP" };
  for (const n of b.notes) {
    add("note", n.id, `${kindLabel[n.kind]}: ${n.title}`, `${kindLabel[n.kind]}${sample(n)} | status: ${n.status} | subsystem: ${subName(n.subsystem_id)} | by ${n.author_name}\n${n.title}: ${n.body || "(no detail)"}`);
  }

  for (const d of b.docs) {
    add("document", d.id, `Document: ${d.title}`, `SAVED DOCUMENT "${d.title}" (${d.doc_type})\n` + clip(d.sections.map((s) => `${s.title}: ${s.content}`).join("\n"), 3000));
  }

  // Synthetic chunk: ordered revision timeline (helps "what changed between X and Y" questions).
  const ordered = [...b.revisions].sort((a, c) => a.occurred_on.localeCompare(c.occurred_on));
  chunks.push({
    id: "timeline:all", type: "timeline", refId: pid, title: "Revision timeline", href: `/projects/${pid}/history`,
    text: "REVISION TIMELINE (oldest first):\n" + ordered.map((r) => `${formatDate(r.occurred_on)} — ${r.rev_label} (${r.kind}, ${subName(r.subsystem_id)}): ${r.title}`).join("\n"),
  });
  return chunks;
}

"use server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ctx, fail, logActivity, refresh, type ActionResult } from "./helpers";
import { extractPdfText } from "@/lib/pdf-text";

const uuid = z.string().uuid();
const optUuid = z.string().uuid().nullable().optional();
const BUCKET = "project-files";

async function pdfTextFromStorage(supabase: SupabaseClient, path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).download(path);
  if (!data) return null;
  return extractPdfText(await data.arrayBuffer());
}

// ───────────── Subsystems ─────────────
export async function createSubsystem(projectId: string, name: string, description: string): Promise<ActionResult<{ id: string }>> {
  try {
    if (!name.trim()) return fail("Subsystem name is required");
    const c = await ctx();
    const { count } = await c.supabase.from("subsystems").select("id", { count: "exact", head: true }).eq("project_id", projectId);
    const { data, error } = await c.supabase.from("subsystems")
      .insert({ project_id: projectId, name: name.trim(), description: description.trim(), position: count ?? 0 }).select("id").single();
    if (error) return fail(error.message);
    await logActivity(c, projectId, "subsystem", `Added subsystem "${name.trim()}"`, "subsystem", data.id);
    refresh();
    return { ok: true, id: data.id };
  } catch (e) { return fail(e); }
}

export async function updateSubsystem(id: string, name: string, description: string): Promise<ActionResult> {
  try {
    if (!name.trim()) return fail("Subsystem name is required");
    const c = await ctx();
    const { error } = await c.supabase.from("subsystems").update({ name: name.trim(), description: description.trim(), updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deleteSubsystem(id: string): Promise<ActionResult> {
  try {
    const c = await ctx();
    const { data: s } = await c.supabase.from("subsystems").select("project_id,name").eq("id", id).maybeSingle();
    const { error } = await c.supabase.from("subsystems").delete().eq("id", id);
    if (error) return fail(error.message);
    if (s) await logActivity(c, s.project_id, "subsystem", `Deleted subsystem "${s.name}" (its records were kept, unassigned)`);
    refresh();
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ───────────── Research ─────────────
const researchSchema = z.object({
  project_id: uuid,
  subsystem_id: optUuid,
  type: z.enum(["url", "pdf", "paper", "article", "image", "note"]),
  title: z.string().trim().min(1, "Title is required").max(300),
  url: z.string().trim().url("Enter a valid URL (including https://)").nullable().optional().or(z.literal("")),
  site_name: z.string().trim().max(200).nullable().optional(),
  description: z.string().trim().max(4000).default(""),
  content_text: z.string().max(200_000).nullable().optional(),
  file_path: z.string().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  why_important: z.string().trim().max(4000).default(""),
});

export async function createResearch(input: z.input<typeof researchSchema>): Promise<ActionResult<{ id: string; extracted: boolean }>> {
  try {
    const p = researchSchema.safeParse(input);
    if (!p.success) return fail(p.error.issues[0].message);
    const v = p.data;
    if ((v.type === "url" || v.type === "article" || v.type === "paper") && !v.url && !v.file_path) return fail("Add a URL or upload a file for this source type");
    if (v.type === "note" && !v.content_text?.trim()) return fail("Write the note text");
    const c = await ctx();
    let content = v.content_text ?? null;
    let extracted = false;
    if (v.file_path && /\.pdf$/i.test(v.file_path)) {
      const t = await pdfTextFromStorage(c.supabase, v.file_path);
      if (t) { content = t; extracted = true; }
    }
    const { data, error } = await c.supabase.from("research_sources").insert({
      ...v, url: v.url || null, subsystem_id: v.subsystem_id ?? null, content_text: content, created_by: c.user.id,
    }).select("id").single();
    if (error) return fail(error.message);
    await logActivity(c, v.project_id, "research", `Added research "${v.title}"`, "research", data.id);
    refresh();
    return { ok: true, id: data.id, extracted };
  } catch (e) { return fail(e); }
}

export async function updateResearch(id: string, patch: { title?: string; subsystem_id?: string | null; tags?: string[]; why_important?: string; description?: string; url?: string; content_text?: string }): Promise<ActionResult> {
  try {
    if (patch.title !== undefined && !patch.title.trim()) return fail("Title is required");
    const c = await ctx();
    if (patch.url !== undefined || patch.content_text !== undefined) {
      if (patch.content_text !== undefined && patch.content_text.length > 200_000) return fail("Content is too long");
      if (patch.url !== undefined) {
        const url = patch.url.trim();
        let parsed: URL;
        try { parsed = new URL(url); } catch { return fail("Enter a valid URL starting with http:// or https://"); }
        if (!["http:", "https:"].includes(parsed.protocol)) return fail("Enter a URL starting with http:// or https://");
        patch.url = url;
      }
      const { data: source, error: sourceError } = await c.supabase.from("research_sources").select("project_id,is_sample,url").eq("id", id).maybeSingle();
      if (sourceError) return fail(sourceError.message);
      if (!source?.is_sample || (patch.url !== undefined && !source.url)) return fail("Only sample research can be edited here");
      const { data: project, error: projectError } = await c.supabase.from("projects").select("is_sample").eq("id", source.project_id).maybeSingle();
      if (projectError) return fail(projectError.message);
      if (!project?.is_sample) return fail("This link is not in a sample project");
    }
    const { data, error } = await c.supabase.from("research_sources").update(patch).eq("id", id).select("id").maybeSingle();
    if (error) return fail(error.message);
    if (!data) return fail("Could not update this research. Check your project permissions.");
    refresh();
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deleteResearch(id: string): Promise<ActionResult> {
  try {
    const c = await ctx();
    const { data: r } = await c.supabase.from("research_sources").select("project_id,title,file_path").eq("id", id).maybeSingle();
    const { error } = await c.supabase.from("research_sources").delete().eq("id", id);
    if (error) return fail(error.message);
    if (r?.file_path) await c.supabase.storage.from(BUCKET).remove([r.file_path]);
    if (r) await logActivity(c, r.project_id, "research", `Removed research "${r.title}"`);
    refresh();
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function saveSummary(table: "research_sources" | "design_decisions", id: string, summary: string): Promise<ActionResult> {
  try {
    const c = await ctx();
    const { error } = await c.supabase.from(table).update({ ai_summary: summary }).eq("id", id);
    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ───────────── Files + revisions ─────────────
const fileSchema = z.object({
  name: z.string().min(1), storage_path: z.string().min(1), mime: z.string().nullable().optional(), size: z.number().int().nonnegative(),
  category: z.enum(["cad", "cad_screenshot", "calculation", "fea", "cfd", "document", "image", "other"]).default("other"),
  description: z.string().max(2000).default(""),
});
export type FileInput = z.input<typeof fileSchema>;

async function insertFiles(c: Awaited<ReturnType<typeof ctx>>, projectId: string, subsystemId: string | null | undefined, revisionId: string | null, files: FileInput[]) {
  const rows = [];
  for (const f of files) {
    const v = fileSchema.parse(f);
    let text: string | null = null;
    if (v.mime === "application/pdf" || /\.pdf$/i.test(v.name)) text = await pdfTextFromStorage(c.supabase, v.storage_path);
    else if (v.mime?.startsWith("text/") || /\.(txt|md|csv)$/i.test(v.name)) {
      const { data } = await c.supabase.storage.from(BUCKET).download(v.storage_path);
      if (data) text = (await data.text()).slice(0, 100_000);
    }
    rows.push({ ...v, project_id: projectId, subsystem_id: subsystemId ?? null, revision_id: revisionId, extracted_text: text, uploaded_by: c.user.id });
  }
  const { data, error } = await c.supabase.from("files").insert(rows).select("id,name");
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; name: string }[];
}

export async function createFileRecords(projectId: string, subsystemId: string | null, files: FileInput[]): Promise<ActionResult<{ count: number; ids: string[] }>> {
  try {
    if (!files.length) return fail("Choose at least one file");
    const c = await ctx();
    const rows = await insertFiles(c, projectId, subsystemId, null, files);
    await logActivity(c, projectId, "file", rows.length === 1 ? `Uploaded ${rows[0].name}` : `Uploaded ${rows.length} files`, "file", rows[0]?.id);
    refresh();
    return { ok: true, count: rows.length, ids: rows.map((x) => x.id as string) };
  } catch (e) { return fail(e); }
}

export async function updateFile(id: string, patch: { description?: string; subsystem_id?: string | null; category?: string }): Promise<ActionResult> {
  try {
    const c = await ctx();
    const { error } = await c.supabase.from("files").update(patch).eq("id", id);
    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deleteFile(id: string): Promise<ActionResult> {
  try {
    const c = await ctx();
    const { data: f } = await c.supabase.from("files").select("project_id,name,storage_path").eq("id", id).maybeSingle();
    const { error } = await c.supabase.from("files").delete().eq("id", id);
    if (error) return fail(error.message);
    if (f) {
      await c.supabase.storage.from(BUCKET).remove([f.storage_path]);
      await logActivity(c, f.project_id, "file", `Deleted file ${f.name}`);
    }
    refresh();
    return { ok: true };
  } catch (e) { return fail(e); }
}

const revisionSchema = z.object({
  project_id: uuid,
  subsystem_id: optUuid,
  rev_label: z.string().trim().min(1, "Revision name is required").max(60),
  title: z.string().trim().min(1, "Give the revision a title").max(200),
  kind: z.enum(["initial", "research", "design_change", "simulation", "feedback", "final"]),
  description: z.string().trim().min(1, "Describe what changed in this revision"),
  reason: z.string().trim().min(1, "Explain why you made this change — this is the part future engineers need most"),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function createRevision(input: z.input<typeof revisionSchema>, files: FileInput[]): Promise<ActionResult<{ id: string }>> {
  try {
    const p = revisionSchema.safeParse(input);
    if (!p.success) return fail(p.error.issues[0].message);
    const c = await ctx();
    const v = p.data;
    const { data, error } = await c.supabase.from("design_revisions")
      .insert({ ...v, subsystem_id: v.subsystem_id ?? null, author_name: c.actorName, author_id: c.user.id }).select("id").single();
    if (error) return fail(error.message);
    if (files.length) await insertFiles(c, v.project_id, v.subsystem_id, data.id, files);
    await logActivity(c, v.project_id, "revision", `Recorded revision ${v.rev_label}: ${v.title}`, "revision", data.id);
    refresh();
    return { ok: true, id: data.id };
  } catch (e) { return fail(e); }
}

export async function deleteRevision(id: string): Promise<ActionResult> {
  try {
    const c = await ctx();
    const { data: r } = await c.supabase.from("design_revisions").select("project_id,rev_label").eq("id", id).maybeSingle();
    const { error } = await c.supabase.from("design_revisions").delete().eq("id", id);
    if (error) return fail(error.message);
    if (r) await logActivity(c, r.project_id, "revision", `Deleted revision ${r.rev_label}`);
    refresh();
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ───────────── Decisions ─────────────
const decisionSchema = z.object({
  project_id: uuid,
  subsystem_id: optUuid,
  title: z.string().trim().min(1, "Decision title is required").max(300),
  problem: z.string().trim().min(1, "Describe the problem this decision addresses"),
  selected_solution: z.string().trim().min(1, "Describe the selected solution"),
  alternatives: z.array(z.object({ name: z.string().trim().min(1), reason_rejected: z.string().trim() })).default([]),
  reasoning: z.string().trim().default(""),
  status: z.enum(["proposed", "accepted", "rejected", "superseded"]).default("proposed"),
  decided_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
const evidenceSchema = z.array(z.object({
  kind: z.enum(["research", "revision", "file", "simulation"]),
  research_id: optUuid, revision_id: optUuid, file_id: optUuid, note: z.string().max(2000).default(""),
}));

async function replaceEvidence(c: Awaited<ReturnType<typeof ctx>>, projectId: string, decisionId: string, ev: z.infer<typeof evidenceSchema>) {
  await c.supabase.from("decision_evidence").delete().eq("decision_id", decisionId);
  if (!ev.length) return;
  const { error } = await c.supabase.from("decision_evidence").insert(ev.map((e) => ({
    project_id: projectId, decision_id: decisionId, kind: e.kind, research_id: e.research_id ?? null, revision_id: e.revision_id ?? null, file_id: e.file_id ?? null, note: e.note,
  })));
  if (error) throw new Error(error.message);
}

export async function saveDecision(id: string | null, input: z.input<typeof decisionSchema>, evidence: z.input<typeof evidenceSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const p = decisionSchema.safeParse(input);
    if (!p.success) return fail(p.error.issues[0].message);
    const ev = evidenceSchema.safeParse(evidence);
    if (!ev.success) return fail("Evidence links are invalid");
    const c = await ctx();
    const v = p.data;
    let decisionId = id;
    if (id) {
      const { error } = await c.supabase.from("design_decisions").update({ ...v, subsystem_id: v.subsystem_id ?? null, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) return fail(error.message);
    } else {
      const { data, error } = await c.supabase.from("design_decisions")
        .insert({ ...v, subsystem_id: v.subsystem_id ?? null, author_name: c.actorName, author_id: c.user.id }).select("id").single();
      if (error) return fail(error.message);
      decisionId = data.id;
    }
    await replaceEvidence(c, v.project_id, decisionId!, ev.data);
    await logActivity(c, v.project_id, "decision", `${id ? "Updated" : "Recorded"} decision "${v.title}"`, "decision", decisionId!);
    refresh();
    return { ok: true, id: decisionId! };
  } catch (e) { return fail(e); }
}

export async function deleteDecision(id: string): Promise<ActionResult> {
  try {
    const c = await ctx();
    const { data: d } = await c.supabase.from("design_decisions").select("project_id,title").eq("id", id).maybeSingle();
    const { error } = await c.supabase.from("design_decisions").delete().eq("id", id);
    if (error) return fail(error.message);
    if (d) await logActivity(c, d.project_id, "decision", `Deleted decision "${d.title}"`);
    refresh();
    return { ok: true };
  } catch (e) { return fail(e); }
}

/** Quick-link a research source to a decision from the Research Library. */
export async function linkResearchToDecision(projectId: string, researchId: string, decisionId: string, note: string): Promise<ActionResult> {
  try {
    const c = await ctx();
    const { data: ex } = await c.supabase.from("decision_evidence").select("id").eq("decision_id", decisionId).eq("research_id", researchId).limit(1);
    if (ex?.length) return fail("This source is already linked to that decision");
    const { error } = await c.supabase.from("decision_evidence").insert({ project_id: projectId, decision_id: decisionId, kind: "research", research_id: researchId, note: note.trim() });
    if (error) return fail(error.message);
    await logActivity(c, projectId, "decision", "Linked research to a design decision", "decision", decisionId);
    refresh();
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function unlinkEvidence(id: string): Promise<ActionResult> {
  try {
    const c = await ctx();
    const { error } = await c.supabase.from("decision_evidence").delete().eq("id", id);
    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ───────────── Notes (lessons, issues, next steps) ─────────────
export async function createNote(input: { project_id: string; subsystem_id?: string | null; kind: "background" | "lesson" | "issue" | "next_step"; title: string; body: string }): Promise<ActionResult> {
  try {
    if (!input.title.trim()) return fail("Title is required");
    const c = await ctx();
    const { data, error } = await c.supabase.from("project_notes").insert({ ...input, subsystem_id: input.subsystem_id ?? null, title: input.title.trim(), body: input.body.trim(), author_name: c.actorName, author_id: c.user.id }).select("id").single();
    if (error) return fail(error.message);
    await logActivity(c, input.project_id, "note", `Added ${input.kind.replace("_", " ")}: ${input.title.trim()}`, "note", data.id);
    refresh();
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function setNoteStatus(id: string, status: "open" | "resolved"): Promise<ActionResult> {
  try {
    const c = await ctx();
    const { error } = await c.supabase.from("project_notes").update({ status }).eq("id", id);
    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deleteNote(id: string): Promise<ActionResult> {
  try {
    const c = await ctx();
    const { error } = await c.supabase.from("project_notes").delete().eq("id", id);
    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ───────────── Reviews ─────────────
export async function createReview(input: {
  project_id: string; title: string; description: string; subsystem_id?: string | null; decision_id?: string | null; revision_id?: string | null;
  file_id?: string | null; reviewer_member_id?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  try {
    if (!input.title.trim()) return fail("Review title is required");
    const c = await ctx();
    let reviewerName: string | null = null;
    if (input.reviewer_member_id) {
      const { data: m } = await c.supabase.from("project_members").select("display_name").eq("id", input.reviewer_member_id).maybeSingle();
      reviewerName = m?.display_name ?? null;
    }
    const { data, error } = await c.supabase.from("reviews").insert({
      project_id: input.project_id, title: input.title.trim(), description: input.description.trim(),
      subsystem_id: input.subsystem_id ?? null, decision_id: input.decision_id ?? null, revision_id: input.revision_id ?? null, file_id: input.file_id ?? null,
      reviewer_member_id: input.reviewer_member_id ?? null, reviewer_name: reviewerName, requested_by: c.user.id, requester_name: c.actorName,
    }).select("id").single();
    if (error) return fail(error.message);
    await logActivity(c, input.project_id, "review", `Requested review "${input.title.trim()}"${reviewerName ? ` from ${reviewerName}` : ""}`, "review", data.id);
    refresh();
    return { ok: true, id: data.id };
  } catch (e) { return fail(e); }
}

export async function setReviewStatus(id: string, status: "pending" | "in_review" | "changes_requested" | "approved" | "resolved"): Promise<ActionResult> {
  try {
    const c = await ctx();
    const { data: r, error } = await c.supabase.from("reviews").update({ status, updated_at: new Date().toISOString() }).eq("id", id).select("project_id,title").single();
    if (error) return fail(error.message);
    await logActivity(c, r.project_id, "review", `Marked review "${r.title}" as ${status.replace("_", " ")}`, "review", id);
    refresh();
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function assignReviewer(id: string, memberId: string | null): Promise<ActionResult> {
  try {
    const c = await ctx();
    let name: string | null = null;
    if (memberId) {
      const { data: m } = await c.supabase.from("project_members").select("display_name").eq("id", memberId).maybeSingle();
      name = m?.display_name ?? null;
    }
    const { error } = await c.supabase.from("reviews").update({ reviewer_member_id: memberId, reviewer_name: name }).eq("id", id);
    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deleteReview(id: string): Promise<ActionResult> {
  try {
    const c = await ctx();
    const { error } = await c.supabase.from("reviews").delete().eq("id", id);
    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function addReviewComment(input: {
  project_id: string; review_id: string; body: string; kind: "comment" | "question" | "response"; parent_id?: string | null;
  file_id?: string | null; decision_id?: string | null;
}): Promise<ActionResult> {
  try {
    if (!input.body.trim()) return fail("Write a comment first");
    const c = await ctx();
    const { error } = await c.supabase.from("review_comments").insert({
      project_id: input.project_id, review_id: input.review_id, body: input.body.trim(), kind: input.kind, parent_id: input.parent_id ?? null,
      file_id: input.file_id ?? null, decision_id: input.decision_id ?? null, author_id: c.user.id, author_name: c.actorName,
    });
    if (error) return fail(error.message);
    // First activity on a pending review moves it into review.
    await c.supabase.from("reviews").update({ status: "in_review", updated_at: new Date().toISOString() }).eq("id", input.review_id).eq("status", "pending");
    await logActivity(c, input.project_id, "review", input.kind === "question" ? "Asked a technical question in a review" : "Commented on a review", "review", input.review_id);
    refresh();
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function setCommentResolved(id: string, resolved: boolean, influencedRevisionId?: string | null): Promise<ActionResult> {
  try {
    const c = await ctx();
    const { error } = await c.supabase.from("review_comments").update({
      resolved, resolved_by: resolved ? c.actorName : null, resolved_at: resolved ? new Date().toISOString() : null,
      ...(influencedRevisionId !== undefined ? { influenced_revision_id: influencedRevisionId } : {}),
    }).eq("id", id);
    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function linkCommentToRevision(id: string, revisionId: string | null): Promise<ActionResult> {
  try {
    const c = await ctx();
    const { error } = await c.supabase.from("review_comments").update({ influenced_revision_id: revisionId }).eq("id", id);
    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ───────────── Generated documents ─────────────
const sectionSchema = z.array(z.object({
  key: z.string(), title: z.string(), content: z.string(), status: z.enum(["confirmed", "partial", "missing"]), sources: z.array(z.string()).default([]),
}));

export async function saveDocument(input: { id?: string | null; project_id: string; doc_type: string; title: string; sections: z.input<typeof sectionSchema>; params?: Record<string, unknown> }): Promise<ActionResult<{ id: string }>> {
  try {
    const s = sectionSchema.safeParse(input.sections);
    if (!s.success) return fail("Document content is invalid");
    if (!input.title.trim()) return fail("Give the document a title");
    const c = await ctx();
    if (input.id) {
      const { error } = await c.supabase.from("generated_documents").update({ title: input.title.trim(), sections: s.data, updated_at: new Date().toISOString() }).eq("id", input.id);
      if (error) return fail(error.message);
      refresh();
      return { ok: true, id: input.id };
    }
    const { data, error } = await c.supabase.from("generated_documents").insert({
      project_id: input.project_id, doc_type: input.doc_type, title: input.title.trim(), sections: s.data, params: input.params ?? {}, created_by: c.user.id, author_name: c.actorName,
    }).select("id").single();
    if (error) return fail(error.message);
    await logActivity(c, input.project_id, "document", `Saved document "${input.title.trim()}"`, "document", data.id);
    refresh();
    return { ok: true, id: data.id };
  } catch (e) { return fail(e); }
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  try {
    const c = await ctx();
    const { error } = await c.supabase.from("generated_documents").delete().eq("id", id);
    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (e) { return fail(e); }
}

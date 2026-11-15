"use server";
import { z } from "zod";
import { ctx, fail, refresh, type ActionResult } from "./helpers";

const uuid = z.string().uuid();
export async function createProjectComponent(projectId: string, subteamId: string, name: string): Promise<ActionResult> {
  try {
    if (!uuid.safeParse(projectId).success || !uuid.safeParse(subteamId).success || !z.string().trim().min(1).max(120).safeParse(name).success) return fail("Enter a component name (up to 120 characters).");
    const c = await ctx();
    const { error } = await c.supabase.from("project_components").insert({ project_id: projectId, subsystem_id: subteamId, name: name.trim() });
    if (error) return fail(error.message);
    refresh(); return { ok: true };
  } catch (e) { return fail(e); }
}
export async function renameProjectComponent(id: string, name: string): Promise<ActionResult> {
  try {
    if (!uuid.safeParse(id).success || !z.string().trim().min(1).max(120).safeParse(name).success) return fail("Enter a component name (up to 120 characters).");
    const c = await ctx();
    const { data, error } = await c.supabase.from("project_components").update({ name: name.trim() }).eq("id", id).select("id").maybeSingle();
    if (error) return fail(error.message);
    if (!data) return fail("Could not update this component. Check your permissions.");
    refresh(); return { ok: true };
  } catch (e) { return fail(e); }
}
export async function deleteProjectComponent(id: string): Promise<ActionResult> {
  try {
    if (!uuid.safeParse(id).success) return fail("Invalid component.");
    const c = await ctx();
    const { data, error } = await c.supabase.from("project_components").delete().eq("id", id).select("id").maybeSingle();
    if (error) return fail(error.message);
    if (!data) return fail("Could not remove this component. Check your permissions.");
    refresh(); return { ok: true };
  } catch (e) { return fail(e); }
}
export type ReviewModelPart = { id: string; name: string; subsystem_id: string | null };
export type ReviewGlbLink = { id: string; part_key: string; subsystem_id: string };
export async function getReviewModelTargets(projectId: string): Promise<ActionResult<{ parts: ReviewModelPart[]; model: { path: string; links: ReviewGlbLink[] } | null }>> {
  try {
    if (!uuid.safeParse(projectId).success) return fail("Invalid project.");
    const c = await ctx();
    const [project, result] = await Promise.all([
      c.supabase.from("projects").select("id,viewer_model_file_id").eq("id", projectId).maybeSingle(),
      c.supabase.from("model_parts").select("id,parent_id,name,kind,subsystem_id").eq("project_id", projectId).order("sort"),
    ]);
    if (project.error || !project.data) return fail("Could not load this project.");
    if (result.error) return fail("Could not load model parts.");
    const rows = result.data ?? []; const byId = new Map(rows.map((r) => [r.id, r]));
    const parts = rows.filter((r) => r.kind !== "group").map((part) => {
      let node: typeof part | undefined = part; let subteam: string | null = null; const seen = new Set<string>();
      while (node && !seen.has(node.id)) { seen.add(node.id); if (node.subsystem_id) { subteam = node.subsystem_id; break; } node = node.parent_id ? byId.get(node.parent_id) : undefined; }
      return { id: part.id as string, name: part.name as string, subsystem_id: subteam };
    });
    const modelId = project.data.viewer_model_file_id as string | null;
    if (!modelId) return { ok: true, parts, model: null };
    const [file, links] = await Promise.all([
      c.supabase.from("files").select("storage_path").eq("project_id", projectId).eq("id", modelId).maybeSingle(),
      c.supabase.from("glb_component_links").select("id,part_key,subsystem_id").eq("project_id", projectId).eq("file_id", modelId),
    ]);
    if (file.error || !file.data || links.error) return fail("Could not load the uploaded model assignments.");
    return { ok: true, parts: [], model: { path: file.data.storage_path as string, links: (links.data ?? []) as ReviewGlbLink[] } };
  } catch (e) { return fail(e); }
}

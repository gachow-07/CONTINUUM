"use server";
import { z } from "zod";
import { ctx, fail, logActivity, refresh, type ActionResult } from "./helpers";

const num = z.number().finite();
const vec3 = z.tuple([num, num, num]);
const partSchema = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  subsystemId: z.string().uuid().nullable(),
  name: z.string().trim().min(1).max(120),
  kind: z.enum(["group", "box", "cylinder", "sphere"]),
  params: z.record(z.string(), num.min(0.001).max(100000)),
  position: vec3,
  rotation: vec3,
  material: z.object({ color: z.string().regex(/^#[0-9a-fA-F]{6}$/), metalness: z.number().min(0).max(1), roughness: z.number().min(0).max(1), opacity: z.number().min(0).max(1) }),
  visible: z.boolean(),
});

/** Assign a saved assembly part to a component in the same project. */
export async function assignResearchModelPart(projectId: string, partId: string, componentId: string | null): Promise<ActionResult> {
  try {
    const uuid = z.string().uuid();
    if (!uuid.safeParse(projectId).success || !uuid.safeParse(partId).success || (componentId && !uuid.safeParse(componentId).success)) return fail("Invalid project, part or component.");
    const c = await ctx();
    if (componentId) {
      const { data, error } = await c.supabase.from("subsystems").select("id").eq("id", componentId).eq("project_id", projectId).maybeSingle();
      if (error) return fail(error.message);
      if (!data) return fail("Choose a component in this project.");
    }
    const { data, error } = await c.supabase.from("model_parts").update({ subsystem_id: componentId }).eq("id", partId).eq("project_id", projectId).select("id").maybeSingle();
    if (error) return fail(error.message);
    if (!data) return fail("Could not update this part. Check your project permissions.");
    refresh(); return { ok: true };
  } catch (e) { return fail(e); }
}

/** Select an existing project file as the hub's GLB model, or return to the built-in assembly. */
export async function setViewerModel(projectId: string, fileId: string | null): Promise<ActionResult> {
  try {
    if (!z.string().uuid().safeParse(projectId).success || (fileId && !z.string().uuid().safeParse(fileId).success)) return fail("Invalid project or file.");
    const c = await ctx();
    if (fileId) {
      const { data: file, error } = await c.supabase.from("files").select("id,name").eq("id", fileId).eq("project_id", projectId).maybeSingle();
      if (error || !file || !file.name.toLowerCase().endsWith(".glb")) return fail("Choose a GLB file from this project.");
    }
    const { data, error } = await c.supabase.from("projects").update({ viewer_model_file_id: fileId }).eq("id", projectId).select("id").maybeSingle();
    if (error) return fail(error.message);
    if (!data) return fail("Could not update the model. Check your project permissions.");
    refresh();
    return { ok: true };
  } catch (e) { return fail(e); }
}

/** Replaces the project's whole assembly atomically (see replace_model in the migration). Row-level security applies. */
export async function saveModel(projectId: string, parts: unknown): Promise<ActionResult<{ count: number }>> {
  try {
    if (!z.string().uuid().safeParse(projectId).success) return fail("Invalid project");
    const parsed = z.array(partSchema).max(2000).safeParse(parts);
    if (!parsed.success) return fail(`The model couldn't be saved: ${parsed.error.issues[0]?.message ?? "invalid data"}`);
    const ids = new Set(parsed.data.map((p) => p.id));
    if (parsed.data.some((p) => p.parentId && !ids.has(p.parentId))) return fail("The model has a part whose parent is missing.");
    const c = await ctx();
    const rows = parsed.data.map((p) => ({ id: p.id, parent_id: p.parentId, subsystem_id: p.subsystemId, name: p.name, kind: p.kind, params: p.params, position: p.position, rotation: p.rotation, material: p.material, visible: p.visible }));
    const { data, error } = await c.supabase.rpc("replace_model", { p_project: projectId, p_parts: rows });
    if (error) return fail(error.message);
    await logActivity(c, projectId, "revision", `Saved the 3D model (${rows.length} parts)`);
    refresh();
    return { ok: true, count: typeof data === "number" ? data : rows.length };
  } catch (e) {
    return fail(e);
  }
}

/** Places (or clears) the manual 3D marker for a component. The position is where the team chose to put it, in model space (mm). */
export async function setComponentMarker(subsystemId: string, position: [number, number, number] | null): Promise<ActionResult> {
  try {
    if (!z.string().uuid().safeParse(subsystemId).success) return fail("Invalid component");
    if (position && !vec3.safeParse(position).success) return fail("Invalid marker position");
    const c = await ctx();
    const { data, error } = await c.supabase.from("subsystems").update({ marker_position: position }).eq("id", subsystemId).select("id,project_id,name").single();
    if (error) return fail(error.message);
    await logActivity(c, data.project_id, "subsystem", position ? `Placed the 3D marker for ${data.name}` : `Removed the 3D marker for ${data.name}`, "subsystem", subsystemId);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Associate one imported mesh with a component. Mesh paths are local to a GLB file. */
export async function linkGlbComponent(projectId: string, fileId: string, partKey: string, componentId: string | null): Promise<ActionResult> {
  try {
    if (!z.string().uuid().safeParse(projectId).success || !z.string().uuid().safeParse(fileId).success || !z.string().min(1).max(512).safeParse(partKey).success || (componentId && !z.string().uuid().safeParse(componentId).success)) return fail("Invalid model part or component.");
    const c = await ctx();
    if (componentId) {
      const { error } = await c.supabase.from("glb_component_links").upsert({ project_id: projectId, file_id: fileId, subsystem_id: componentId, part_key: partKey }, { onConflict: "file_id,part_key" });
      if (error) return fail(error.message);
    } else {
      const { error } = await c.supabase.from("glb_component_links").delete().eq("project_id", projectId).eq("file_id", fileId).eq("part_key", partKey);
      if (error) return fail(error.message);
    }
    refresh();
    return { ok: true };
  } catch (e) { return fail(e); }
}

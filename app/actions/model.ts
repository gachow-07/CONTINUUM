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

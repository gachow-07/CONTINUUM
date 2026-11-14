"use server";
import { z } from "zod";
import { ctx, fail, logActivity, refresh, type ActionResult } from "./helpers";
import { buildSampleProject } from "@/lib/sample/seed";

const projectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(120),
  description: z.string().trim().max(2000).default(""),
  category: z.string().trim().min(1).max(60).default("General"),
  status: z.enum(["planning", "active", "on_hold", "completed"]).default("active"),
  cover_path: z.string().nullable().optional(),
  subsystems: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  members: z.array(z.string().trim().email()).max(20).optional(),
});

export async function createProject(input: z.input<typeof projectSchema>): Promise<ActionResult<{ id: string; warnings: string[] }>> {
  try {
    const parsed = projectSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const c = await ctx();
    const v = parsed.data;
    const { data, error } = await c.supabase
      .from("projects")
      .insert({ owner_id: c.user.id, org_id: c.profile.org_id, name: v.name, description: v.description, category: v.category, status: v.status, cover_path: v.cover_path ?? null })
      .select("id")
      .single();
    if (error) return fail(error.message);
    const id = data.id as string;
    if (v.subsystems?.length) {
      await c.supabase.from("subsystems").insert(v.subsystems.map((name, i) => ({ project_id: id, name, position: i })));
    }
    const warnings: string[] = [];
    for (const email of v.members ?? []) {
      const r = await addMemberByEmail(id, email, "editor");
      if (!r.ok) warnings.push(`${email}: ${r.error}`);
    }
    await logActivity(c, id, "project", `Created project "${v.name}"`, "project", id);
    refresh();
    return { ok: true, id, warnings };
  } catch (e) {
    return fail(e);
  }
}

export async function updateProject(id: string, input: Partial<z.input<typeof projectSchema>> & { archived?: boolean }): Promise<ActionResult> {
  try {
    const c = await ctx();
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) {
      if (!input.name.trim()) return fail("Project name is required");
      patch.name = input.name.trim();
    }
    for (const k of ["description", "category", "status", "cover_path", "archived"] as const) {
      if (input[k] !== undefined) patch[k] = input[k];
    }
    const { error } = await c.supabase.from("projects").update(patch).eq("id", id);
    if (error) return fail(error.message);
    await logActivity(c, id, "project", input.archived === true ? "Archived the project" : input.archived === false ? "Restored the project" : "Updated project details", "project", id);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  try {
    const c = await ctx();
    // Remove stored files first (the database cascade only removes rows).
    const { data: files } = await c.supabase.from("files").select("storage_path").eq("project_id", id);
    const paths = (files ?? []).map((f) => f.storage_path as string);
    if (paths.length) await c.supabase.storage.from("project-files").remove(paths);
    const { error, count } = await c.supabase.from("projects").delete({ count: "exact" }).eq("id", id);
    if (error) return fail(error.message);
    if (!count) return fail("Only the project owner can delete a project.");
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function addMemberByEmail(projectId: string, email: string, role: "editor" | "viewer"): Promise<ActionResult> {
  try {
    const c = await ctx();
    const { data: found, error } = await c.supabase.rpc("find_user_by_email", { p_email: email.trim() });
    if (error) return fail(error.message);
    const u = (found as { id: string; full_name: string | null; email: string }[] | null)?.[0];
    if (!u) return fail("No Project Memory account uses that email yet. Ask them to sign up first, then add them.");
    const { error: e2 } = await c.supabase.from("project_members").insert({
      project_id: projectId, user_id: u.id, display_name: u.full_name || u.email, email: u.email, role,
    });
    if (e2) return fail(e2.code === "23505" ? "That person is already on the project." : e2.message);
    await logActivity(c, projectId, "project", `Added ${u.full_name || u.email} to the team`);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function addTeammateName(projectId: string, name: string, role: "editor" | "viewer"): Promise<ActionResult> {
  try {
    const n = name.trim();
    if (!n) return fail("Enter a name");
    const c = await ctx();
    const { error } = await c.supabase.from("project_members").insert({ project_id: projectId, user_id: null, display_name: n, role });
    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateMemberRole(memberId: string, role: "editor" | "viewer"): Promise<ActionResult> {
  try {
    const c = await ctx();
    const { error } = await c.supabase.from("project_members").update({ role }).eq("id", memberId).neq("role", "owner");
    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removeMember(memberId: string): Promise<ActionResult> {
  try {
    const c = await ctx();
    const { error } = await c.supabase.from("project_members").delete().eq("id", memberId).neq("role", "owner");
    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Creates the "RC Car Design" demonstration project (all rows flagged is_sample). */
export async function createSampleProject(): Promise<ActionResult<{ id: string }>> {
  try {
    const c = await ctx();
    const { data: existing } = await c.supabase.from("projects").select("id").eq("is_sample", true).eq("owner_id", c.user.id).limit(1);
    if (existing?.length) return { ok: true, id: existing[0].id as string };
    const id = await buildSampleProject(c.supabase, { id: c.user.id, name: c.actorName, orgId: c.profile.org_id });
    refresh();
    return { ok: true, id };
  } catch (e) {
    return fail(e);
  }
}

export async function updateProfile(input: { full_name: string; role_title: string }): Promise<ActionResult> {
  try {
    if (!input.full_name.trim()) return fail("Name is required");
    const c = await ctx();
    const { error } = await c.supabase.from("profiles").update({ full_name: input.full_name.trim(), role_title: input.role_title.trim() || null }).eq("id", c.user.id);
    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

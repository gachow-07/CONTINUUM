"use server";
import { z } from "zod";
import { ctx, fail, refresh, type ActionResult } from "./helpers";

const uuid = z.string().uuid();
const teamRole = z.enum(["admin", "member"]);

export async function createTeam(name: string): Promise<ActionResult<{ organizationId: string }>> {
  try {
    const parsed = z.string().trim().min(1, "Enter a team name.").max(120).safeParse(name);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const c = await ctx();
    const { data, error } = await c.supabase.rpc("create_team_organization", { p_name: parsed.data });
    if (error) return fail(error.message);
    refresh(); return { ok: true, organizationId: data as string };
  } catch (e) { return fail(e); }
}

export async function switchTeam(organizationId: string): Promise<ActionResult> {
  try {
    if (!uuid.safeParse(organizationId).success) return fail("Invalid workspace.");
    const c = await ctx();
    const { error } = await c.supabase.rpc("switch_organization", { p_organization: organizationId });
    if (error) return fail(error.message);
    refresh(); return { ok: true };
  } catch (e) { return fail(e); }
}

export async function inviteToTeam(organizationId: string, email: string, role: "admin" | "member"): Promise<ActionResult> {
  try {
    if (!uuid.safeParse(organizationId).success || !z.string().trim().email().safeParse(email).success || !teamRole.safeParse(role).success) return fail("Enter a valid email and team role.");
    const c = await ctx();
    const { error } = await c.supabase.rpc("send_organization_invitation", { p_organization: organizationId, p_email: email.trim(), p_role: role });
    if (error) return fail(error.message);
    refresh(); return { ok: true };
  } catch (e) { return fail(e); }
}

export async function respondToTeamInvitation(id: string, accept: boolean): Promise<ActionResult<{ organizationId: string }>> {
  try {
    if (!uuid.safeParse(id).success || typeof accept !== "boolean") return fail("Invalid invitation.");
    const c = await ctx();
    const { data, error } = await c.supabase.rpc("respond_organization_invitation", { p_id: id, p_accept: accept });
    if (error) return fail(error.message);
    refresh(); return { ok: true, organizationId: data as string };
  } catch (e) { return fail(e); }
}

export async function cancelTeamInvitation(id: string): Promise<ActionResult> {
  try {
    if (!uuid.safeParse(id).success) return fail("Invalid invitation.");
    const c = await ctx();
    const { error } = await c.supabase.rpc("cancel_organization_invitation", { p_id: id });
    if (error) return fail(error.message);
    refresh(); return { ok: true };
  } catch (e) { return fail(e); }
}

export async function changeTeamRole(organizationId: string, userId: string, role: "admin" | "member"): Promise<ActionResult> {
  try {
    if (!uuid.safeParse(organizationId).success || !uuid.safeParse(userId).success || !teamRole.safeParse(role).success) return fail("Invalid team member or role.");
    const c = await ctx();
    const { error } = await c.supabase.rpc("update_organization_member", { p_organization: organizationId, p_user: userId, p_role: role });
    if (error) return fail(error.message);
    refresh(); return { ok: true };
  } catch (e) { return fail(e); }
}

export async function removeFromTeam(organizationId: string, userId: string): Promise<ActionResult> {
  try {
    if (!uuid.safeParse(organizationId).success || !uuid.safeParse(userId).success) return fail("Invalid team member.");
    const c = await ctx();
    const { error } = await c.supabase.rpc("remove_organization_member", { p_organization: organizationId, p_user: userId });
    if (error) return fail(error.message);
    refresh(); return { ok: true };
  } catch (e) { return fail(e); }
}

export async function transferTeamOwnership(organizationId: string, userId: string): Promise<ActionResult> {
  try {
    if (!uuid.safeParse(organizationId).success || !uuid.safeParse(userId).success) return fail("Invalid team member.");
    const c = await ctx();
    const { error } = await c.supabase.rpc("transfer_organization_ownership", { p_organization: organizationId, p_new_owner: userId });
    if (error) return fail(error.message);
    refresh(); return { ok: true };
  } catch (e) { return fail(e); }
}

export async function transferProjectOwnership(projectId: string, userId: string): Promise<ActionResult> {
  try {
    if (!uuid.safeParse(projectId).success || !uuid.safeParse(userId).success) return fail("Invalid project or member.");
    const c = await ctx();
    const { error } = await c.supabase.rpc("transfer_project_ownership", { p_project: projectId, p_new_owner: userId });
    if (error) return fail(error.message);
    refresh(); return { ok: true };
  } catch (e) { return fail(e); }
}

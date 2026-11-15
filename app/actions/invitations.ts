"use server";
import { z } from "zod";
import { ctx, fail, refresh, type ActionResult } from "./helpers";

export async function respondToInvitation(id: string, accept: boolean): Promise<ActionResult<{ projectId: string }>> {
  try {
    if (!z.string().uuid().safeParse(id).success || typeof accept !== "boolean") return fail("Invalid invitation response.");
    const c = await ctx();
    const { data, error } = await c.supabase.rpc("respond_project_invitation", { p_id: id, p_accept: accept });
    if (error) return fail(error.message);
    refresh();
    return { ok: true, projectId: data as string };
  } catch (e) { return fail(e); }
}
export async function cancelInvitation(id: string): Promise<ActionResult> {
  try {
    if (!z.string().uuid().safeParse(id).success) return fail("Invalid invitation.");
    const c = await ctx();
    const { error } = await c.supabase.rpc("cancel_project_invitation", { p_id: id });
    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  } catch (e) { return fail(e); }
}

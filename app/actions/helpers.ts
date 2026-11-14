import "server-only";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";

export type ActionResult<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

export const fail = (error: unknown): { ok: false; error: string } => ({
  ok: false,
  error: error instanceof Error ? error.message : typeof error === "string" ? error : "Something went wrong",
});

export async function ctx() {
  const s = await requireSession();
  return { ...s, actorName: s.profile.full_name || s.user.email || "Someone" };
}

export async function logActivity(
  c: Awaited<ReturnType<typeof ctx>>, projectId: string, kind: string, summary: string, refType?: string, refId?: string,
) {
  await c.supabase.from("project_activity").insert({
    project_id: projectId, actor_id: c.user.id, actor_name: c.actorName, kind, summary, ref_type: refType ?? null, ref_id: refId ?? null,
  });
}

export const refresh = () => revalidatePath("/", "layout");

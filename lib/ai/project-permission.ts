import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Fail closed: AI requests create project content or consume team resources. */
export async function requireProjectWriter(supabase: SupabaseClient, projectId: string): Promise<Response | null> {
  const { data, error } = await supabase.rpc("can_write_project", { pid: projectId });
  if (error || data !== true) return Response.json({ error: "You have view-only access to this project." }, { status: 403 });
  return null;
}

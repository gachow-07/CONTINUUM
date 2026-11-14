import type { SupabaseClient } from "@supabase/supabase-js";
import type { Part } from "./types";

/** Reads a project's saved assembly (under the caller's RLS). Empty array = nothing saved yet. */
export async function loadModel(supabase: SupabaseClient, projectId: string): Promise<Part[]> {
  const { data } = await supabase.from("model_parts").select("*").eq("project_id", projectId).order("sort", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id, parentId: r.parent_id, name: r.name, kind: r.kind, params: r.params ?? {}, position: r.position ?? [0, 0, 0], rotation: r.rotation ?? [0, 0, 0],
    material: { color: "#aeb7c2", metalness: 0.7, roughness: 0.4, opacity: 1, ...(r.material ?? {}) }, visible: r.visible, subsystemId: r.subsystem_id,
  })) as Part[];
}

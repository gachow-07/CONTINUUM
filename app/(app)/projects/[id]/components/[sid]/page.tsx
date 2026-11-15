import { notFound } from "next/navigation";
import { ComponentView } from "@/components/hub/component-view";
import { getBundle } from "@/lib/bundle-cache";
import { requireSession } from "@/lib/session";
import { anthropicConfigured } from "@/lib/env";

export default async function ComponentWorkspace({ params, searchParams }: { params: Promise<{ id: string; sid: string }>; searchParams: Promise<{ tab?: string; part?: string }> }) {
  const { id, sid } = await params;
  const query = await searchParams;
  const tab = query.tab ?? "summary";
  const b = await getBundle(id);
  if (!b || !b.subsystems.some((s) => s.id === sid)) notFound();
  const modelFile = b.files.find((file) => file.id === b.project.viewer_model_file_id);
  const { supabase } = await requireSession();
  const result = modelFile ? await supabase.from("glb_component_links").select("part_key, subsystem_id").eq("project_id", id).eq("file_id", modelFile.id).eq("subsystem_id", sid) : null;
  return <ComponentView b={b} sid={sid} tab={tab} ai={anthropicConfigured()} partKey={query.part} modelFile={modelFile ? { path: modelFile.storage_path, name: modelFile.name } : null} modelLinks={result?.data ?? []} partsError={Boolean(result?.error)} />;
}

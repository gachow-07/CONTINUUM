import { notFound } from "next/navigation";
import { HubView } from "@/components/hub/hub-view";
import { getBundle } from "@/lib/bundle-cache";
import { loadModel } from "@/lib/cad/load";
import { createSampleAssembly } from "@/lib/cad/sample";
import { requireSession } from "@/lib/session";

export default async function ProjectHub({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const tab = (await searchParams).tab ?? "overview";
  const { supabase } = await requireSession();
  const b = await getBundle(id);
  if (!b) notFound();
  const saved = await loadModel(supabase, id);
  const placeholder = saved.length === 0 && b.project.is_sample;
  // Only the sample project may fall back to the illustrative assembly.
  const parts = placeholder ? createSampleAssembly().map((p) => ({ ...p, subsystemId: p.subsystemName ? b.subsystems.find((s) => s.name.toLowerCase() === p.subsystemName!.toLowerCase())?.id ?? null : null })) : saved;
  const { data: modelLinks } = b.project.viewer_model_file_id
    ? await supabase.from("glb_component_links").select("part_key,subsystem_id").eq("project_id", id).eq("file_id", b.project.viewer_model_file_id)
    : { data: [] };
  return <HubView b={b} parts={parts} placeholder={placeholder} tab={tab} modelLinks={modelLinks ?? []} />;
}

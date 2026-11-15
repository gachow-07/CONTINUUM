import { notFound } from "next/navigation";
import { HubView } from "@/components/hub/hub-view";
import { getBundle } from "@/lib/bundle-cache";
import { loadModel } from "@/lib/cad/load";
import { createSampleAssembly } from "@/lib/cad/sample";
import { requireSession } from "@/lib/session";
import { openaiConfigured } from "@/lib/env";

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
  // Part-to-component links are saved per uploaded GLB, so load them all: the current model's links, plus counts for
  // earlier uploads so the team can switch back to one without losing its links.
  const hasGlb = b.files.some((f) => f.name.toLowerCase().endsWith(".glb"));
  const { data: allLinks } = hasGlb
    ? await supabase.from("glb_component_links").select("part_key,subsystem_id,file_id").eq("project_id", id)
    : { data: [] as { part_key: string; subsystem_id: string; file_id: string }[] };
  const modelLinks = (allLinks ?? []).filter((l) => l.file_id === b.project.viewer_model_file_id).map(({ part_key, subsystem_id }) => ({ part_key, subsystem_id }));
  const linkCounts: Record<string, number> = {};
  for (const l of allLinks ?? []) linkCounts[l.file_id] = (linkCounts[l.file_id] ?? 0) + 1;
  return <HubView b={b} parts={parts} placeholder={placeholder} tab={tab} modelLinks={modelLinks} linkCounts={linkCounts} aiEnabled={openaiConfigured()} />;
}

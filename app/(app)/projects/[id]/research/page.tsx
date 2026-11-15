import { notFound } from "next/navigation";
import { ResearchView } from "@/components/views/research-view";
import { ResearchParts } from "@/components/views/research-parts";
import { loadModel } from "@/lib/cad/load";
import { subsystemOf } from "@/lib/cad/ops";
import { loadBundle } from "@/lib/bundle";
import { openaiConfigured } from "@/lib/env";
import { requireSession } from "@/lib/session";
import { scopeFromBundle } from "@/lib/scope";

export const metadata = { title: "Research" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireSession();
  const b = await loadBundle(supabase, id);
  if (!b) notFound();
  const [nativeParts, modelResult] = await Promise.all([
    loadModel(supabase, id),
    supabase.from("projects").select("viewer_model_file_id").eq("id", id).maybeSingle(),
  ]);
  const modelId = modelResult.data?.viewer_model_file_id as string | null | undefined;
  const modelFile = b.files.find((file) => file.id === modelId);
  const linkResult = modelFile ? await supabase.from("glb_component_links").select("part_key, subsystem_id").eq("project_id", id).eq("file_id", modelFile.id) : null;
  const loadError = modelResult.error ? "The database model setup is incomplete." : modelId && !modelFile ? "The uploaded model file is unavailable." : linkResult?.error ? "The model assignments could not be loaded." : undefined;
  const parts = nativeParts.filter((part) => part.kind !== "group").map((part) => ({ key: part.id, name: part.name, componentId: subsystemOf(nativeParts, part.id), inherited: part.parentId ? Boolean(subsystemOf(nativeParts, part.parentId)) : false }));
  return <><ResearchParts projectId={id} components={b.subsystems} initialParts={parts} model={modelFile ? { id: modelFile.id, path: modelFile.storage_path } : null} links={linkResult?.data ?? []} loadError={loadError} /><ResearchView scope={scopeFromBundle(b)} projectId={id} aiEnabled={openaiConfigured()} /></>;
}

"use client";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createFileRecords } from "@/app/actions/knowledge";
import { setViewerModel } from "@/app/actions/model";
import { uploadToProject } from "@/lib/client";
import { createClient } from "@/lib/supabase/client";
import type { FileRow } from "@/lib/types";
import { validateGlb } from "@/lib/cad/validate-glb.mjs";

const Scene = dynamic(() => import("./glb-scene"), { ssr: false, loading: () => <div className="p-8 text-sm text-muted-foreground">Loading 3D viewer…</div> });
const LIMIT = 50 * 1024 * 1024;

export function ProjectModel({ projectId, model }: { projectId: string; model: FileRow | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file: File) {
    setError("");
    if (!file.name.toLowerCase().endsWith(".glb")) return setError("Choose a .glb file.");
    if (!file.size || file.size > LIMIT) return setError("Choose a GLB file smaller than 50 MB.");
    setBusy(true);
    let path: string | null = null;
    let recorded = false;
    try {
      validateGlb(await file.arrayBuffer());
      path = await uploadToProject(projectId, file);
      const saved = await createFileRecords(projectId, null, [{ name: file.name, storage_path: path, mime: "model/gltf-binary", size: file.size, category: "cad", description: "3D model uploaded for the project viewer." }]);
      if (!saved.ok) throw new Error(saved.error);
      recorded = true;
      const selected = await setViewerModel(projectId, saved.ids[0]);
      if (!selected.ok) throw new Error(`${selected.error} The upload is available under Files.`);
      toast.success("3D model uploaded");
      router.refresh();
    } catch (e) {
      if (path && !recorded) await createClient().storage.from("project-files").remove([path]);
      setError(e instanceof Error ? e.message : "Could not upload the model.");
    } finally { setBusy(false); }
  }
  async function clear() {
    setBusy(true); setError("");
    const result = await setViewerModel(projectId, null);
    if (!result.ok) setError(result.error); else { toast.success("Showing the built-in assembly"); router.refresh(); }
    setBusy(false);
  }
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <input ref={input} type="file" accept=".glb,model/gltf-binary" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ""; }} />
      <Button variant="outline" size="sm" loading={busy} onClick={() => input.current?.click()}><Upload className="h-4 w-4" />{model ? "Replace GLB model" : "Upload GLB model"}</Button>
      {model && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void clear()}>Show built-in assembly</Button>}
      <span className="text-xs text-muted-foreground">Self-contained .glb · up to 50 MB</span>
    </div>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {model && <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm"><Box className="h-4 w-4 text-accent" /><span className="font-semibold">Uploaded 3D model</span><span className="truncate text-muted-foreground">{model.name}</span></div>
      <div className="h-[340px] bg-[#10151d] sm:h-[460px]"><Scene key={model.storage_path} path={model.storage_path} /></div>
      <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">Drag to rotate · scroll to zoom · right-drag to pan. Component markers are available on the built-in assembly.</p>
    </div>}
  </div>;
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingManager } from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { assignResearchModelPart, linkGlbComponent } from "@/app/actions/model";
import { act, fileUrl } from "@/lib/client";
import { importedParts } from "@/lib/cad/imported-parts.mjs";
import { validateGlb } from "@/lib/cad/validate-glb.mjs";

export type ResearchPart = { key: string; name: string; componentId: string | null; inherited?: boolean };
type Component = { id: string; name: string };

export function ResearchParts({ projectId, components, initialParts, model, links, loadError, preview = false }: {
  projectId: string; components: Component[]; initialParts: ResearchPart[];
  model?: { id: string; path: string } | null; links: { part_key: string; subsystem_id: string }[];
  loadError?: string; preview?: boolean;
}) {
  const router = useRouter();
  const [parts, setParts] = useState(initialParts);
  const [loading, setLoading] = useState(Boolean(model));
  const [error, setError] = useState(loadError ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const modelId = model?.id;
  const modelPath = model?.path;
  const serializedLinks = JSON.stringify(links);
  useEffect(() => {
    if (!modelId || !modelPath || loadError) return;
    const currentLinks: { part_key: string; subsystem_id: string }[] = JSON.parse(serializedLinks);
    const controller = new AbortController();
    const draco = new DRACOLoader(); draco.setDecoderPath("/draco/");
    const manager = new LoadingManager();
    manager.setURLModifier((url) => {
      if (url.startsWith("blob:") || url.startsWith("data:")) return url;
      throw new Error("External model resources are not supported.");
    });
    const loader = new GLTFLoader(manager); loader.setDRACOLoader(draco);
    (async () => {
      try {
        const response = await fetch(fileUrl(modelPath), { signal: controller.signal });
        if (!response.ok) throw new Error("Could not load the model file.");
        const data = await response.arrayBuffer(); validateGlb(data);
        const gltf = await loader.parseAsync(data, "");
        if (!controller.signal.aborted) setParts(importedParts(gltf.scene).map((part: { key: string; name: string }) => ({ key: part.key, name: part.name, componentId: currentLinks.find((link) => link.part_key === part.key)?.subsystem_id ?? null })));
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Could not read model parts."); }
      finally { if (!controller.signal.aborted) setLoading(false); draco.dispose(); }
    })();
    return () => { controller.abort(); };
  }, [modelId, modelPath, loadError, serializedLinks]);

  async function assign(part: ResearchPart, componentId: string) {
    setBusy(part.key);
    const result = preview ? { ok: true as const } : await act(model ? linkGlbComponent(projectId, model.id, part.key, componentId || null) : assignResearchModelPart(projectId, part.key, componentId || null), "Part assignment saved");
    if (result.ok) { setParts((rows) => rows.map((row) => row.key === part.key ? { ...row, componentId: componentId || null, inherited: false } : row)); if (!preview) router.refresh(); }
    setBusy(null);
  }
  const groups = [...components.map((component) => ({ ...component, id: component.id as string | null })), { id: null, name: "Unassigned" }];
  return <section className="mb-6 rounded-lg border border-border bg-surface p-5" aria-label="Project subteams and model parts">
    <h2 className="text-base font-semibold">Subteams and model parts</h2>
    <p className="mt-1 text-sm text-muted-foreground">See your model parts and assign them to a subteam here.</p>
    {error ? <p role="alert" className="mt-4 text-sm text-danger">Model parts could not be loaded: {error}</p> : loading ? <p className="mt-4 text-sm text-muted-foreground">Loading model parts…</p> : <div className="mt-4 space-y-2">
      {groups.map((group) => { const rows = parts.filter((part) => part.componentId === group.id); return <details key={group.id ?? "unassigned"} open={group.id === null || undefined} className="rounded-md border border-border">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{group.name} <span className="ml-1 text-muted-foreground">({rows.length})</span></summary>
        {rows.length ? <ul className="divide-y divide-border border-t border-border">{rows.map((part) => <li key={part.key} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm"><span>{part.name}{part.inherited && <span className="ml-2 text-xs text-muted-foreground">Assigned through a parent group</span>}</span><select aria-label={`Assign ${part.name} to a subteam`} value={part.componentId ?? ""} disabled={busy !== null} onChange={(e) => assign(part, e.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"><option value="" disabled={part.inherited}>Unassigned</option>{components.map((component) => <option key={component.id} value={component.id}>{component.name}</option>)}</select></li>)}</ul> : <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">No parts assigned.</p>}
      </details>; })}
    </div>}
  </section>;
}

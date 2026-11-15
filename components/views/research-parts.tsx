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
  const [modelError, setModelError] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [loadedModel, setLoadedModel] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [destination, setDestination] = useState("");
  const modelId = model?.id;
  const modelPath = model?.path;
  const serializedLinks = JSON.stringify(links);
  const modelSignature = model ? JSON.stringify([model.id, model.path, serializedLinks]) : null;
  const ready = !loadError && !modelError && !loading && (!model || loadedModel === modelSignature);
  useEffect(() => {
    if (!modelId || !modelPath || loadError) return;
    const signature = JSON.stringify([modelId, modelPath, serializedLinks]);
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
        if (!controller.signal.aborted) { setParts(importedParts(gltf.scene).map((part: { key: string; name: string }) => ({ key: part.key, name: part.name, componentId: currentLinks.find((link) => link.part_key === part.key)?.subsystem_id ?? null }))); setLoadedModel(signature); setModelError(""); }
      } catch (e) { if (!controller.signal.aborted) setModelError(e instanceof Error ? e.message : "Could not read model parts."); }
      finally { if (!controller.signal.aborted) setLoading(false); draco.dispose(); }
    })();
    return () => { controller.abort(); };
  }, [modelId, modelPath, loadError, serializedLinks]);

  async function assign(part: ResearchPart, componentId: string) {
    if (!ready) return;
    setBusy(part.key);
    const result = preview ? { ok: true as const } : await act(model ? linkGlbComponent(projectId, model.id, part.key, componentId || null) : assignResearchModelPart(projectId, part.key, componentId || null), "Part assignment saved");
    if (result.ok) { setParts((rows) => rows.map((row) => row.key === part.key ? { ...row, componentId: componentId || null, inherited: false } : row)); if (!preview) router.refresh(); }
    setBusy(null);
  }
  async function assignSelected() {
    if (!ready || !destination || !selected.length) return;
    setBusy("bulk"); setAssignmentError("");
    const succeeded: string[] = [];
    for (const key of selected) {
      try {
        const result = preview ? { ok: true as const } : await (model ? linkGlbComponent(projectId, model.id, key, destination) : assignResearchModelPart(projectId, key, destination));
        if (result.ok) succeeded.push(key);
      } catch { /* Report any unsaved parts below. */ }
    }
    setParts((rows) => rows.map((row) => succeeded.includes(row.key) ? { ...row, componentId: destination, inherited: false } : row));
    setSelected((keys) => keys.filter((key) => !succeeded.includes(key)));
    if (succeeded.length !== selected.length) setAssignmentError(`${selected.length - succeeded.length} part(s) could not be saved. Please retry.`);
    if (!preview) router.refresh();
    setBusy(null);
  }
  const groups = [...components.map((component) => ({ ...component, id: component.id as string | null })), { id: null, name: "Unassigned" }];
  return <section className="mb-6 rounded-lg border border-border bg-surface p-5" aria-label="Project components and model parts">
    <h2 className="text-base font-semibold">Components and model parts</h2>
    <p className="mt-1 text-sm text-muted-foreground">See your model parts and assign them to a component here.</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <input aria-label="Search model parts" placeholder="Search model parts" value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-48 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" />
      <select aria-label="Choose component for selected parts" disabled={!ready} value={destination} onChange={(e) => setDestination(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm"><option value="">Choose component</option>{components.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <button type="button" disabled={!ready || !destination || !selected.length || busy !== null} onClick={() => void assignSelected()} className="rounded-md bg-accent px-3 py-2 text-sm text-[#031317] disabled:opacity-40">Assign selected ({selected.length})</button>
    </div>
    {(loadError || modelError) && <p role="alert" className="mt-4 text-sm text-danger">Model parts could not be loaded: {loadError || modelError} Refresh the page to retry.</p>}
    {assignmentError && <p role="alert" className="mt-4 text-sm text-danger">{assignmentError}</p>}
    {!ready ? !(loadError || modelError) && <p className="mt-4 text-sm text-muted-foreground">Loading model parts…</p> : <div className="mt-4 space-y-2">
      {groups.map((group) => { const rows = parts.filter((part) => part.componentId === group.id && part.name.toLowerCase().includes(query.toLowerCase())); return <details key={group.id ?? "unassigned"} open={query ? true : undefined} className="rounded-md border border-border">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{group.name} <span className="ml-1 text-muted-foreground">({rows.length})</span></summary>
        {rows.length ? <ul className="divide-y divide-border border-t border-border">{rows.map((part) => <li key={part.key} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm"><label className="flex items-center gap-2"><input type="checkbox" aria-label={`Select ${part.name}`} disabled={busy !== null || part.inherited} checked={selected.includes(part.key)} onChange={(e) => setSelected((keys) => e.target.checked ? [...keys, part.key] : keys.filter((key) => key !== part.key))} /><span>{part.name}{part.inherited && <span className="ml-2 text-xs text-muted-foreground">Assigned through a parent group</span>}</span></label><select aria-label={`Assign ${part.name} to a component`} value={part.componentId ?? ""} disabled={busy !== null} onChange={(e) => assign(part, e.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"><option value="" disabled={part.inherited}>Unassigned</option>{components.map((component) => <option key={component.id} value={component.id}>{component.name}</option>)}</select></li>)}</ul> : <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">No matching parts.</p>}
      </details>; })}
    </div>}
  </section>;
}

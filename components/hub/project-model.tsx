"use client";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Upload, Search, ArrowRight, Grid3x3, Hand, List, MapPin, Move3d, Orbit, Scan, ScanSearch } from "lucide-react";
import Link from "next/link";
import type { HubComponent } from "./assembly-viewer";
import type { ImportedPart } from "./glb-scene";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createFileRecords } from "@/app/actions/knowledge";
import { linkGlbComponent, setViewerModel } from "@/app/actions/model";
import { uploadToProject } from "@/lib/client";
import { createClient } from "@/lib/supabase/client";
import type { FileRow } from "@/lib/types";
import { validateGlb } from "@/lib/cad/validate-glb.mjs";

const Scene = dynamic(() => import("./glb-scene"), { ssr: false, loading: () => <div className="p-8 text-sm text-muted-foreground">Loading 3D viewer…</div> });
const LIMIT = 50 * 1024 * 1024;

export function ProjectModel({ projectId, model, components, modelLinks }: { projectId: string; model: FileRow | null; components: HubComponent[]; modelLinks: { part_key: string; subsystem_id: string }[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [parts, setParts] = useState<ImportedPart[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [componentFilter, setComponentFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [links, setLinks] = useState(modelLinks);
  const [linkBusy, setLinkBusy] = useState(false);
  const [pan, setPan] = useState(false);
  const [isolate, setIsolate] = useState(false);
  const [fitRequest, setFitRequest] = useState(0);
  const [markersOn, setMarkersOn] = useState(true);
  const [partMode, setPartMode] = useState(false);
  const [listOpen, setListOpen] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const receiveParts = useCallback((next: ImportedPart[]) => { setParts(next); setSelected(null); setComponentFilter(null); }, []);
  const highlighted = useMemo(() => componentFilter ? links.filter((l) => l.subsystem_id === componentFilter).map((l) => l.part_key) : selected ? [selected] : [], [componentFilter, links, selected]);
  const markers = useMemo(() => {
    if (!markersOn) return [];
    const visibleKeys = isolate && highlighted.length ? new Set(highlighted) : null;
    return (partMode ? parts.map((part) => ({ id: part.key, name: part.name, partKeys: [part.key] })) : components.map((component) => ({ id: component.id, name: component.name, partKeys: links.filter((link) => link.subsystem_id === component.id).map((link) => link.part_key) })))
      .map((marker) => ({ ...marker, partKeys: visibleKeys ? marker.partKeys.filter((key) => visibleKeys.has(key)) : marker.partKeys }))
      .filter((marker) => marker.partKeys.length > 0);
  }, [markersOn, partMode, parts, components, links, isolate, highlighted]);
  const chosenPart = parts.find((p) => p.key === selected);
  const selectedLink = links.find((l) => l.part_key === selected);
  const chosenComponent = components.find((c) => c.id === (componentFilter ?? selectedLink?.subsystem_id));
  const shownParts = parts.filter((part) => part.name.toLowerCase().includes(search.toLowerCase()));
  async function assign(componentId: string) {
    if (!model || !selected) return;
    setLinkBusy(true); setError("");
    try {
      const result = await linkGlbComponent(projectId, model.id, selected, componentId || null);
      if (!result.ok) { setError(result.error); return; }
      setLinks((prev) => [...prev.filter((l) => l.part_key !== selected), ...(componentId ? [{ part_key: selected, subsystem_id: componentId }] : [])]);
      toast.success(componentId ? "Part linked to subteam" : "Part unlinked");
    } catch { setError("Could not save the link. Please try again."); }
    finally { setLinkBusy(false); }
  }
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
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5 text-sm"><div className="flex flex-wrap items-center gap-2"><Box className="h-4 w-4 text-accent" /><span className="font-semibold">Current assembly</span><span className="truncate text-muted-foreground">{model.name}</span></div>
        <div className="flex flex-wrap items-center gap-0.5" role="toolbar" aria-label="Viewer controls">
          <ViewerButton active={!pan} onClick={() => setPan(false)} label="Orbit"><Orbit /></ViewerButton>
          <ViewerButton active={pan} onClick={() => setPan(true)} label="Pan"><Hand /></ViewerButton>
          <ViewerButton active={isolate} disabled={highlighted.length === 0 && !isolate} onClick={() => setIsolate((value) => !value)} label="Isolate"><ScanSearch /></ViewerButton>
          <ViewerButton onClick={() => setFitRequest((value) => value + 1)} label="Fit"><Scan /></ViewerButton>
          <ViewerButton active={showGrid} onClick={() => setShowGrid((value) => !value)} label="Grid"><Grid3x3 /></ViewerButton>
          <ViewerButton active={markersOn} onClick={() => setMarkersOn((value) => !value)} label="Markers"><MapPin /></ViewerButton>
          <ViewerButton active={listOpen} onClick={() => setListOpen((value) => !value)} label="List"><List /></ViewerButton>
          <ViewerButton active={partMode} onClick={() => { setPartMode((value) => !value); setMarkersOn(true); }} label={partMode ? "Parts on" : "Show parts"}><Move3d /></ViewerButton>
        </div>
      </div>
      <div className={listOpen ? "grid lg:grid-cols-[minmax(0,1fr)_260px]" : "grid"}>
        <div className="relative min-w-0"><div className="h-[340px] bg-[#10151d] sm:h-[460px]"><Scene key={model.storage_path} path={model.storage_path} upright={model.name.toLowerCase() === "f26-aer-0000-501.glb"} showGrid={showGrid} highlighted={highlighted} pan={pan} isolate={isolate} fitRequest={fitRequest} markers={markers} onParts={receiveParts} onSelect={(key) => { setSelected(key); setComponentFilter(null); setIsolate(false); }} onMarker={(id) => { if (partMode) { setSelected(id); setComponentFilter(null); } else { setComponentFilter(id); setSelected(null); } setIsolate(false); }} /></div><p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">{pan ? "Drag to pan · right-drag to orbit" : "Drag to orbit · right-drag to pan"} · scroll to zoom · click a part to select</p></div>
        {listOpen && <aside className="border-t border-border p-4 lg:border-l lg:border-t-0" aria-label="Model parts and subteams">
          <h3 className="text-sm font-semibold">Subteams</h3><p className="mt-1 text-xs text-muted-foreground">Select a subteam to highlight its linked model parts.</p>
          <div className="mt-3 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">{components.map((c) => { const count = links.filter((l) => l.subsystem_id === c.id).length; return <button key={c.id} type="button" onClick={() => { setComponentFilter(componentFilter === c.id ? null : c.id); setSelected(null); }} aria-pressed={componentFilter === c.id} className={`rounded-md border px-2 py-1 text-xs ${componentFilter === c.id ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:text-foreground"}`}>{c.name} · {count}</button>; })}{components.length === 0 && <p className="text-xs text-muted-foreground">Add subteams to your project first.</p>}</div>
          <div className="mt-4 border-t border-border pt-4"><h3 className="text-sm font-semibold">Model parts <span className="font-normal text-muted-foreground">({parts.length})</span></h3><label className="relative mt-2 block"><Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" /><input aria-label="Search model parts" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search parts" className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-2 text-xs" /></label>
          <ul className="mt-2 max-h-36 overflow-y-auto">{shownParts.map((part) => <li key={part.key}><button type="button" onClick={() => { setSelected(part.key); setComponentFilter(null); }} aria-pressed={selected === part.key} className={`w-full truncate rounded-md px-2 py-1.5 text-left text-xs ${selected === part.key ? "bg-accent-soft text-accent" : "text-muted-foreground hover:bg-muted"}`}>{part.name}</button></li>)}</ul></div>
          {(chosenPart || chosenComponent) && <div className="mt-4 space-y-2 border-t border-border pt-4"><p className="text-xs text-muted-foreground">{chosenPart ? "Selected part" : "Selected subteam"}</p><p className="break-words text-sm font-semibold">{chosenPart?.name ?? chosenComponent?.name}</p>{chosenPart && <label className="block text-xs text-muted-foreground">Link to a subteam<select aria-label="Link selected part to subteam" disabled={linkBusy} value={selectedLink?.subsystem_id ?? ""} onChange={(e) => void assign(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-xs text-foreground"><option value="">Not linked</option>{components.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}{chosenComponent && <div className="space-y-1 text-xs text-muted-foreground"><p>{chosenComponent.done} of {chosenComponent.total} documented · {chosenComponent.statusLabel}</p><p>{chosenComponent.latestDecision?.title ?? "No decision recorded yet"}</p><Link className="inline-flex items-center gap-1 text-accent hover:underline" href={chosenComponent.href}>Open {chosenComponent.name} <ArrowRight className="h-3 w-3" /></Link></div>}</div>}
        </aside>}
      </div>
    </div>}
  </div>;
}

function ViewerButton({ active, disabled, label, onClick, children }: { active?: boolean; disabled?: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={active} disabled={disabled} onClick={onClick} className={`flex min-h-10 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40 [&_svg]:h-3.5 [&_svg]:w-3.5 ${active ? "bg-accent-soft text-accent" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{children}<span>{label}</span></button>;
}

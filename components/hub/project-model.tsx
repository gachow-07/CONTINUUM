"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, ChevronDown, ChevronRight, Grid3x3, Hand, History, MapPin, Move3d, Orbit, PanelLeft, Plus, Scale, Scan, ScanSearch, Search, Sparkles, Upload } from "lucide-react";
import { ChatPanel } from "@/components/ai/chat-panel";
import Link from "next/link";
import type { HubComponent } from "./assembly-viewer";
import type { ImportedPart } from "./glb-scene";
import { componentColor } from "./palette";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createFileRecords, createSubsystem } from "@/app/actions/knowledge";
import { linkGlbComponent, setViewerModel } from "@/app/actions/model";
import { uploadToProject } from "@/lib/client";
import { createClient } from "@/lib/supabase/client";
import type { FileRow } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { validateGlb } from "@/lib/cad/validate-glb.mjs";

const Scene = dynamic(() => import("./glb-scene"), { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading 3D viewer…</div> });
const LIMIT = 50 * 1024 * 1024;

/**
 * The project's uploaded GLB model. With a model, the live 3D canvas becomes the backdrop of the whole page and the
 * viewer controls, component list and `aside` (documentation readiness) float over it as glass panels.
 */
export type UploadedModel = { id: string; name: string; uploadedAt: string; links: number };

export function ProjectModel({ projectId, projectName = "", aiEnabled = false, model, models = [], components, modelLinks, aside }: { projectId: string; projectName?: string; aiEnabled?: boolean; model: FileRow | null; models?: UploadedModel[]; components: HubComponent[]; modelLinks: { part_key: string; subsystem_id: string }[]; aside?: React.ReactNode }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const partList = useRef<HTMLUListElement>(null);
  const partRows = useRef(new Map<string, HTMLLIElement>());
  const panelRef = useRef<HTMLElement>(null);
  const [revealRequest, setRevealRequest] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [parts, setParts] = useState<ImportedPart[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const linkSelect = useRef<HTMLSelectElement>(null);
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
  const [partsOpen, setPartsOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const receiveParts = useCallback((next: ImportedPart[]) => { setParts(next); setSelected(null); setComponentFilter(null); }, []);
  const highlighted = useMemo(() => componentFilter ? links.filter((l) => l.subsystem_id === componentFilter).map((l) => l.part_key) : selected ? [selected] : [], [componentFilter, links, selected]);
  const markers = useMemo(() => {
    if (!markersOn) return [];
    const visibleKeys = isolate && highlighted.length ? new Set(highlighted) : null;
    const colorOf = (componentId?: string) => { const i = components.findIndex((c) => c.id === componentId); return i < 0 ? undefined : componentColor(i); };
    return (partMode ? parts.map((part) => ({ id: part.key, name: part.name, partKeys: [part.key], color: colorOf(links.find((link) => link.part_key === part.key)?.subsystem_id) })) : components.map((component) => ({ id: component.id, name: component.name, partKeys: links.filter((link) => link.subsystem_id === component.id).map((link) => link.part_key), color: colorOf(component.id) })))
      .map((marker) => ({ ...marker, partKeys: visibleKeys ? marker.partKeys.filter((key) => visibleKeys.has(key)) : marker.partKeys }))
      .filter((marker) => marker.partKeys.length > 0);
  }, [markersOn, partMode, parts, components, links, isolate, highlighted]);
  const chosenPart = parts.find((p) => p.key === selected);
  const selectedLink = links.find((l) => l.part_key === selected);
  const chosenComponent = components.find((c) => c.id === (componentFilter ?? selectedLink?.subsystem_id));
  const shownParts = parts.filter((part) => part.name.toLowerCase().includes(search.toLowerCase()));
  useLayoutEffect(() => {
    if (!revealRequest || !selected || !partsOpen || !listOpen) return;
    const list = partList.current;
    const row = partRows.current.get(selected);
    if (list && row) list.scrollTop += row.getBoundingClientRect().top - list.getBoundingClientRect().top;
  }, [revealRequest, selected, partsOpen, listOpen, shownParts.length]);
  // Opens the part list at the selected part and puts focus on its "Link to a component" selector.
  function openLinker() {
    setListOpen(true); setPartsOpen(true); setRevealRequest((value) => value + 1);
    requestAnimationFrame(() => requestAnimationFrame(() => linkSelect.current?.focus()));
  }
  function revealPart(key: string) {
    // Clicking the part that is already selected closes it again.
    if (key === selected && !componentFilter) { setSelected(null); setIsolate(false); return; }
    setSelected(key); setComponentFilter(null); setIsolate(false);
    setSearch(""); setListOpen(true); setPartsOpen(true);
    setRevealRequest((value) => value + 1);
  }
  async function assign(componentId: string) {
    if (!model || !selected) return;
    setLinkBusy(true); setError("");
    try {
      const result = await linkGlbComponent(projectId, model.id, selected, componentId || null);
      if (!result.ok) { setError(result.error); return; }
      setLinks((prev) => [...prev.filter((l) => l.part_key !== selected), ...(componentId ? [{ part_key: selected, subsystem_id: componentId }] : [])]);
      toast.success(componentId ? "Part linked to component" : "Part unlinked");
    } catch { setError("Could not save the link. Please try again."); }
    finally { setLinkBusy(false); }
  }
  // Quick add from the part card: create a component and link the selected part to it in one step.
  async function createAndLink(name: string) {
    if (!model || !selected) return false;
    const created = await createSubsystem(projectId, name, "");
    if (!created.ok) { toast.error(created.error); return false; }
    await assign(created.id);
    return true;
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
      toast.success(model ? "New model uploaded. Part links from the previous upload stay with it: switch back any time under Model." : "3D model uploaded");
      router.refresh();
    } catch (e) {
      if (path && !recorded) await createClient().storage.from("project-files").remove([path]);
      setError(e instanceof Error ? e.message : "Could not upload the model.");
    } finally { setBusy(false); }
  }
  async function switchModel(fileId: string) {
    if (!fileId || fileId === model?.id) return;
    setBusy(true); setError("");
    const result = await setViewerModel(projectId, fileId);
    if (!result.ok) { setError(result.error); setBusy(false); return; }
    toast.success("Switched model. Its linked parts are back.");
    router.refresh();
  }
  const switcher = (variant: "glass" | "plain") => models.length > (model ? 1 : 0) && <label className={cn("flex items-center gap-2 text-xs", variant === "glass" ? "mt-3 text-[#6c7178]" : "text-muted-foreground")}>
    {model ? "Model" : "Use an earlier upload"}
    <select aria-label="Choose which uploaded model to show" disabled={busy} value={model?.id ?? ""} onChange={(e) => void switchModel(e.target.value)}
      className={cn("h-8 min-w-0 max-w-[220px] flex-1 truncate rounded-lg border px-2 text-xs", variant === "glass" ? "border-white/[0.08] bg-[#101113]/80 text-[#f2f4f5]" : "border-border bg-surface text-foreground")}>
      {!model && <option value="">Choose a model…</option>}
      {models.map((m) => <option key={m.id} value={m.id}>{m.name} · {formatDate(m.uploadedAt)} · {m.links} linked</option>)}
    </select>
  </label>;
  const uploadInput = <input ref={input} type="file" accept=".glb,model/gltf-binary" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ""; }} />;
  if (!model) return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      {uploadInput}
      <Button variant="outline" size="sm" loading={busy} onClick={() => input.current?.click()}><Upload className="h-4 w-4" />Upload GLB model</Button>
      <span className="text-xs text-muted-foreground">Self-contained .glb · up to 50 MB</span>
      {switcher("plain")}
    </div>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
  </div>;

  const highlightIndex = componentFilter ? components.findIndex((c) => c.id === componentFilter) : -1;
  const highlightColor = highlightIndex >= 0 ? componentColor(highlightIndex) : undefined;
  const title = model.name.replace(/\.glb$/i, "");
  return <ImmersiveStage
    sceneLabel={`3D view of ${title}. Drag to ${pan ? "pan" : "orbit"}, right-drag to ${pan ? "orbit" : "pan"}, scroll to zoom, click a part to select it.`}
    pan={pan}
    scene={(stage) => stage.eventSource && <Scene key={model.storage_path} path={model.storage_path} upright={model.name.toLowerCase() === "f26-aer-0000-501.glb"} showGrid={showGrid} highlighted={highlighted} highlightColor={highlightColor} pan={pan} isolate={isolate} fitRequest={fitRequest} markers={markers} onParts={receiveParts}
      onSelect={revealPart}
      onMarker={(id) => { if (partMode) { revealPart(id); } else { setComponentFilter(id); setSelected(null); setListOpen(true); setIsolate(false); } if (panelRef.current) panelRef.current.scrollTop = 0; }}
      eventSource={stage.eventSource} viewOffset={stage.viewOffset} fitMargin={stage.fitMargin} gizmo={stage.gizmo} />}
    title={<>
      <p className="eyebrow">Current assembly</p>
      <h2 className={cn("mt-1.5 break-words bg-linear-to-b from-white to-[#bfc6cc] bg-clip-text font-semibold leading-[1.1] tracking-[-0.035em] text-transparent", title.length > 12 ? "text-[24px]" : "text-[28px] lg:text-[30px]")}>{title}</h2>
      <p className="mt-1 font-mono text-[10px] text-[#6c7178]">.glb · self-contained · up to 50 MB</p>
      <p className="mt-3 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-[#a9adb3]">
        <span><b className="font-semibold tabular-nums text-[#f2f4f5]">{parts.length}</b> parts</span>
        <span><b className="font-semibold tabular-nums text-[#f2f4f5]">{components.length}</b> components</span>
        <span><b className="font-semibold tabular-nums text-[#f2f4f5]">{links.length}</b> linked</span>
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {uploadInput}
        <GlassButton disabled={busy} onClick={() => input.current?.click()}><Upload className="h-3.5 w-3.5" />{busy ? "Working…" : "Replace model"}</GlassButton>
      </div>
      {switcher("glass")}
      {error && <p role="alert" className="mt-3 max-w-xs rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}
    </>}
    panel={listOpen ? <aside ref={panelRef} aria-label="Components and model parts" className="glass scroll-thin min-h-0 overflow-y-auto rounded-2xl p-3.5 text-[#f2f4f5]">
      {chosenPart && <SelectedPartCard projectId={projectId} projectName={projectName} aiEnabled={aiEnabled} part={chosenPart} component={chosenComponent} components={components} onLink={openLinker} onAssign={assign} onCreate={createAndLink} />}
      <h3 className="flex items-baseline justify-between font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[#6c7178]">Components <span className="tracking-normal tabular-nums">{components.length}</span></h3>
      {components.length === 0 ? <p className="mt-2 text-xs text-[#a9adb3]">Add components to your project first.</p> : (
        <div className="relative mt-2 grid gap-0.5">
          <span aria-hidden className={cn("ease-premium pointer-events-none absolute inset-x-0 top-0 h-[34px] rounded-[9px] border transition-[transform,opacity,background-color,border-color] duration-500", highlightIndex < 0 && "opacity-0")} style={{ transform: `translateY(${Math.max(highlightIndex, 0) * 36}px)`, borderColor: `color-mix(in srgb, ${highlightColor ?? "#22d3ee"} 30%, transparent)`, backgroundColor: `color-mix(in srgb, ${highlightColor ?? "#22d3ee"} 13%, transparent)` }} />
          {components.map((c, i) => { const count = links.filter((l) => l.subsystem_id === c.id).length; const on = componentFilter === c.id; return (
            <button key={c.id} type="button" aria-pressed={on} onClick={() => { setComponentFilter(on ? null : c.id); setSelected(null); if (on) setIsolate(false); }}
              className={cn("relative flex h-[34px] items-center gap-2.5 rounded-[9px] px-2.5 text-left text-xs font-medium transition-colors", on ? "text-[#f2f4f5]" : "text-[#a9adb3] hover:text-[#f2f4f5]")}>
              <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: componentColor(i) }} /><span className="min-w-0 flex-1 truncate">{c.name}</span><span className="text-[11px] tabular-nums text-[#6c7178]">{count}</span>
            </button>); })}
        </div>
      )}
      {chosenComponent && !chosenPart && <div className="mt-2 rounded-xl border border-white/[0.06] bg-black/20 p-2.5 text-xs text-[#a9adb3]">
        <p className="mb-1 font-semibold text-[#f2f4f5]">{chosenComponent.name}</p>
        <p>{chosenComponent.done} of {chosenComponent.total} documented · {chosenComponent.statusLabel}</p>
        <p className="mt-0.5 truncate text-[#f2f4f5]">{chosenComponent.latestDecision?.title ?? "No decision recorded yet"}</p>
        <Link className="mt-1.5 inline-flex items-center gap-1 font-medium text-[#8be9f7] hover:underline" href={chosenComponent.href}>Open {chosenComponent.name} <ArrowRight className="h-3 w-3" /></Link>
      </div>}
      <button type="button" aria-expanded={partsOpen} onClick={() => setPartsOpen((value) => !value)} className="mt-3 flex w-full items-center justify-between border-t border-white/[0.07] pt-3 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[#6c7178] hover:text-[#a9adb3]">
        Model parts <span className="flex items-center gap-1.5 tracking-normal tabular-nums">{parts.length}<ChevronRight className={cn("ease-premium h-3 w-3 transition-transform duration-500", partsOpen && "rotate-90")} /></span>
      </button>
      <div className="expand" data-open={partsOpen}><div>
        <label className="relative mt-2 block"><Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-[#6c7178]" /><input aria-label="Search model parts" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search parts" tabIndex={partsOpen ? 0 : -1}
          className="h-[30px] w-full rounded-lg border border-white/[0.06] bg-black/30 pl-8 pr-2 text-xs text-[#f2f4f5] outline-none transition-shadow focus:border-[#22d3ee]/45 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]" /></label>
        <ul ref={partList} className="scroll-thin mt-1.5 max-h-40 overflow-y-auto pb-32">{shownParts.map((part) => <li key={part.key} ref={(node) => { if (node) partRows.current.set(part.key, node); else partRows.current.delete(part.key); }}><button type="button" data-part-key={part.key} tabIndex={partsOpen ? 0 : -1} onClick={() => { setSelected(selected === part.key ? null : part.key); setComponentFilter(null); }} aria-pressed={selected === part.key}
          className={cn("flex w-full items-center gap-2 truncate rounded-md px-2 py-1.5 text-left font-mono text-[11.5px] transition-colors", selected === part.key ? "bg-[#22d3ee]/10 text-[#8be9f7]" : "text-[#6c7178] hover:bg-white/[0.04] hover:text-[#a9adb3]")}><span className="h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />{part.name}</button></li>)}</ul>
        {chosenPart && <div className="mt-2 space-y-1.5 border-t border-white/[0.07] pt-2.5"><p className="text-[11px] text-[#6c7178]">Selected part</p><p className="break-words text-[13px] font-semibold">{chosenPart.name}</p>
          <label className="block text-[11px] text-[#6c7178]">Link to a component<select ref={linkSelect} aria-label="Link selected part to component" disabled={linkBusy} value={selectedLink?.subsystem_id ?? ""} onChange={(e) => void assign(e.target.value)} className="mt-1 h-8 w-full rounded-lg border border-white/[0.08] bg-[#101113] px-2 text-xs text-[#f2f4f5]"><option value="">Not linked</option>{components.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          {chosenComponent && <Link className="inline-flex items-center gap-1 text-xs font-medium text-[#8be9f7] hover:underline" href={chosenComponent.href}>Open {chosenComponent.name} <ArrowRight className="h-3 w-3" /></Link>}</div>}
      </div></div>
    </aside> : null}
    aside={aside}
    dock={<>
      <div role="radiogroup" aria-label="Left-drag action" className="relative flex rounded-[11px] bg-black/30 p-[3px]">
        <span aria-hidden className="ease-premium absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-lg bg-linear-to-b from-white/14 to-white/6 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_14px_-4px_rgba(0,0,0,0.6)] transition-transform duration-500" style={{ transform: pan ? "translateX(100%)" : "none" }} />
        <SegmentButton tip="Drag to rotate the view around the model." on={!pan} onClick={() => setPan(false)}><Orbit />Orbit</SegmentButton>
        <SegmentButton tip="Drag to move the view without rotating it." on={pan} onClick={() => setPan(true)}><Hand />Pan</SegmentButton>
      </div>
      <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />
      <DockButton active={isolate} disabled={highlighted.length === 0 && !isolate} onClick={() => setIsolate((value) => !value)} label="Isolate selection"><ScanSearch /></DockButton>
      <DockButton onClick={() => setFitRequest((value) => value + 1)} label="Fit to view"><Scan /></DockButton>
      <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />
      <DockButton active={showGrid} onClick={() => setShowGrid((value) => !value)} label="Grid"><Grid3x3 /></DockButton>
      <DockButton active={markersOn} onClick={() => setMarkersOn((value) => !value)} label="Markers"><MapPin /></DockButton>
      <DockButton active={partMode} onClick={() => { setPartMode((value) => !value); setMarkersOn(true); }} label={partMode ? "Part markers on" : "Show part markers"}><Move3d /></DockButton>
      <DockButton active={listOpen} onClick={() => setListOpen((value) => !value)} label="Components panel"><PanelLeft /></DockButton>
    </>}
  />;
}

function GlassButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className="ease-premium inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-white/10 bg-linear-to-b from-white/10 to-white/4 px-3 text-[12.5px] font-medium text-[#f2f4f5] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_6px_16px_-8px_rgba(0,0,0,0.8)] backdrop-blur-md transition-[transform,border-color] duration-300 hover:-translate-y-px hover:border-white/20 disabled:pointer-events-none disabled:opacity-50">{children}</button>;
}

function SegmentButton({ on, onClick, children, tip }: { on: boolean; onClick: () => void; children: React.ReactNode; tip: string }) {
  return <button type="button" role="radio" aria-checked={on} onClick={onClick} title={tip} className={cn("relative z-10 flex w-[76px] items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors duration-300 [&_svg]:h-3.5 [&_svg]:w-3.5", on ? "text-[#f2f4f5]" : "text-[#6c7178] hover:text-[#a9adb3]")}>{children}</button>;
}

function DockButton({ active, disabled, label, onClick, children }: { active?: boolean; disabled?: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  const tips: Record<string, string> = { "Isolate selection": "Show only the selected part or component.", "Fit to view": "Fit the model in the viewer.", Grid: "Show or hide the ground grid.", Markers: "Show or hide the current component or part markers.", "Part markers on": "Switch back to component markers.", "Show part markers": "Switch to individual part markers.", "Components panel": "Show or hide the parts and components panel." };
  return <button type="button" aria-pressed={active} aria-label={label} disabled={disabled} onClick={onClick}
    className={cn("group ease-premium relative grid h-[34px] w-9 place-items-center rounded-[10px] transition-[color,background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-white/[0.07] hover:text-[#f2f4f5] active:scale-95 disabled:pointer-events-none disabled:opacity-30 [&_svg]:h-4 [&_svg]:w-4", active ? "text-[#f2f4f5]" : "text-[#6c7178]")}>
    {children}
    {active && <span aria-hidden className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#22d3ee] shadow-[0_0_8px_#22d3ee]" />}
    <span aria-hidden className="ease-premium pointer-events-none absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md border border-white/10 bg-[#0b0c0d]/95 px-2 py-1 text-[11px] font-medium text-[#f2f4f5] opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">{tips[label] ?? label}</span>
  </button>;
}

const noopSubscribe = () => () => {};

type StageProps = { eventSource: HTMLElement | null; viewOffset: [number, number]; fitMargin: number; gizmo: { alignment: "bottom-left"; margin: [number, number] } | null };

/**
 * Lays out the immersive Overview. The canvas is portalled into <body> as a fixed backdrop (so no transformed ancestor can
 * trap it); pointer input comes from a transparent layer inside the page so the model stays interactive between panels.
 */
function ImmersiveStage({ scene, sceneLabel, pan, title, panel, aside, dock }: { scene: (stage: StageProps) => React.ReactNode; sceneLabel: string; pan: boolean; title: React.ReactNode; panel: React.ReactNode; aside: React.ReactNode; dock: React.ReactNode }) {
  const hero = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const leftCol = useRef<HTMLDivElement>(null);
  const rightCol = useRef<HTMLDivElement>(null);
  const dim = useRef<HTMLDivElement>(null);
  const [hit, setHit] = useState<HTMLDivElement | null>(null);
  // True only in the browser, after hydration: the portal needs document.body.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [layout, setLayout] = useState({ height: 0, offset: [0, 0] as [number, number], fitMargin: 1.6, dockX: 0, gizmoX: 56, gizmoY: 150, wide: true });
  const [hints, setHints] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { const timer = setTimeout(() => setHints(false), 5000); return () => clearTimeout(timer); }, []);

  // Centre the model in the open space between the panels and size it to fit there.
  useLayoutEffect(() => {
    const measure = () => {
      const el = hero.current, view = viewport.current;
      if (!el || !view) return;
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      const vw = window.innerWidth, vh = window.innerHeight;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const height = wide ? Math.max(560, Math.round(vh - top - 8)) : 0;
      const box = el.getBoundingClientRect();
      const left = wide && leftCol.current ? leftCol.current.getBoundingClientRect().right : box.left;
      const right = wide && rightCol.current ? rightCol.current.getBoundingClientRect().left : box.right;
      const v = view.getBoundingClientRect();
      // On wide screens, centre vertically in the visible window (between the top bar and the dock), not just the hero.
      const barBottom = document.querySelector('[data-shell="header"]')?.getBoundingClientRect().bottom ?? 56;
      const dockTop = top + height - 74;
      const openW = Math.max(240, right - left - 32);
      const openH = wide ? dockTop - barBottom - 40 : v.height - 70;
      const cx = (left + right) / 2;
      const cy = wide ? (barBottom + dockTop) / 2 : v.top + window.scrollY + (v.height - 60) / 2;
      setLayout({ height, wide, offset: [Math.round(cx - vw / 2), Math.round(cy - vh / 2)], // The fit is limited by the canvas's shorter side, so size against that.
      fitMargin: Math.max(1.2, Math.min(vw, vh) / (0.92 * Math.min(openW, openH))), dockX: Math.round(cx - box.left), gizmoX: Math.round(wide ? left + 60 : v.left + 56), gizmoY: Math.round(wide ? 150 : vh - v.bottom + 82) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    [hero.current, leftCol.current, rightCol.current].forEach((node) => node && observer.observe(node));
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure); };
  }, []);

  // As the page scrolls, the scene dims behind the content rising over it.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => {
      const span = Math.max(320, (layout.height || window.innerHeight) * 0.6);
      const t = Math.min(1, window.scrollY / span);
      if (dim.current) dim.current.style.opacity = String(t * 0.6);
      setScrolled(t > 0.45);
    }); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", onScroll); };
  }, [layout.height]);

  const stage = mounted ? createPortal(
    <div data-immersive-stage aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[radial-gradient(1200px_700px_at_55%_58%,#17191c_0%,#0e0f11_55%,#09090b_100%)]">
      <div className="animate-rise-in absolute inset-0">{scene({ eventSource: hit, viewOffset: layout.offset, fitMargin: layout.fitMargin, gizmo: scrolled && layout.wide ? null : { alignment: "bottom-left", margin: [layout.gizmoX, layout.gizmoY] } })}</div>
      <div className="absolute inset-0 bg-[radial-gradient(130%_100%_at_55%_55%,transparent_50%,rgba(6,7,8,0.7)),linear-gradient(180deg,rgba(6,7,8,0.45),transparent_22%)]" />
      <div ref={dim} className="absolute inset-0 bg-[#06090e] opacity-0" />
    </div>, document.body) : null;

  return <>
    {stage}
    <section ref={hero} aria-label="Current assembly" className="relative flex flex-col lg:block lg:pointer-events-none" style={layout.wide && layout.height ? { height: layout.height } : undefined}>
      {/* Transparent layer that drives the 3D scene (orbit, pan, zoom, select). */}
      <div ref={setHit} role="img" aria-label={sceneLabel} className={cn("absolute inset-0 hidden touch-none lg:pointer-events-auto lg:block", pan ? "cursor-move" : "cursor-grab active:cursor-grabbing")} />
      <div ref={leftCol} className="contents lg:pointer-events-none lg:absolute lg:bottom-6 lg:left-0 lg:top-2 lg:z-10 lg:flex lg:w-[256px] lg:flex-col lg:gap-4 lg:[&>*]:pointer-events-auto">
        <div className="animate-rise-in relative z-10 order-1 shrink-0 [--rise-delay:150ms]">{title}</div>
        {panel && <div className="animate-rise-in relative z-10 order-3 mt-4 flex min-h-0 flex-col [--rise-delay:300ms] lg:mt-0">{panel}</div>}
      </div>
      {/* On small screens the model shows through this window between the title and the panels below. */}
      <div ref={viewport} className="relative order-2 h-[52svh] min-h-[300px] lg:pointer-events-none lg:absolute lg:inset-0 lg:h-auto">
        <div className="absolute inset-0 touch-none lg:hidden" ref={(node) => { if (node && !window.matchMedia("(min-width: 1024px)").matches) setHit(node); }} />
        <p className={cn("pointer-events-none absolute bottom-[78px] hidden -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full border border-white/[0.06] bg-[#0b0c0d]/55 px-3 py-1.5 text-[11px] text-[#6c7178] backdrop-blur-md transition-opacity duration-1000 lg:flex", hints ? "opacity-100" : "opacity-0")} style={{ left: layout.dockX }}>
          <Hint k="Drag">{pan ? "pan" : "orbit"}</Hint><Hint k="Right-drag">{pan ? "orbit" : "pan"}</Hint><Hint k="Scroll">zoom</Hint><Hint k="Click">select</Hint>
        </p>
        <div role="toolbar" aria-label="Viewer controls" className="glass animate-dock-in absolute bottom-3 left-1/2 flex max-w-[calc(100%-16px)] items-center gap-0.5 overflow-x-auto rounded-2xl p-1.5 lg:pointer-events-auto lg:bottom-5 lg:overflow-visible" style={layout.wide ? { left: layout.dockX } : undefined}>{dock}</div>
      </div>
      {aside && <div ref={rightCol} className="animate-rise-in relative z-10 order-4 mt-4 [--rise-delay:220ms] lg:pointer-events-auto lg:absolute lg:right-0 lg:top-0 lg:mt-0 lg:max-h-[calc(100%-8px)] lg:w-[360px] lg:overflow-y-auto lg:rounded-2xl lg:[scrollbar-width:none]">{aside}</div>}
      <button type="button" onClick={() => document.getElementById("overview-details")?.scrollIntoView({ behavior: "smooth" })} className="pointer-events-auto absolute bottom-7 right-0 hidden items-center gap-1.5 text-[11px] text-[#6c7178] transition-colors hover:text-[#a9adb3] lg:flex">
        More below <ChevronDown className="h-3.5 w-3.5 motion-safe:animate-bounce" />
      </button>
    </section>
  </>;
}

function Hint({ k, children }: { k: string; children: React.ReactNode }) {
  return <span className="flex items-center gap-1.5"><kbd className="rounded-md border border-white/[0.09] bg-white/[0.07] px-1.5 py-0.5 font-sans text-[10px] font-medium text-[#a9adb3]">{k}</kbd>{children}</span>;
}

/**
 * Small Ask AI button on the selected-part card. The chat floats beside the card (outside the scrolling panel, so it isn't
 * clipped) and opens with a question about that part, so the answer appears on the Overview instead of another page.
 */
function PartAskAi({ projectId, projectName, aiEnabled, partName, componentName }: { projectId: string; projectName: string; aiEnabled: boolean; partName: string; componentName?: string }) {
  const { open, pos, button, popover, toggle } = usePopover(404, 492);
  const question = `What is documented about the part "${partName}"${componentName ? ` in the ${componentName} component` : ""}?`;
  return <>
    <button ref={button} type="button" onClick={toggle} aria-expanded={open} aria-haspopup="dialog" aria-label={`Ask AI about ${partName}`} title="Ask AI about this part"
      className="ai-gradient ai-glow grid h-6 w-6 shrink-0 place-items-center rounded-md transition-transform duration-300 hover:-translate-y-px"><Sparkles className="h-3.5 w-3.5" /></button>
    {open && pos && createPortal(
      <div ref={popover} role="dialog" aria-label={`Ask AI about ${partName}`} style={{ left: pos.left, top: pos.top }}
        className="animate-fade-in fixed z-50 w-[392px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-border-strong bg-background shadow-[var(--shadow-pop)]">
        <div className="ai-gradient h-1" />
        <ChatPanel key={partName} projectId={projectId} projectName={projectName} aiEnabled={aiEnabled} initialMessages={[]} initialConversationId={null}
          initialQuestion={question} height="h-[480px] rounded-none border-0 shadow-none"
          suggestions={["Why was this part designed this way?", "Which decisions affect this part?", "What is still undocumented for this part?"]} />
      </div>, document.body)}
  </>;
}

/** A small floating panel anchored beside a button, rendered into <body> so the scrolling side panel can't clip it. */
function usePopover(width: number, height: number) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: PointerEvent) => { const t = e.target as Node; if (!popover.current?.contains(t) && !button.current?.contains(t)) setOpen(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown); };
  }, [open]);
  const toggle = () => {
    // Open beside the whole card (not just the button) so the panel never covers the card's other buttons.
    const r = (button.current?.closest("[data-part-card]") ?? button.current)?.getBoundingClientRect();
    if (r) setPos({ left: Math.max(12, Math.min(r.right + 14, window.innerWidth - width)), top: Math.max(12, Math.min(r.top, window.innerHeight - height)) });
    setOpen((o) => !o);
  };
  return { open, setOpen, pos, button, popover, toggle };
}

/** "+" on the selected-part card: add documentation to the part's component, or link the part to a component (or a new one) in place. */
function PartAddMenu({ partName, component, components, onAssign, onCreate }: { partName: string; component?: HubComponent; components: HubComponent[]; onAssign: (componentId: string) => Promise<void>; onCreate: (name: string) => Promise<boolean> }) {
  const { open, setOpen, pos, button, popover, toggle } = usePopover(252, 360);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const close = () => { setOpen(false); setAdding(false); setName(""); };
  const item = "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-foreground hover:bg-muted disabled:opacity-50";
  const icon = "h-4 w-4 shrink-0 text-muted-foreground";
  const link = async (id: string) => { setBusy(true); try { await onAssign(id); close(); } finally { setBusy(false); } };
  const create = async () => { if (!name.trim()) return; setBusy(true); try { if (await onCreate(name.trim())) close(); } finally { setBusy(false); } };
  return <>
    <button ref={button} type="button" onClick={() => (open ? close() : toggle())} aria-expanded={open} aria-haspopup="menu" aria-label={`Add details for ${partName}`} title={component ? `Add details to ${component.name}` : "Link this part to a component"}
      className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.06] text-[#8be9f7] transition-[transform,background-color] duration-300 hover:-translate-y-px hover:bg-white/[0.12]"><Plus className="h-3.5 w-3.5" /></button>
    {open && pos && createPortal(
      <div ref={popover} role="menu" aria-label={`Add details for ${partName}`} style={{ left: pos.left, top: pos.top }}
        className="animate-fade-in fixed z-50 w-60 rounded-xl border border-border-strong bg-background p-1 shadow-[var(--shadow-pop)]">
        <p className="px-2.5 pb-1 pt-1.5 text-[11px] text-muted-foreground">{component ? <>Add to <span className="text-foreground">{component.name}</span></> : "This part has no component yet"}</p>
        {component ? <>
          <Link role="menuitem" className={item} href={`${component.href}?tab=decisions`} onClick={close}><Scale className={icon} />Add a decision</Link>
          <Link role="menuitem" className={item} href={`${component.href}?tab=research`} onClick={close}><BookOpen className={icon} />Add research</Link>
          <Link role="menuitem" className={item} href={`${component.href}?tab=revisions`} onClick={close}><History className={icon} />Record a revision</Link>
        </> : <>
          <p className="px-2.5 pb-0.5 pt-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Link to</p>
          <div className="scroll-thin max-h-48 overflow-y-auto">
            {components.map((c, i) => <button key={c.id} role="menuitem" type="button" disabled={busy} className={item} onClick={() => void link(c.id)}>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: componentColor(i) }} /><span className="min-w-0 truncate">{c.name}</span></button>)}
            {components.length === 0 && <p className="px-2.5 py-2 text-xs text-muted-foreground">No components yet. Add the first one below.</p>}
          </div>
          <div className="my-1 h-px bg-border" />
          {adding ? (
            <form className="flex items-center gap-1.5 p-1" onSubmit={(e) => { e.preventDefault(); void create(); }}>
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} disabled={busy} aria-label="New component name" placeholder="New component name"
                onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setAdding(false); setName(""); } }}
                className="h-8 min-w-0 flex-1 rounded-md border border-border-strong bg-surface px-2 text-[13px] text-foreground outline-none focus:border-accent" />
              <button type="submit" disabled={busy || !name.trim()} className="h-8 shrink-0 rounded-md bg-accent px-2.5 text-[12px] font-semibold text-[#031317] disabled:opacity-50">{busy ? "Adding…" : "Add"}</button>
            </form>
          ) : <button role="menuitem" type="button" className={item} onClick={() => setAdding(true)}><Plus className={icon} />Add component</button>}
        </>}
      </div>, document.body)}
  </>;
}

/** The card for the part selected on the model: its name, its component, Ask AI and "+" to add details. */
export function SelectedPartCard({ projectId, projectName, aiEnabled, part, component, components, onLink, onAssign, onCreate }: { projectId: string; projectName: string; aiEnabled: boolean; part: ImportedPart; component?: HubComponent; components: HubComponent[]; onLink: () => void; onAssign: (componentId: string) => Promise<void>; onCreate: (name: string) => Promise<boolean> }) {
  return <div data-part-card className="mb-3 rounded-xl border border-[#22d3ee]/25 bg-[#22d3ee]/10 p-3 text-xs" aria-live="polite">
    <div className="flex items-center justify-between gap-2"><p className="text-[#a9adb3]">Selected part</p>
      <div className="flex items-center gap-1.5"><PartAddMenu partName={part.name} component={component} components={components} onAssign={onAssign} onCreate={onCreate} /><PartAskAi projectId={projectId} projectName={projectName} aiEnabled={aiEnabled} partName={part.name} componentName={component?.name} /></div></div>
    <p className="mt-1 break-words text-sm font-semibold text-[#f2f4f5]">{part.name}</p>
    {component ? <>
      <p className="mt-1 text-[#a9adb3]">Component: {component.name}</p>
      <Link className="mt-2 inline-flex items-center gap-1 font-medium text-[#8be9f7] hover:underline" href={`${component.href}?part=${encodeURIComponent(part.key)}`}>Open component details <ArrowRight className="h-3 w-3" /></Link>
    </> : <>
      <p className="mt-1 text-[#a9adb3]">Not linked to a component yet.</p>
      <button type="button" onClick={onLink} className="mt-2 inline-flex items-center gap-1 font-medium text-[#8be9f7] hover:underline">Component empty <ArrowRight className="h-3 w-3" /></button>
    </>}
  </div>;
}

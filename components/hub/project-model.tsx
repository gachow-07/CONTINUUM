"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, ChevronRight, Grid3x3, Hand, MapPin, Move3d, Orbit, PanelLeft, Scan, ScanSearch, Search, Upload } from "lucide-react";
import Link from "next/link";
import type { HubComponent } from "./assembly-viewer";
import type { ImportedPart } from "./glb-scene";
import { componentColor } from "./palette";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createFileRecords } from "@/app/actions/knowledge";
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

export function ProjectModel({ projectId, model, models = [], components, modelLinks, aside }: { projectId: string; model: FileRow | null; models?: UploadedModel[]; components: HubComponent[]; modelLinks: { part_key: string; subsystem_id: string }[]; aside?: React.ReactNode }) {
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
  const [partsOpen, setPartsOpen] = useState(false);
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
      toast.success(componentId ? "Part linked to component" : "Part unlinked");
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
  const switcher = (variant: "glass" | "plain") => models.length > (model ? 1 : 0) && <label className={cn("flex items-center gap-2 text-xs", variant === "glass" ? "mt-3 text-[#6b7689]" : "text-muted-foreground")}>
    {model ? "Model" : "Use an earlier upload"}
    <select aria-label="Choose which uploaded model to show" disabled={busy} value={model?.id ?? ""} onChange={(e) => void switchModel(e.target.value)}
      className={cn("h-8 min-w-0 max-w-[220px] flex-1 truncate rounded-lg border px-2 text-xs", variant === "glass" ? "border-white/[0.08] bg-[#0d1119]/80 text-[#eef2f8]" : "border-border bg-surface text-foreground")}>
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
  const title = model.name.replace(/\.glb$/i, "");
  return <ImmersiveStage
    sceneLabel={`3D view of ${title}. Drag to ${pan ? "pan" : "orbit"}, right-drag to ${pan ? "orbit" : "pan"}, scroll to zoom, click a part to select it.`}
    pan={pan}
    scene={(stage) => <Scene key={model.storage_path} path={model.storage_path} upright={model.name.toLowerCase() === "f26-aer-0000-501.glb"} showGrid={showGrid} highlighted={highlighted} pan={pan} isolate={isolate} fitRequest={fitRequest} markers={markers} onParts={receiveParts}
      onSelect={(key) => { setSelected(key); setComponentFilter(null); setIsolate(false); setPartsOpen(true); }}
      onMarker={(id) => { if (partMode) { setSelected(id); setComponentFilter(null); setPartsOpen(true); } else { setComponentFilter(id); setSelected(null); } setIsolate(false); }}
      eventSource={stage.eventSource} viewOffset={stage.viewOffset} fitMargin={stage.fitMargin} gizmo={stage.gizmo} />}
    title={<>
      <p className="eyebrow">Current assembly</p>
      <h2 className={cn("mt-1.5 break-words bg-linear-to-b from-white to-[#b9c6da] bg-clip-text font-semibold leading-[1.1] tracking-[-0.035em] text-transparent", title.length > 12 ? "text-[24px]" : "text-[28px] lg:text-[30px]")}>{title}</h2>
      <p className="mt-1 font-mono text-[11.5px] text-[#6b7689]">.glb · self-contained · up to 50 MB</p>
      <p className="mt-3 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-[#a6b0c0]">
        <span><b className="font-semibold tabular-nums text-[#eef2f8]">{parts.length}</b> parts</span>
        <span><b className="font-semibold tabular-nums text-[#eef2f8]">{components.length}</b> components</span>
        <span><b className="font-semibold tabular-nums text-[#eef2f8]">{links.length}</b> linked</span>
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {uploadInput}
        <GlassButton disabled={busy} onClick={() => input.current?.click()}><Upload className="h-3.5 w-3.5" />{busy ? "Working…" : "Replace model"}</GlassButton>
      </div>
      {switcher("glass")}
      {error && <p role="alert" className="mt-3 max-w-xs rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}
    </>}
    panel={listOpen ? <aside aria-label="Components and model parts" className="glass scroll-thin min-h-0 overflow-y-auto rounded-2xl p-3.5 text-[#eef2f8]">
      <h3 className="flex items-baseline justify-between text-[10px] font-medium uppercase tracking-[0.14em] text-[#6b7689]">Components <span className="tracking-normal tabular-nums">{components.length}</span></h3>
      {components.length === 0 ? <p className="mt-2 text-xs text-[#a6b0c0]">Add components to your project first.</p> : (
        <div className="relative mt-2 grid gap-0.5">
          <span aria-hidden className={cn("ease-premium pointer-events-none absolute inset-x-0 top-0 h-[34px] rounded-[9px] border border-[#4d94ff]/30 bg-linear-to-b from-[#4d94ff]/18 to-[#4d94ff]/8 transition-[transform,opacity] duration-500", highlightIndex < 0 && "opacity-0")} style={{ transform: `translateY(${Math.max(highlightIndex, 0) * 36}px)` }} />
          {components.map((c, i) => { const count = links.filter((l) => l.subsystem_id === c.id).length; const on = componentFilter === c.id; return (
            <button key={c.id} type="button" aria-pressed={on} onClick={() => { setComponentFilter(on ? null : c.id); setSelected(null); if (on) setIsolate(false); }}
              className={cn("relative flex h-[34px] items-center gap-2.5 rounded-[9px] px-2.5 text-left text-xs font-medium transition-colors", on ? "text-[#eef2f8]" : "text-[#a6b0c0] hover:text-[#eef2f8]")}>
              <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: componentColor(i) }} /><span className="min-w-0 flex-1 truncate">{c.name}</span><span className="text-[11px] tabular-nums text-[#6b7689]">{count}</span>
            </button>); })}
        </div>
      )}
      {chosenComponent && !chosenPart && <div className="mt-2 rounded-xl border border-white/[0.06] bg-black/20 p-2.5 text-xs text-[#a6b0c0]">
        <p>{chosenComponent.done} of {chosenComponent.total} documented · {chosenComponent.statusLabel}</p>
        <p className="mt-0.5 truncate text-[#eef2f8]">{chosenComponent.latestDecision?.title ?? "No decision recorded yet"}</p>
        <Link className="mt-1.5 inline-flex items-center gap-1 font-medium text-[#8fc3ff] hover:underline" href={chosenComponent.href}>Open {chosenComponent.name} <ArrowRight className="h-3 w-3" /></Link>
      </div>}
      <button type="button" aria-expanded={partsOpen} onClick={() => setPartsOpen((value) => !value)} className="mt-3 flex w-full items-center justify-between border-t border-white/[0.07] pt-3 text-[10px] font-medium uppercase tracking-[0.14em] text-[#6b7689] hover:text-[#a6b0c0]">
        Model parts <span className="flex items-center gap-1.5 tracking-normal tabular-nums">{parts.length}<ChevronRight className={cn("ease-premium h-3 w-3 transition-transform duration-500", partsOpen && "rotate-90")} /></span>
      </button>
      <div className="expand" data-open={partsOpen}><div>
        <label className="relative mt-2 block"><Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-[#6b7689]" /><input aria-label="Search model parts" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search parts" tabIndex={partsOpen ? 0 : -1}
          className="h-[30px] w-full rounded-lg border border-white/[0.06] bg-black/30 pl-8 pr-2 text-xs text-[#eef2f8] outline-none transition-shadow focus:border-[#4d94ff]/45 focus:shadow-[0_0_0_4px_rgba(77,148,255,0.12)]" /></label>
        <ul className="scroll-thin mt-1.5 max-h-40 overflow-y-auto">{shownParts.map((part) => <li key={part.key}><button type="button" tabIndex={partsOpen ? 0 : -1} onClick={() => { setSelected(part.key); setComponentFilter(null); }} aria-pressed={selected === part.key}
          className={cn("flex w-full items-center gap-2 truncate rounded-md px-2 py-1.5 text-left font-mono text-[11.5px] transition-colors", selected === part.key ? "bg-[#4d94ff]/10 text-[#8fc3ff]" : "text-[#6b7689] hover:bg-white/[0.04] hover:text-[#a6b0c0]")}><span className="h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />{part.name}</button></li>)}</ul>
        {chosenPart && <div className="mt-2 space-y-1.5 border-t border-white/[0.07] pt-2.5"><p className="text-[11px] text-[#6b7689]">Selected part</p><p className="break-words text-[13px] font-semibold">{chosenPart.name}</p>
          <label className="block text-[11px] text-[#6b7689]">Link to a component<select aria-label="Link selected part to component" disabled={linkBusy} value={selectedLink?.subsystem_id ?? ""} onChange={(e) => void assign(e.target.value)} className="mt-1 h-8 w-full rounded-lg border border-white/[0.08] bg-[#0d1119] px-2 text-xs text-[#eef2f8]"><option value="">Not linked</option>{components.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          {chosenComponent && <Link className="inline-flex items-center gap-1 text-xs font-medium text-[#8fc3ff] hover:underline" href={chosenComponent.href}>Open {chosenComponent.name} <ArrowRight className="h-3 w-3" /></Link>}</div>}
      </div></div>
    </aside> : null}
    aside={aside}
    dock={<>
      <div role="radiogroup" aria-label="Left-drag action" className="relative flex rounded-[11px] bg-black/30 p-[3px]">
        <span aria-hidden className="ease-premium absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-lg bg-linear-to-b from-white/14 to-white/6 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_14px_-4px_rgba(0,0,0,0.6)] transition-transform duration-500" style={{ transform: pan ? "translateX(100%)" : "none" }} />
        <SegmentButton on={!pan} onClick={() => setPan(false)}><Orbit />Orbit</SegmentButton>
        <SegmentButton on={pan} onClick={() => setPan(true)}><Hand />Pan</SegmentButton>
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
  return <button type="button" {...props} className="ease-premium inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-white/10 bg-linear-to-b from-white/10 to-white/4 px-3 text-[12.5px] font-medium text-[#eef2f8] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_6px_16px_-8px_rgba(0,0,0,0.8)] backdrop-blur-md transition-[transform,border-color] duration-300 hover:-translate-y-px hover:border-white/20 disabled:pointer-events-none disabled:opacity-50">{children}</button>;
}

function SegmentButton({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" role="radio" aria-checked={on} onClick={onClick} className={cn("relative z-10 flex w-[76px] items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors duration-300 [&_svg]:h-3.5 [&_svg]:w-3.5", on ? "text-[#eef2f8]" : "text-[#6b7689] hover:text-[#a6b0c0]")}>{children}</button>;
}

function DockButton({ active, disabled, label, onClick, children }: { active?: boolean; disabled?: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={active} aria-label={label} disabled={disabled} onClick={onClick}
    className={cn("group ease-premium relative grid h-[34px] w-9 place-items-center rounded-[10px] transition-[color,background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-white/[0.07] hover:text-[#eef2f8] active:scale-95 disabled:pointer-events-none disabled:opacity-30 [&_svg]:h-4 [&_svg]:w-4", active ? "text-[#eef2f8]" : "text-[#6b7689]")}>
    {children}
    {active && <span aria-hidden className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#4d94ff] shadow-[0_0_8px_#4d94ff]" />}
    <span aria-hidden className="ease-premium pointer-events-none absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md border border-white/10 bg-[#0a0d13]/95 px-2 py-1 text-[11px] font-medium text-[#eef2f8] opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">{label}</span>
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
  const [layout, setLayout] = useState({ height: 0, offset: [0, 0] as [number, number], fitMargin: 1.6, dockX: 0, gizmoX: 56, wide: true });
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
      fitMargin: Math.max(1.2, Math.min(vw, vh) / (0.92 * Math.min(openW, openH))), dockX: Math.round(cx - box.left), gizmoX: Math.round(left + 60) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    [hero.current, leftCol.current, rightCol.current].forEach((node) => node && observer.observe(node));
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
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
    <div data-immersive-stage aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[radial-gradient(1200px_700px_at_55%_58%,#121a26_0%,#0b1017_55%,#080b11_100%)]">
      <div className="animate-rise-in absolute inset-0">{scene({ eventSource: hit, viewOffset: layout.offset, fitMargin: layout.fitMargin, gizmo: scrolled || !layout.wide ? null : { alignment: "bottom-left", margin: [layout.gizmoX, 150] } })}</div>
      <div className="absolute inset-0 bg-[radial-gradient(130%_100%_at_55%_55%,transparent_50%,rgba(4,6,9,0.7)),linear-gradient(180deg,rgba(4,6,9,0.45),transparent_22%)]" />
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
        <p className={cn("pointer-events-none absolute bottom-[78px] hidden -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full border border-white/[0.06] bg-[#0a0d13]/55 px-3 py-1.5 text-[11px] text-[#6b7689] backdrop-blur-md transition-opacity duration-1000 lg:flex", hints ? "opacity-100" : "opacity-0")} style={{ left: layout.dockX }}>
          <Hint k="Drag">{pan ? "pan" : "orbit"}</Hint><Hint k="Right-drag">{pan ? "orbit" : "pan"}</Hint><Hint k="Scroll">zoom</Hint><Hint k="Click">select</Hint>
        </p>
        <div role="toolbar" aria-label="Viewer controls" className="glass animate-dock-in absolute bottom-3 left-1/2 flex max-w-[calc(100%-16px)] items-center gap-0.5 overflow-x-auto rounded-2xl p-1.5 lg:pointer-events-auto lg:bottom-5 lg:overflow-visible" style={layout.wide ? { left: layout.dockX } : undefined}>{dock}</div>
      </div>
      {aside && <div ref={rightCol} className="animate-rise-in relative z-10 order-4 mt-4 [--rise-delay:220ms] lg:pointer-events-auto lg:absolute lg:right-0 lg:top-0 lg:mt-0 lg:max-h-[calc(100%-8px)] lg:w-[360px] lg:overflow-y-auto lg:rounded-2xl lg:[scrollbar-width:none]">{aside}</div>}
      <button type="button" onClick={() => document.getElementById("overview-details")?.scrollIntoView({ behavior: "smooth" })} className="pointer-events-auto absolute bottom-7 right-0 hidden items-center gap-1.5 text-[11px] text-[#6b7689] transition-colors hover:text-[#a6b0c0] lg:flex">
        More below <ChevronDown className="h-3.5 w-3.5 motion-safe:animate-bounce" />
      </button>
    </section>
  </>;
}

function Hint({ k, children }: { k: string; children: React.ReactNode }) {
  return <span className="flex items-center gap-1.5"><kbd className="rounded-md border border-white/[0.09] bg-white/[0.07] px-1.5 py-0.5 font-sans text-[10px] font-medium text-[#a6b0c0]">{k}</kbd>{children}</span>;
}

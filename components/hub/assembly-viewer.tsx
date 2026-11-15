"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Grid3x3, Hand, List, Loader2, MapPin, Move3d, Orbit, ScanSearch, Scan, X } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { subsystemOf } from "@/lib/cad/ops";
import type { Part, Vec3 } from "@/lib/cad/types";
import type { ViewRequest } from "@/components/cad/viewport";
import { ComponentIcon } from "./icons";
import { ViewerTip } from "./viewer-tip";

const Viewport = dynamic(() => import("@/components/cad/viewport"), { ssr: false, loading: () => <Loading /> });
const Loading = () => <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading 3D viewer…</div>;

export interface HubComponent {
  id: string; name: string; marker: Vec3 | null; done: number; total: number; statusLabel: string; statusTone: Tone;
  latestDecision: { id: string; title: string; href?: string } | null; reviewLabel: string; reviewTone: Tone; href: string;
  partId?: string;
}

function ToolBtn({ on, onClick, children, label, disabled }: { on?: boolean; onClick: () => void; children: React.ReactNode; label: string; disabled?: boolean }) {
  return (
    <ViewerTip label={label}><button type="button" onClick={onClick} aria-pressed={on} disabled={disabled} className={cn("flex min-h-10 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40 [&_svg]:h-3.5 [&_svg]:w-3.5", on ? "bg-accent-soft text-accent" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>{children}<span>{label}</span></button></ViewerTip>
  );
}

export function AssemblyViewer({ projectId, parts, components, individualParts, revisionLabel, placeholder }: {
  projectId: string; parts: Part[]; components: HubComponent[]; individualParts?: HubComponent[]; revisionLabel: string | null; placeholder: boolean;
}) {
  const [partMode, setPartMode] = useState(false);
  const displayed = partMode ? (individualParts ?? []) : components;
  const [selected, setSelected] = useState<string | null>(null);
  const [markersOn, setMarkersOn] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [pan, setPan] = useState(false);
  const [isolate, setIsolate] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<ViewRequest>({ preset: "iso", nonce: 0, immediate: true });
  const sel = displayed.find((c) => c.id === selected) ?? null;

  // Parts belonging to the selected component are highlighted; "Isolate" hides everything else.
  const { shownParts, highlight } = useMemo(() => {
    if (!sel) return { shownParts: parts, highlight: new Set<string>() };
    const mine = new Set(parts.filter((p) => sel.partId ? p.id === sel.partId : subsystemOf(parts, p.id) === sel.id).map((p) => p.id));
    const shown = isolate ? parts.map((p) => (p.kind === "group" ? p : { ...p, visible: p.visible && mine.has(p.id) })) : parts;
    return { shownParts: shown, highlight: mine };
  }, [parts, sel, isolate]);

  const markers = displayed.filter((c) => c.marker).map((c) => ({ id: c.id, name: c.name, position: c.marker!, summary: c.total ? `${c.done} of ${c.total} documented` : c.statusLabel, active: c.id === selected }));
  const noMarkers = markers.length === 0;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <Move3d className="h-4 w-4 text-muted-foreground" /><span className="font-semibold">Current assembly</span>
          {revisionLabel && <span className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">{revisionLabel}</span>}
          {placeholder && <Badge tone="warning">Placeholder model</Badge>}
        </div>
        <div className="flex flex-wrap items-center gap-0.5" role="toolbar" aria-label="Viewer controls">
          <ToolBtn on={!pan} onClick={() => setPan(false)} label="Orbit"><Orbit /></ToolBtn>
          <ToolBtn on={pan} onClick={() => setPan(true)} label="Pan"><Hand /></ToolBtn>
          <ToolBtn on={isolate} onClick={() => setIsolate((v) => !v)} label="Isolate" disabled={!sel}><ScanSearch /></ToolBtn>
          <ToolBtn onClick={() => setView((v) => ({ preset: "fit", nonce: v.nonce + 1 }))} label="Fit"><Scan /></ToolBtn>
          <ToolBtn on={showGrid} onClick={() => setShowGrid((value) => !value)} label="Grid"><Grid3x3 /></ToolBtn>
          <ViewerTip label="Markers"><button type="button" role="switch" aria-checked={markersOn} onClick={() => setMarkersOn((v) => !v)} className="ml-1 flex min-h-10 items-center gap-2 rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            <MapPin className="h-3.5 w-3.5" />Markers
            <span className={cn("relative h-4 w-7 rounded-full transition-colors", markersOn ? "bg-accent" : "bg-border-strong")}><span className={cn("absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all", markersOn ? "left-3.5" : "left-0.5")} /></span>
          </button></ViewerTip>
          <ToolBtn on={listOpen} onClick={() => setListOpen((v) => !v)} label="List"><List /></ToolBtn>
          {individualParts && <ToolBtn on={partMode} onClick={() => { setPartMode((value) => !value); setSelected(null); setListOpen(false); setIsolate(false); }} label={partMode ? "Parts on" : "Show parts"}><Move3d /></ToolBtn>}
        </div>
      </div>

      <div className="relative h-[340px] sm:h-[460px]" style={{ background: "radial-gradient(ellipse 70% 60% at 50% 45%, #1a2230 0%, #0f141d 60%, #0b0f16 100%)" }}>
        <Viewport parts={shownParts} selectedId={null} onSelect={(id) => { if (id === null) setSelected(null); }} mode="solid" tool="select" showGrid={showGrid} showShadows viewRequest={view}
          onTransform={() => undefined} onReady={() => setReady(true)} pickable={false} highlightIds={highlight} leftMouse={pan ? "pan" : "rotate"} showGizmo
          markers={markers} showMarkers={markersOn} onMarker={(id) => setSelected((cur) => (cur === id ? null : id))} />
        {!ready && <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/60"><Loading /></div>}

        {sel && (
          <div className="absolute left-3 top-3 z-10 w-64 max-w-[calc(100%-24px)] rounded-lg border border-border-strong bg-surface/95 p-3 shadow-[var(--shadow-pop)] backdrop-blur" role="dialog" aria-label={`${sel.name} summary`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2"><ComponentIcon name={sel.name} className="h-4 w-4 text-accent" /><div><p className="text-[13px] font-semibold leading-tight">{sel.name}</p><p className="text-[11px] text-muted-foreground">{sel.total ? `${sel.done} of ${sel.total} documented` : sel.statusLabel}</p></div></div>
              <button type="button" aria-label="Close" onClick={() => setSelected(null)} className="rounded p-0.5 text-muted-foreground hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
            </div>
            {sel.total > 0 && <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${(sel.done / sel.total) * 100}%` }} /></div>}
            {!partMode && <><p className="mt-2.5 text-[11px] text-muted-foreground">Latest documented decision</p>
            <p className="text-[12px] leading-snug">{sel.latestDecision ? <Link href={sel.latestDecision.href ?? `/projects/${projectId}/decisions?open=${sel.latestDecision.id}`} className="hover:text-accent hover:underline">{sel.latestDecision.title}</Link> : <span className="text-warning">None with recorded reasoning</span>}</p></>}
            <div className="mt-2 flex flex-wrap gap-1.5"><Badge tone={sel.reviewTone}>{sel.reviewLabel}</Badge>{sel.statusLabel !== sel.reviewLabel && <Badge tone={sel.statusTone}>{sel.statusLabel}</Badge>}</div>
            <Link href={sel.href} className="mt-3 flex h-8 items-center justify-center gap-1.5 rounded-md bg-accent text-[12px] font-semibold text-white hover:bg-accent/85">Open {partMode ? "part" : "component"} <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        )}

        {noMarkers && ready && (
          <div className="absolute bottom-3 left-3 max-w-xs rounded-md border border-border bg-surface/90 px-3 py-2 text-[11.5px] text-muted-foreground backdrop-blur">
            No component markers placed yet. In the 3D editor, select a part and choose “Place component marker”.
          </div>
        )}
        {listOpen && (
          <div className="absolute right-3 top-3 z-20 w-60 max-w-[calc(100%-24px)] rounded-lg border border-border-strong bg-surface/95 p-1.5 shadow-[var(--shadow-pop)] backdrop-blur">
            <p className="px-2 pb-1 pt-0.5 text-[11px] font-medium text-muted-foreground">{partMode ? "Parts" : "Components"}</p>
            <ul className="max-h-56 overflow-y-auto">{displayed.map((c) => (
              <li key={c.id}><button type="button" onClick={() => { setSelected(c.id); setListOpen(false); }} aria-pressed={c.id === selected} className={cn("flex min-h-10 w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] hover:bg-muted", c.id === selected && "bg-accent-soft text-accent")}>
                <ComponentIcon name={c.name} className="h-3.5 w-3.5" /><span className="flex-1 truncate">{c.name}</span>{c.total > 0 && <span className="tabular-nums text-muted-foreground">{c.done}/{c.total}</span>}</button></li>))}</ul>
          </div>
        )}
        <p className="pointer-events-none absolute bottom-2 left-1/2 hidden -translate-x-1/2 text-[11px] text-muted-foreground/80 sm:block">{pan ? "Drag to pan · right-drag to orbit" : "Drag to orbit · right-drag to pan"} · scroll to zoom</p>
      </div>
      {displayed.length > 0 && (
        <section aria-label="Explore components" className="border-t border-border px-4 py-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-1">
            <h3 className="text-[13px] font-semibold">Explore {partMode ? "parts" : "components"}</h3>
            <p className="text-xs text-muted-foreground">Select {partMode ? "a part" : "a component"} to see its summary.</p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {displayed.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setSelected((current) => current === c.id ? null : c.id)} aria-pressed={c.id === selected}
                  className={cn("flex min-h-12 w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent", c.id === selected ? "border-accent bg-accent-soft" : "border-border bg-background hover:border-border-strong hover:bg-muted")}>
                  <ComponentIcon name={c.name} className="h-4 w-4 shrink-0 text-accent" />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{c.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{c.total ? `${c.done} / ${c.total} documented` : c.statusLabel}</span>
                </button>
                {c.id === selected && <Link href={c.href} className="mt-2 inline-flex items-center gap-1 px-1 text-xs font-medium text-accent hover:underline">Open {c.name} <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Box, ChevronDown, Copy, Cuboid, Download, EyeOff, Folder, Grid3x3, Hexagon, Loader2, Maximize, MousePointer2, Move3d, PanelLeft, PanelRight, Plus, Redo2, RotateCcw, Rotate3d, Save, Scan, Sun, Trash2, Undo2, CircleDot, Cylinder } from "lucide-react";
import { ChatPanel } from "@/components/ai/chat-panel";
import { cn } from "@/lib/utils";
import { act } from "@/lib/client";
import { saveModel, setComponentMarker } from "@/app/actions/model";
import { ancestorIds, deletePart, dimsLabel, duplicatePart, fmt, KIND_LABEL, makePrimitive, validateParts } from "@/lib/cad/ops";
import { boxSize, worldBox } from "@/lib/cad/bounds";
import { createSampleAssembly } from "@/lib/cad/sample";
import type { ChatMessage } from "@/lib/types";
import type { DisplayMode, Part, Tool, Unit, Vec3, ViewPreset } from "@/lib/cad/types";
import { Hierarchy, ProjectPanel, Properties, type Knowledge } from "./panels";
import { IconBtn, Sep } from "./ui";
import type { ViewRequest } from "./viewport";

const Viewport = dynamic(() => import("./viewport"), { ssr: false, loading: () => <ViewportLoading /> });

function ViewportLoading() {
  return <div className="flex h-full items-center justify-center gap-2 text-[12px] text-[var(--c-muted)]"><Loader2 className="h-4 w-4 animate-spin" />Loading 3D viewport…</div>;
}

export interface WorkspaceProps {
  project: { id: string; name: string; description: string; isSample: boolean } | null;   // null = public demo
  initialParts: Part[] | null;                                                              // null = no saved model: use the sample assembly
  knowledge: Knowledge | null;
  aiEnabled: boolean;
  chat: { messages: ChatMessage[]; conversationId: string | null } | null;
}

type Status = "saved" | "unsaved" | "saving" | "error" | "local";

export function Workspace({ project, initialParts, knowledge, aiEnabled, chat }: WorkspaceProps) {
  const subsystems = useMemo(() => (knowledge?.subsystems ?? []).map((s) => ({ id: s.id, name: s.name })), [knowledge]);
  const [markers, setMarkers] = useState<Record<string, Vec3 | null>>(() => Object.fromEntries((knowledge?.subsystems ?? []).map((s) => [s.id, s.marker])));
  const [parts, setPartsState] = useState<Part[]>(() => {
    const base = initialParts ?? createSampleAssembly();
    return base.map((p) => (p.subsystemName && !p.subsystemId ? { ...p, subsystemId: subsystems.find((s) => s.name.toLowerCase() === p.subsystemName!.toLowerCase())?.id ?? null } : p));
  });
  const partsRef = useRef(parts);
  const past = useRef<Part[][]>([]);
  const future = useRef<Part[][]>([]);
  const lastKey = useRef<{ key: string; t: number } | null>(null);
  const [version, setVersion] = useState(0);
  const [savedVersion, setSavedVersion] = useState(0);
  const [histLen, setHistLen] = useState({ undo: 0, redo: 0 });
  const [status, setStatus] = useState<Status>(project && initialParts ? "saved" : "local");
  const [isSample, setIsSample] = useState(!initialParts);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [mode, setModeState] = useState<DisplayMode>("solid");
  const [unit, setUnit] = useState<Unit>("mm");
  const [showGrid, setShowGrid] = useState(true);
  const [showShadows, setShowShadows] = useState(true);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [tab, setTab] = useState<"properties" | "project" | "ai">("properties");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(parts.filter((p) => p.parentId === null && p.kind === "group").map((p) => p.id)));
  const [viewReq, setViewReq] = useState<ViewRequest>({ preset: "iso", nonce: 0, immediate: true });
  const [ready, setReady] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [projMenu, setProjMenu] = useState(false);

  const setMode = setModeState;

  // ── history ──
  const commit = useCallback((next: Part[], key?: string) => {
    const now = Date.now();
    const coalesce = key && lastKey.current?.key === key && now - lastKey.current.t < 900;
    if (!coalesce) { past.current.push(partsRef.current); if (past.current.length > 100) past.current.shift(); }
    lastKey.current = key ? { key, t: now } : null;
    future.current = [];
    partsRef.current = next; setPartsState(next); setVersion((v) => v + 1); setHistLen({ undo: past.current.length, redo: future.current.length });
    setStatus((s) => (s === "local" ? s : "unsaved"));
  }, []);
  const undo = useCallback(() => {
    const prev = past.current.pop(); if (!prev) return;
    future.current.push(partsRef.current); partsRef.current = prev; setPartsState(prev); setVersion((v) => v + 1); setHistLen({ undo: past.current.length, redo: future.current.length }); lastKey.current = null;
    setStatus((s) => (s === "local" ? s : "unsaved"));
    setSelectedId((id) => (id && prev.some((p) => p.id === id) ? id : null));
  }, []);
  const redo = useCallback(() => {
    const nxt = future.current.pop(); if (!nxt) return;
    past.current.push(partsRef.current); partsRef.current = nxt; setPartsState(nxt); setVersion((v) => v + 1); setHistLen({ undo: past.current.length, redo: future.current.length }); lastKey.current = null;
    setStatus((s) => (s === "local" ? s : "unsaved"));
    setSelectedId((id) => (id && nxt.some((p) => p.id === id) ? id : null));
  }, []);
  const canUndo = histLen.undo > 0, canRedo = histLen.redo > 0;

  const update = useCallback((id: string, patch: (p: Part) => Part, key?: string) => commit(partsRef.current.map((p) => (p.id === id ? patch(p) : p)), key), [commit]);
  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) setExpanded((e) => { const n = new Set(e); ancestorIds(partsRef.current, id).forEach((a) => n.add(a)); return n; });
  }, []);
  const toggleVisible = useCallback((id: string) => update(id, (p) => ({ ...p, visible: !p.visible })), [update]);
  const selected = parts.find((p) => p.id === selectedId) ?? null;

  const addPrimitive = (kind: "box" | "cylinder" | "sphere") => {
    const count = partsRef.current.filter((p) => p.kind === kind).length + 1;
    const prim = makePrimitive(kind, count);
    const sel = partsRef.current.find((p) => p.id === selectedId);
    if (sel?.kind === "group") prim.parentId = sel.id;
    commit([...partsRef.current, prim]); select(prim.id); setAddOpen(false);
    toast.success(`Added ${prim.name}`);
  };
  const duplicate = () => { if (!selectedId) return; const r = duplicatePart(partsRef.current, selectedId); commit(r.parts); select(r.newId); };
  const remove = () => {
    if (!selectedId) return;
    const gone = partsRef.current.find((p) => p.id === selectedId);
    commit(deletePart(partsRef.current, selectedId)); setSelectedId(null);
    toast(`Deleted ${gone?.name ?? "part"}`, { action: { label: "Undo", onClick: undo } });
  };
  const placeMarker = async (subsystemId: string, position: Vec3 | null) => {
    const r = await act(setComponentMarker(subsystemId, position), position ? "Marker placed. It now shows on the project hub." : "Marker removed");
    if (r.ok) setMarkers((m) => ({ ...m, [subsystemId]: position }));
  };
  const setView = (preset: ViewPreset | "fit", immediate = false) => setViewReq((r) => ({ preset, nonce: r.nonce + 1, immediate }));

  // ── save / export ──
  const dirty = version !== savedVersion;
  const save = useCallback(async () => {
    if (!project) return;
    setStatus("saving");
    const r = await act(saveModel(project.id, partsRef.current), "Model saved");
    if (r.ok) { setSavedVersion(version); setStatus("saved"); setIsSample(false); } else setStatus("error");
  }, [project, version]);
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ format: "project-memory-model", version: 1, units: "mm", parts: partsRef.current.map(({ subsystemName, ...p }) => { void subsystemName; return p; }) }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${(project?.name ?? "model").replace(/\W+/g, "-")}.json`; a.click(); URL.revokeObjectURL(a.href);
  };
  const importRef = useRef<HTMLInputElement>(null);
  const importJson = async (file: File) => {
    try { const j = JSON.parse(await file.text()); const ps = validateParts(j.parts); if (!ps) throw new Error("not a Project Memory model file"); commit(ps.map((p) => ({ ...p, subsystemName: undefined }))); setSelectedId(null); toast.success(`Imported ${ps.length} parts`); setTimeout(() => setView("iso"), 50); }
    catch (e) { toast.error(`Couldn't import: ${(e as Error).message}`); }
  };

  useEffect(() => { const f = (e: BeforeUnloadEvent) => { if (dirty && project) { e.preventDefault(); } }; window.addEventListener("beforeunload", f); return () => window.removeEventListener("beforeunload", f); }, [dirty, project]);

  // ── keyboard ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input,textarea,select,[contenteditable=true]")) return;
      const mod = e.metaKey || e.ctrlKey; const k = e.key.toLowerCase();
      if (mod && k === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (mod && k === "y") { e.preventDefault(); redo(); }
      else if (mod && k === "s") { e.preventDefault(); void save(); }
      else if (mod && k === "d") { e.preventDefault(); duplicate(); }
      else if (mod) return;
      else if (k === "escape") { setSelectedId(null); setTool("select"); }
      else if (k === "delete" || k === "backspace") remove();
      else if (k === "v") setTool("select"); else if (k === "g") setTool("move"); else if (k === "r") setTool("rotate");
      else if (k === "f") setView("fit"); else if (k === "h" && selectedId) toggleVisible(selectedId);
      else if (k === "1") setView("front"); else if (k === "2") setView("side"); else if (k === "3") setView("top"); else if (k === "4") setView("iso");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onTransform = useCallback((id: string, position: Vec3, rotation: Vec3) => update(id, (p) => ({ ...p, position, rotation })), [update]);
  const prims = parts.filter((p) => p.kind !== "group");
  const anyVisible = useMemo(() => !worldBox(parts).isEmpty(), [parts]);
  const size = useMemo(() => boxSize(worldBox(parts)), [parts]);
  const statusLabel = { saved: "Saved", unsaved: "Unsaved changes", saving: "Saving…", error: "Save failed", local: project ? "Not saved to project" : "Demo · not saved" }[status];

  const hint = tool === "move" ? "Drag a gizmo arrow to move the selected part · V to return to Select" : tool === "rotate" ? "Drag a ring to rotate the selected part · V to return to Select"
    : "Click a part to select · Drag to orbit · Right-drag to pan · Scroll to zoom · F fit · 1–4 views";

  return (
    <div className="cad-root fixed inset-0 flex flex-col bg-[var(--c-bg)]">
      {/* ── Top bar ── */}
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-[var(--c-line)] bg-[var(--c-panel)] px-2.5">
        <IconBtn tip={leftOpen ? "Hide parts panel" : "Show parts panel"} active={leftOpen} onClick={() => setLeftOpen((o) => !o)}><PanelLeft /></IconBtn>
        <Link href={project ? "/projects" : "/"} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-[var(--c-panel2)]" aria-label="Back to projects">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--c-accent)] shadow-[0_0_0_3px_var(--c-accent-soft)]" /><span className="hidden text-[13px] font-semibold sm:inline">Project Memory</span>
        </Link>
        <span className="text-[var(--c-line2)]">/</span>
        <span className="max-w-[28vw] truncate text-[13px] font-medium" title={project?.name ?? "RC Car Design"}>{project?.name ?? "RC Car Design (demo)"}</span>
        <span role="status" className={cn("hidden items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] md:flex", status === "error" ? "border-red-500/40 text-red-300" : status === "unsaved" ? "border-[var(--c-accent)]/40 text-[var(--c-accent)]" : "border-[var(--c-line2)] text-[var(--c-muted)]")}>
          {status === "saving" ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className={cn("h-1.5 w-1.5 rounded-full", status === "saved" ? "bg-emerald-400" : status === "unsaved" ? "bg-[var(--c-accent)]" : status === "error" ? "bg-red-400" : "bg-[var(--c-muted)]")} />}{statusLabel}
        </span>
        <Sep />
        <IconBtn tip="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}><Undo2 /></IconBtn>
        <IconBtn tip="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo}><Redo2 /></IconBtn>
        {project ? (
          <button type="button" onClick={save} disabled={status === "saving" || (!dirty && status === "saved")}
            className="ml-1 flex h-7 items-center gap-1.5 rounded-md bg-[var(--c-accent)] px-3 text-[12px] font-semibold text-[#04121c] transition-opacity hover:opacity-90 disabled:opacity-40">
            {status === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}{isSample ? "Save to project" : "Save"}
          </button>
        ) : <Link href="/login" className="ml-1 flex h-7 items-center rounded-md bg-[var(--c-accent)] px-3 text-[12px] font-semibold text-[#04121c] hover:opacity-90">Sign in to save</Link>}
        <div className="flex-1" />
        <div className="relative">
          <button type="button" onClick={() => setProjMenu((o) => !o)} aria-expanded={projMenu} className="flex h-7 items-center gap-1 rounded-md border border-[var(--c-line2)] px-2.5 text-[12px] hover:bg-[var(--c-panel2)]">Project<ChevronDown className="h-3.5 w-3.5" /></button>
          {projMenu && (<>
            <div className="fixed inset-0 z-40" onClick={() => setProjMenu(false)} />
            <div className="absolute right-0 top-9 z-50 w-56 rounded-lg border border-[var(--c-line2)] bg-[var(--c-panel)] p-1 shadow-2xl" role="menu" onClick={() => setProjMenu(false)}>
              {project && ([["Project overview", `/projects/${project.id}`, false], ["Add research", `/projects/${project.id}/research`, true], ["Record a revision", `/projects/${project.id}/history`, true], ["Document a decision", `/projects/${project.id}/decisions`, true], ["Request a review", `/projects/${project.id}/reviews`, true], ["Generate documentation", `/projects/${project.id}/docs`, true], ["Open handoff", `/projects/${project.id}/handoff`, true]] as const).map(([l, h, nw]) => (
                <Link key={l} role="menuitem" href={h} target={nw ? "_blank" : undefined} className="block rounded-md px-2.5 py-1.5 text-[12.5px] hover:bg-[var(--c-panel2)]">{l}</Link>))}
              {project && <div className="my-1 border-t border-[var(--c-line)]" />}
              <button role="menuitem" onClick={exportJson} className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12.5px] hover:bg-[var(--c-panel2)]"><Download className="h-3.5 w-3.5" />Export model (JSON)</button>
              <button role="menuitem" onClick={() => importRef.current?.click()} className="w-full rounded-md px-2.5 py-1.5 text-left text-[12.5px] hover:bg-[var(--c-panel2)]">Import model (JSON)…</button>
              <button role="menuitem" onClick={() => { commit(createSampleAssembly().map((p) => ({ ...p, subsystemId: subsystems.find((s) => s.name.toLowerCase() === p.subsystemName?.toLowerCase())?.id ?? null }))); setSelectedId(null); setIsSample(true); setTimeout(() => setView("iso"), 50); }} className="w-full rounded-md px-2.5 py-1.5 text-left text-[12.5px] hover:bg-[var(--c-panel2)]">Replace with sample assembly</button>
            </div></>)}
          <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importJson(f); e.target.value = ""; }} />
        </div>
        <IconBtn tip={rightOpen ? "Hide inspector" : "Show inspector"} active={rightOpen} onClick={() => setRightOpen((o) => !o)}><PanelRight /></IconBtn>
      </header>

      {/* ── Body ── */}
      <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: `${leftOpen ? 216 : 0}px minmax(0,1fr) ${rightOpen ? 296 : 0}px` }}>
        <aside className={cn("min-w-0 overflow-hidden border-r border-[var(--c-line)] bg-[var(--c-panel)]", !leftOpen && "invisible border-r-0")} aria-label="Parts" inert={!leftOpen}>
          <div className="flex h-full w-[216px] flex-col">
            <div className="flex h-9 items-center justify-between border-b border-[var(--c-line)] px-3"><h2 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--c-muted)]">Parts</h2><span className="text-[11px] tabular-nums text-[var(--c-muted)]">{prims.length}</span></div>
            <div className="min-h-0 flex-1"><Hierarchy parts={parts} selectedId={selectedId} onSelect={select} onToggleVisible={toggleVisible} expanded={expanded} setExpanded={setExpanded} /></div>
          </div>
        </aside>

        {/* Viewport */}
        <main className="relative min-w-0 overflow-hidden" style={{ background: "radial-gradient(ellipse 70% 60% at 50% 45%, #1a212c 0%, #0e1218 60%, #0a0d12 100%)" }} aria-label="3D viewport">
          <div className="absolute inset-0"><Viewport parts={parts} selectedId={selectedId} onSelect={select} mode={mode} tool={tool} showGrid={showGrid} showShadows={showShadows} viewRequest={viewReq} onTransform={onTransform} onReady={() => setReady(true)} /></div>
          {!ready && <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[var(--c-bg)]/60"><ViewportLoading /></div>}

          {/* compact toolbar */}
          <div className="absolute left-1/2 top-2.5 z-20 max-w-[calc(100%-16px)] -translate-x-1/2">
            <div className="scroll-thin flex items-center gap-0.5 overflow-x-auto rounded-xl border border-[var(--c-line2)] bg-[var(--c-panel)]/92 p-1 shadow-xl backdrop-blur" role="toolbar" aria-label="Viewport tools">
              <IconBtn tip="Select (V)" active={tool === "select"} onClick={() => setTool("select")}><MousePointer2 /></IconBtn>
              <IconBtn tip="Move (G)" active={tool === "move"} disabled={!selected} onClick={() => setTool("move")}><Move3d /></IconBtn>
              <IconBtn tip="Rotate (R)" active={tool === "rotate"} disabled={!selected} onClick={() => setTool("rotate")}><Rotate3d /></IconBtn>
              <Sep />
              <div className="relative">
                <IconBtn tip="Add primitive" onClick={() => setAddOpen((o) => !o)} active={addOpen}><Plus /><ChevronDown className="!h-3 !w-3" /></IconBtn>
                {addOpen && (<>
                  <div className="fixed inset-0 z-30" onClick={() => setAddOpen(false)} />
                  <div className="absolute left-0 top-9 z-40 w-36 rounded-lg border border-[var(--c-line2)] bg-[var(--c-panel)] p-1 shadow-2xl" role="menu">
                    {([["box", Box], ["cylinder", Cylinder], ["sphere", CircleDot]] as const).map(([k, I]) => <button key={k} role="menuitem" onClick={() => addPrimitive(k)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] hover:bg-[var(--c-panel2)]"><I className="h-3.5 w-3.5" />{KIND_LABEL[k]}</button>)}
                  </div></>)}
              </div>
              <IconBtn tip="Duplicate (Ctrl+D)" disabled={!selected} onClick={duplicate}><Copy /></IconBtn>
              <IconBtn tip="Hide selected (H)" disabled={!selected} onClick={() => selectedId && toggleVisible(selectedId)}><EyeOff /></IconBtn>
              <IconBtn tip="Delete (Del)" disabled={!selected} onClick={remove}><Trash2 /></IconBtn>
              <Sep />
              <IconBtn tip="Solid" active={mode === "solid"} onClick={() => setMode("solid")}><Cuboid /></IconBtn>
              <IconBtn tip="Solid with edges" active={mode === "edges"} onClick={() => setMode("edges")}><Box /></IconBtn>
              <IconBtn tip="Wireframe" active={mode === "wireframe"} onClick={() => setMode("wireframe")}><Hexagon /></IconBtn>
              <Sep />
              {([["front", "Front (1)"], ["side", "Side (2)"], ["top", "Top (3)"], ["iso", "Isometric (4)"]] as const).map(([v, tip]) => (
                <IconBtn key={v} tip={`${tip}`} onClick={() => setView(v)} className="px-2 text-[11.5px] font-medium">{v === "iso" ? "Iso" : v[0].toUpperCase() + v.slice(1)}</IconBtn>))}
              <IconBtn tip="Fit to view (F)" onClick={() => setView("fit")}><Scan /></IconBtn>
              <IconBtn tip="Reset camera" onClick={() => setView("iso")}><RotateCcw /></IconBtn>
              <Sep />
              <IconBtn tip="Ground grid" active={showGrid} onClick={() => setShowGrid((g) => !g)}><Grid3x3 /></IconBtn>
              <IconBtn tip="Shadows" active={showShadows} onClick={() => setShowShadows((s) => !s)}><Sun /></IconBtn>
            </div>
          </div>

          {isSample && (
            <div className="absolute left-3 top-14 z-10 flex max-w-[260px] items-start gap-2 rounded-lg border border-[var(--c-line2)] bg-[var(--c-panel)]/90 px-3 py-2 text-[11.5px] leading-snug backdrop-blur">
              <Maximize className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--c-accent)]" />
              <span><b className="font-semibold">Sample assembly.</b> <span className="text-[var(--c-muted)]">Illustrative RC buggy, not a real design. {project ? "Edit it, then Save to project to keep it." : "Sign in to save your own."}</span></span>
            </div>)}

          {ready && !anyVisible && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="rounded-xl border border-[var(--c-line2)] bg-[var(--c-panel)] p-6 text-center shadow-2xl">
                <Folder className="mx-auto h-6 w-6 text-[var(--c-muted)]" />
                <p className="mt-2 text-[13px] font-semibold">{prims.length ? "Every part is hidden" : "This model is empty"}</p>
                <p className="mt-1 max-w-xs text-[12px] text-[var(--c-muted)]">{prims.length ? "Turn visibility back on in the Parts panel." : "Add a primitive from the toolbar, import a model, or start from the sample assembly."}</p>
                <div className="mt-3 flex justify-center gap-2">
                  {!prims.length && <button onClick={() => addPrimitive("box")} className="rounded-md bg-[var(--c-accent)] px-3 py-1.5 text-[12px] font-semibold text-[#04121c]">Add a box</button>}
                  <button onClick={() => { commit(createSampleAssembly()); setIsSample(true); setTimeout(() => setView("iso"), 50); }} className="rounded-md border border-[var(--c-line2)] px-3 py-1.5 text-[12px] hover:bg-[var(--c-panel2)]">Load sample assembly</button>
                </div>
              </div>
            </div>)}
        </main>

        <aside className={cn("min-w-0 overflow-hidden border-l border-[var(--c-line)] bg-[var(--c-panel)]", !rightOpen && "invisible border-l-0")} aria-label="Inspector" inert={!rightOpen}>
          <div className="flex h-full w-[296px] flex-col">
            <div className="flex h-9 shrink-0 border-b border-[var(--c-line)]" role="tablist">
              {([["properties", selected ? "Properties" : "Settings"], ["project", "Knowledge"], ["ai", "Ask AI"]] as const).map(([id, label]) => (
                <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                  className={cn("flex-1 border-b-2 px-2 text-[11.5px] font-medium transition-colors", tab === id ? "border-[var(--c-accent)] text-[var(--c-text)]" : "border-transparent text-[var(--c-muted)] hover:text-[var(--c-text)]")}>{label}</button>))}
            </div>
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
              {tab === "properties" && <Properties parts={parts} selectedId={selectedId} unit={unit} update={update} onToggleVisible={toggleVisible} subsystems={subsystems} markers={project ? markers : undefined} onPlaceMarker={project ? placeMarker : undefined}
                project={{ name: project?.name ?? "RC Car Design (demo)", description: project?.description, mode, setMode, setUnit, showGrid, setShowGrid, showShadows, setShowShadows, isSample }} />}
              {tab === "project" && (knowledge ? <ProjectPanel k={knowledge} subsystemId={selected?.subsystemId ?? null} /> : <Empty>Open a saved project to see its research, decisions, revisions and reviews here.</Empty>)}
              {tab === "ai" && (project && chat ? (
                <div className="h-full p-2.5"><ChatPanel projectId={project.id} projectName={project.name} aiEnabled={aiEnabled} initialMessages={chat.messages} initialConversationId={chat.conversationId} height="h-full" compact
                  suggestions={["Why did we change the suspension design?", "What should I work on next?", "Which decisions are undocumented?"]} /></div>
              ) : <Empty>The project assistant answers from a project&apos;s documented history. <Link href="/login" className="text-[var(--c-accent)] underline">Sign in</Link> and open a project to use it.</Empty>)}
            </div>
          </div>
        </aside>
      </div>

      {/* ── Status bar ── */}
      <footer className="flex h-7 shrink-0 items-center gap-3 border-t border-[var(--c-line)] bg-[var(--c-panel)] px-3 text-[11.5px] text-[var(--c-muted)]">
        <label className="flex items-center gap-1">Units
          <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} aria-label="Display units" className="rounded bg-[var(--c-bg)] px-1 py-0.5 text-[11.5px] text-[var(--c-text)] outline-none">
            <option value="mm">mm</option><option value="cm">cm</option><option value="in">in</option></select></label>
        <span className="h-3 w-px bg-[var(--c-line2)]" />
        <span className="min-w-0 truncate text-[var(--c-text)]" aria-live="polite">
          {selected ? <>{selected.name} <span className="text-[var(--c-muted)]">· {KIND_LABEL[selected.kind]}{selected.kind !== "group" && ` · ${dimsLabel(selected, unit)}`}{!selected.visible && " · hidden"}</span></> : <span className="text-[var(--c-muted)]">Nothing selected{size && ` · model ${fmt(size[0], unit)} × ${fmt(size[1], unit)} × ${fmt(size[2], unit)} ${unit}`}</span>}
        </span>
        <span className="ml-auto hidden truncate lg:block">{hint}</span>
      </footer>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="p-5 text-center text-[12px] leading-relaxed text-[var(--c-muted)]">{children}</div>;
}

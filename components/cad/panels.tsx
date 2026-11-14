"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BookOpen, Box, ChevronRight, ClipboardCheck, Circle, Cylinder, Eye, EyeOff, FileText, Folder, GitCommitHorizontal, Scale, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { boxSize, worldBox } from "@/lib/cad/bounds";
import { KIND_LABEL, childrenOf, fmt, fromUnit, toUnit, totalVolume, volumeMm3 } from "@/lib/cad/ops";
import type { DisplayMode, Part, Unit } from "@/lib/cad/types";
import { Group, NumField, Seg, Toggle } from "./ui";

const KindIcon = ({ kind, className }: { kind: Part["kind"]; className?: string }) =>
  kind === "group" ? <Folder className={className} /> : kind === "box" ? <Box className={className} /> : kind === "cylinder" ? <Cylinder className={className} /> : <Circle className={className} />;

// ───────────────────────── Hierarchy ─────────────────────────
export function Hierarchy({ parts, selectedId, onSelect, onToggleVisible, expanded, setExpanded }: {
  parts: Part[]; selectedId: string | null; onSelect: (id: string) => void; onToggleVisible: (id: string) => void; expanded: Set<string>; setExpanded: (s: Set<string>) => void;
}) {
  const [q, setQ] = useState("");
  const selRef = useRef<HTMLDivElement>(null);
  useEffect(() => { selRef.current?.scrollIntoView({ block: "nearest" }); }, [selectedId]);
  const matches = useMemo(() => {
    if (!q.trim()) return null;
    const ql = q.toLowerCase();
    const hit = new Set<string>();
    const byId = new Map(parts.map((p) => [p.id, p]));
    parts.filter((p) => p.name.toLowerCase().includes(ql)).forEach((p) => { let cur: Part | undefined = p; while (cur) { hit.add(cur.id); cur = cur.parentId ? byId.get(cur.parentId) : undefined; } });
    return hit;
  }, [q, parts]);

  const row = (p: Part, depth: number, parentHidden: boolean): React.ReactNode => {
    if (matches && !matches.has(p.id)) return null;
    const kids = childrenOf(parts, p.id);
    const open = matches ? true : expanded.has(p.id);
    const hidden = !p.visible || parentHidden;
    const sel = p.id === selectedId;
    return (
      <div key={p.id}>
        <div ref={sel ? selRef : undefined} role="treeitem" aria-selected={sel} aria-expanded={kids.length ? open : undefined}
          className={cn("group flex h-7 cursor-pointer items-center gap-1 rounded-md pr-1 text-[12px]", sel ? "bg-[var(--c-accent-soft)] text-[var(--c-accent)]" : "hover:bg-[var(--c-panel2)]", hidden && !sel && "text-[var(--c-muted)]/70")}
          style={{ paddingLeft: 4 + depth * 14 }} onClick={() => onSelect(p.id)}>
          <button type="button" aria-label={open ? "Collapse" : "Expand"} tabIndex={-1} className={cn("flex h-5 w-5 items-center justify-center rounded hover:bg-[var(--c-line)]", !kids.length && "invisible")}
            onClick={(e) => { e.stopPropagation(); const n = new Set(expanded); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); setExpanded(n); }}>
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
          </button>
          <KindIcon kind={p.kind} className="h-3.5 w-3.5 shrink-0 opacity-80" />
          <span className="min-w-0 flex-1 truncate">{p.name}</span>
          {kids.length > 0 && <span className="text-[10px] text-[var(--c-muted)]">{kids.length}</span>}
          <button type="button" aria-label={p.visible ? `Hide ${p.name}` : `Show ${p.name}`} aria-pressed={!p.visible} onClick={(e) => { e.stopPropagation(); onToggleVisible(p.id); }}
            className={cn("flex h-5 w-5 items-center justify-center rounded hover:bg-[var(--c-line)]", p.visible ? "opacity-0 group-hover:opacity-100 focus-visible:opacity-100" : "text-[var(--c-muted)]")}>
            {p.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
        </div>
        {open && kids.map((k) => row(k, depth + 1, hidden))}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-[var(--c-line)] p-2.5">
        <div className="relative"><Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-[var(--c-muted)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter parts" aria-label="Filter parts"
            className="h-7 w-full rounded-md border border-[var(--c-line)] bg-[var(--c-bg)] pl-7 pr-2 text-[12px] outline-none placeholder:text-[var(--c-muted)] focus:border-[var(--c-accent)]" /></div>
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-1.5" role="tree" aria-label="Model hierarchy">
        {parts.length === 0 ? <p className="px-3 py-6 text-center text-[12px] text-[var(--c-muted)]">No parts yet. Add a primitive from the toolbar.</p>
          : matches && matches.size === 0 ? <p className="px-3 py-6 text-center text-[12px] text-[var(--c-muted)]">No parts match “{q}”.</p>
          : childrenOf(parts, null).map((p) => row(p, 0, false))}
      </div>
    </div>
  );
}

// ───────────────────────── Properties ─────────────────────────
const SWATCHES = ["#b9c2cd", "#8b95a3", "#22262d", "#303641", "#3b78c4", "#b87333", "#d9dee6", "#c0392b"];

export function Properties({ parts, selectedId, unit, update, onToggleVisible, subsystems, project }: {
  parts: Part[]; selectedId: string | null; unit: Unit;
  update: (id: string, patch: (p: Part) => Part, key?: string, label?: string) => void; onToggleVisible: (id: string) => void;
  subsystems: { id: string; name: string }[];
  project: { name: string; mode: DisplayMode; setMode: (m: DisplayMode) => void; setUnit: (u: Unit) => void; showGrid: boolean; setShowGrid: (v: boolean) => void; showShadows: boolean; setShowShadows: (v: boolean) => void; isSample: boolean; description?: string };
}) {
  const p = parts.find((x) => x.id === selectedId);
  const size = useMemo(() => boxSize(worldBox(parts, p?.id)), [parts, p?.id]);
  const U = (mm: number) => toUnit(mm, unit);
  const F = (v: number) => fromUnit(v, unit);
  const step = unit === "mm" ? 1 : unit === "cm" ? 0.1 : 0.05;

  if (!p) {
    const prims = parts.filter((x) => x.kind !== "group");
    return (
      <div>
        <Group title="Project">
          <p className="text-[13px] font-semibold text-[var(--c-text)]">{project.name}</p>
          {project.description && <p className="line-clamp-3 text-[11.5px] leading-relaxed text-[var(--c-muted)]">{project.description}</p>}
          {project.isSample && <p className="rounded-md bg-[var(--c-accent-soft)] px-2 py-1.5 text-[11px] text-[var(--c-accent)]">Showing the built-in sample assembly. Edit it freely, then save it to this project.</p>}
        </Group>
        <Group title="Display">
          <div className="space-y-2">
            <Seg value={project.mode} onChange={project.setMode} options={[{ value: "solid", label: "Solid" }, { value: "edges", label: "Edges" }, { value: "wireframe", label: "Wire" }]} />
            <Toggle label="Ground grid" checked={project.showGrid} onChange={project.setShowGrid} />
            <Toggle label="Shadows" checked={project.showShadows} onChange={project.setShowShadows} />
          </div>
        </Group>
        <Group title="Units">
          <Seg value={unit} onChange={project.setUnit} options={[{ value: "mm", label: "mm" }, { value: "cm", label: "cm" }, { value: "in", label: "in" }]} />
          <p className="text-[11px] text-[var(--c-muted)]">Display only. Geometry is stored in millimetres.</p>
        </Group>
        <Group title="Model">
          <Stat label="Parts" value={`${prims.length} primitives · ${parts.length - prims.length} groups`} />
          {size && <Stat label="Overall size" value={`${fmt(size[0], unit)} × ${fmt(size[1], unit)} × ${fmt(size[2], unit)} ${unit}`} />}
          <Stat label="Σ primitive volume" value={`${(totalVolume(parts) / 1000).toFixed(1)} cm³`} />
          <p className="pt-1 text-[11px] leading-relaxed text-[var(--c-muted)]">Volumes are summed per primitive; overlapping parts are counted twice. This is a primitive-based model, not a solid-modelling kernel.</p>
        </Group>
      </div>
    );
  }

  const set = (patch: Partial<Part>, key: string, label?: string) => update(p.id, (x) => ({ ...x, ...patch }), key, label);
  const setParam = (k: string, mm: number) => set({ params: { ...p.params, [k]: Math.max(0.1, mm) } }, `${p.id}:param:${k}`);
  const setPos = (i: number, mm: number) => { const v = [...p.position] as Part["position"]; v[i] = mm; set({ position: v }, `${p.id}:pos:${i}`); };
  const setRot = (i: number, d: number) => { const v = [...p.rotation] as Part["rotation"]; v[i] = d; set({ rotation: v }, `${p.id}:rot:${i}`); };
  const setMat = (patch: Partial<Part["material"]>, k: string) => set({ material: { ...p.material, ...patch } }, `${p.id}:mat:${k}`);
  const dimFields: { k: string; label: string }[] = p.kind === "box" ? [{ k: "w", label: "W" }, { k: "h", label: "H" }, { k: "d", label: "D" }] : p.kind === "cylinder" ? [{ k: "r", label: "R" }, { k: "h", label: "H" }] : p.kind === "sphere" ? [{ k: "r", label: "R" }] : [];

  return (
    <div>
      <Group title={KIND_LABEL[p.kind]} action={<button type="button" onClick={() => onToggleVisible(p.id)} className="flex items-center gap-1 text-[11px] text-[var(--c-muted)] hover:text-[var(--c-text)]">{p.visible ? <><Eye className="h-3.5 w-3.5" />Visible</> : <><EyeOff className="h-3.5 w-3.5" />Hidden</>}</button>}>
        <input key={p.id} defaultValue={p.name} aria-label="Part name" maxLength={120}
          onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== p.name) set({ name: v }, `${p.id}:name`, "Rename"); else e.target.value = p.name; }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="h-8 w-full rounded-md border border-[var(--c-line)] bg-[var(--c-bg)] px-2 text-[13px] font-medium outline-none focus:border-[var(--c-accent)]" />
        {subsystems.length > 0 && (
          <label className="flex items-center justify-between gap-2 pt-1 text-[11.5px] text-[var(--c-muted)]">Subsystem
            <select value={p.subsystemId ?? ""} onChange={(e) => set({ subsystemId: e.target.value || null }, `${p.id}:sub`, "Assign subsystem")}
              className="h-7 max-w-[150px] rounded-md border border-[var(--c-line)] bg-[var(--c-bg)] px-1.5 text-[12px] text-[var(--c-text)] outline-none focus:border-[var(--c-accent)]">
              <option value="">None</option>{subsystems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></label>)}
      </Group>

      {dimFields.length > 0 && (
        <Group title={`Dimensions (${unit})`}>
          <div className={cn("grid gap-1.5", dimFields.length === 3 ? "grid-cols-3" : dimFields.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
            {dimFields.map((f) => <NumField key={f.k} label={f.label} value={U(p.params[f.k])} step={step} min={0.001} onChange={(v) => setParam(f.k, F(v))} />)}
          </div>
          {p.kind !== "box" && <p className="text-[11px] text-[var(--c-muted)]">R = radius · diameter {fmt(p.params.r * 2, unit)} {unit}</p>}
        </Group>)}

      <Group title={`Position (${unit})`}>
        <div className="grid grid-cols-3 gap-1.5">{["X", "Y", "Z"].map((a, i) => <NumField key={a} label={a} value={U(p.position[i])} step={step} onChange={(v) => setPos(i, F(v))} />)}</div>
        <p className="text-[11px] text-[var(--c-muted)]">Relative to {p.parentId ? "parent group" : "origin"}</p>
      </Group>
      <Group title="Rotation (°)">
        <div className="grid grid-cols-3 gap-1.5">{["X", "Y", "Z"].map((a, i) => <NumField key={a} label={a} value={p.rotation[i]} step={5} onChange={(v) => setRot(i, v)} />)}</div>
      </Group>

      {p.kind !== "group" && (
        <Group title="Material">
          <div className="flex items-center gap-2">
            <input type="color" aria-label="Color" value={p.material.color} onChange={(e) => setMat({ color: e.target.value }, "color")} className="h-7 w-9 shrink-0" />
            <input aria-label="Hex color" key={p.material.color} defaultValue={p.material.color} onBlur={(e) => { const v = e.target.value.trim(); if (/^#[0-9a-fA-F]{6}$/.test(v)) setMat({ color: v }, "color"); else e.target.value = p.material.color; }}
              className="h-7 min-w-0 flex-1 rounded-md border border-[var(--c-line)] bg-[var(--c-bg)] px-2 font-mono text-[12px] uppercase outline-none focus:border-[var(--c-accent)]" />
          </div>
          <div className="flex gap-1.5 py-0.5">{SWATCHES.map((c) => <button key={c} type="button" aria-label={`Set color ${c}`} onClick={() => setMat({ color: c }, "color")} className={cn("h-4.5 w-4.5 rounded-full border", p.material.color.toLowerCase() === c ? "border-[var(--c-accent)]" : "border-[var(--c-line2)]")} style={{ background: c, width: 18, height: 18 }} />)}</div>
          {([["metalness", "Metalness"], ["roughness", "Roughness"], ["opacity", "Opacity"]] as const).map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-[11.5px] text-[var(--c-muted)]"><span className="w-[62px]">{label}</span>
              <input type="range" min={k === "opacity" ? 0.05 : 0} max={1} step={0.01} value={p.material[k]} onChange={(e) => setMat({ [k]: Number(e.target.value) }, k)} className="h-1 min-w-0 flex-1" aria-label={label} />
              <span className="w-8 text-right tabular-nums text-[var(--c-text)]">{p.material[k].toFixed(2)}</span></label>))}
        </Group>)}

      <Group title="Measurements">
        {size && <Stat label="Bounding box" value={`${fmt(size[0], unit)} × ${fmt(size[1], unit)} × ${fmt(size[2], unit)} ${unit}`} />}
        {p.kind !== "group" ? <Stat label="Volume" value={`${(volumeMm3(p) / 1000).toFixed(2)} cm³`} /> : <><Stat label="Children" value={String(childrenOf(parts, p.id).length)} /><Stat label="Σ child volume" value={`${(totalVolume(parts, p.id) / 1000).toFixed(1)} cm³`} /></>}
      </Group>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="flex items-baseline justify-between gap-3 text-[12px]"><span className="text-[var(--c-muted)]">{label}</span><span className="text-right tabular-nums">{value}</span></div>;
}

// ───────────────────────── Project knowledge ─────────────────────────
export interface Knowledge {
  projectId: string; subsystems: { id: string; name: string }[];
  research: { id: string; title: string; subsystemId: string | null }[]; decisions: { id: string; title: string; subsystemId: string | null; status: string; documented: boolean }[];
  revisions: { id: string; label: string; title: string; subsystemId: string | null }[]; reviews: { id: string; title: string; status: string; subsystemId: string | null }[];
  files: { id: string; name: string; subsystemId: string | null }[]; openIssues: number; docs: number;
}

export function ProjectPanel({ k, subsystemId }: { k: Knowledge; subsystemId: string | null }) {
  const sub = k.subsystems.find((s) => s.id === subsystemId);
  const f = <T extends { subsystemId: string | null }>(xs: T[]) => (subsystemId ? xs.filter((x) => x.subsystemId === subsystemId) : xs);
  const base = `/projects/${k.projectId}`;
  const sections: { title: string; icon: React.ReactNode; href: string; items: { id: string; label: string; flag?: boolean }[]; empty: string; open: (id: string) => string }[] = [
    { title: "Research", icon: <BookOpen />, href: `${base}/research`, items: f(k.research).map((x) => ({ id: x.id, label: x.title })), empty: "No research linked", open: (id) => `${base}/research?open=${id}` },
    { title: "Design decisions", icon: <Scale />, href: `${base}/decisions`, items: f(k.decisions).map((x) => ({ id: x.id, label: x.title, flag: !x.documented })), empty: "No decisions recorded", open: (id) => `${base}/decisions?open=${id}` },
    { title: "Design history", icon: <GitCommitHorizontal />, href: `${base}/history`, items: f(k.revisions).map((x) => ({ id: x.id, label: `${x.label} · ${x.title}` })), empty: "No revisions recorded", open: (id) => `${base}/history?open=${id}` },
    { title: "Reviews", icon: <ClipboardCheck />, href: `${base}/reviews`, items: f(k.reviews).map((x) => ({ id: x.id, label: `${x.title} (${x.status.replace("_", " ")})` })), empty: "No reviews", open: (id) => `${base}/reviews?open=${id}` },
    { title: "Files", icon: <FileText />, href: `${base}/files`, items: f(k.files).map((x) => ({ id: x.id, label: x.name })), empty: "No files", open: (id) => `${base}/files?open=${id}` },
  ];
  return (
    <div>
      <div className="border-b border-[var(--c-line)] px-3.5 py-3 text-[12px]">
        <p className="font-semibold">{sub ? `Linked to ${sub.name}` : "Whole project"}</p>
        <p className="mt-0.5 text-[11.5px] text-[var(--c-muted)]">{sub ? "Records tagged with this part's subsystem." : "Select a part to see the knowledge tied to its subsystem."} Links open in a new tab so the workspace stays put.</p>
        <div className="mt-2 flex gap-3 text-[11.5px]"><span><b className="tabular-nums">{k.openIssues}</b> <span className="text-[var(--c-muted)]">open issues</span></span><span><b className="tabular-nums">{k.docs}</b> <span className="text-[var(--c-muted)]">documents</span></span></div>
      </div>
      {sections.map((s) => (
        <section key={s.title} className="border-b border-[var(--c-line)] px-3.5 py-3">
          <div className="mb-1.5 flex items-center justify-between"><h4 className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--c-muted)] [&_svg]:h-3.5 [&_svg]:w-3.5">{s.icon}{s.title} <span className="font-normal tabular-nums">{s.items.length}</span></h4>
            <Link href={s.href} target="_blank" className="text-[11px] text-[var(--c-accent)] hover:underline">Open</Link></div>
          {s.items.length === 0 ? <p className="text-[11.5px] text-[var(--c-muted)]">{s.empty}</p> : (
            <ul className="space-y-0.5">{s.items.slice(0, 5).map((it) => <li key={it.id}><Link href={s.open(it.id)} target="_blank" className="flex items-start gap-1.5 rounded px-1 py-0.5 text-[12px] hover:bg-[var(--c-panel2)]"><span className="min-w-0 flex-1 truncate">{it.label}</span>{it.flag && <span title="No reasoning or evidence recorded"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--c-accent)]" /></span>}</Link></li>)}
              {s.items.length > 5 && <li><Link href={s.href} target="_blank" className="px-1 text-[11px] text-[var(--c-muted)] hover:text-[var(--c-text)]">+{s.items.length - 5} more</Link></li>}</ul>)}
        </section>))}
      <div className="grid grid-cols-2 gap-2 px-3.5 py-3 text-[12px]">
        {[["Project overview", base], ["Handoff", `${base}/handoff`], ["Documentation", `${base}/docs`], ["Subsystems", `${base}/subsystems`]].map(([l, h]) => <Link key={l} href={h} target={l === "Project overview" ? undefined : "_blank"} className="rounded-md border border-[var(--c-line)] px-2.5 py-1.5 text-center hover:border-[var(--c-accent)] hover:text-[var(--c-accent)]">{l}</Link>)}
      </div>
    </div>
  );
}

"use client";
import { notifyAnonymousAiLimit } from "@/lib/ai/anonymous-limit-notice";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Download, FileText, Loader2, Pencil, RefreshCw, Save, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge, SampleBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ConfirmDialog, EmptyState, SetupNotice } from "@/components/ui/misc";
import { DOC_TYPES } from "@/lib/ai/prompts";
import { act } from "@/lib/client";
import { refHref } from "@/lib/links";
import { exportDocPdf } from "@/lib/pdf-export";
import { deleteDocument, saveDocument } from "@/app/actions/knowledge";
import { formatDate } from "@/lib/utils";
import type { DocSection, GeneratedDoc } from "@/lib/types";
import type { Scope } from "@/lib/scope";
import { useProjectPermissions } from "@/components/shell/project-permissions";
import { useOpenParam } from "./common";

const STATUS = {
  confirmed: { label: "Documented", tone: "success" as const, icon: CheckCircle2 },
  partial: { label: "Partially documented", tone: "warning" as const, icon: AlertTriangle },
  missing: { label: "Not documented", tone: "danger" as const, icon: AlertTriangle },
};

interface Draft { id: string | null; docType: string; title: string; sections: DocSection[]; params: Record<string, unknown>; projectId: string; dirty: boolean }

export function DocsView({ scope, projectId, aiEnabled }: { scope: Scope; projectId?: string; aiEnabled: boolean }) {
  const router = useRouter();
  const { canWrite } = useProjectPermissions();
  const writableProjects = scope.projects.filter((p) => canWrite(p.id));
  const [open, setOpen] = useOpenParam();
  const [pid, setPid] = useState(projectId ?? writableProjects[0]?.id ?? "");
  const [docType, setDocType] = useState("one_pager");
  const [subIds, setSubIds] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pick, setPick] = useState<{ decisions: string[]; research: string[]; revisions: string[]; reviews: string[] }>({ decisions: [], research: [], revisions: [], reviews: [] });
  const [guidance, setGuidance] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; setup?: boolean } | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [del, setDel] = useState<GeneratedDoc | null>(null);

  const subs = scope.subsystems.filter((s) => s.project_id === pid);
  const saved = scope.docs.filter((d) => !projectId || d.project_id === projectId);
  const opened = saved.find((d) => d.id === open);

  const selection = () => ({
    subsystemIds: subIds, decisionIds: pick.decisions, researchIds: pick.research, revisionIds: pick.revisions, reviewIds: pick.reviews, dateFrom: from || null, dateTo: to || null,
  });
  const toggle = (key: keyof typeof pick, id: string) => setPick((p) => ({ ...p, [key]: p[key].includes(id) ? p[key].filter((x) => x !== id) : [...p[key], id] }));

  async function generate() {
    setError(null); setBusy(true);
    try {
      const res = await fetch("/api/ai/generate-doc", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId: pid, docType, selection: selection(), guidance: guidance || undefined }) });
      const j = await res.json();
      notifyAnonymousAiLimit(res);
      if (!res.ok) { setError({ text: j.error ?? "Generation failed", setup: j.code === "not_configured" }); return; }
      setDraft({ id: null, docType, title: j.title, sections: j.sections, params: { selection: selection(), guidance }, projectId: pid, dirty: true });
      toast.success("Draft generated — review it, edit anything, then save it to the project.");
    } catch { setError({ text: "Couldn't reach the AI service." }); } finally { setBusy(false); }
  }

  const openSaved = (d: GeneratedDoc) => setDraft({ id: d.id, docType: d.doc_type, title: d.title, sections: d.sections, params: d.params, projectId: d.project_id, dirty: false });
  const [lastOpen, setLastOpen] = useState<string | null>(null);
  if (opened && lastOpen !== opened.id) { setLastOpen(opened.id); openSaved(opened); }

  return (
    <div className="space-y-8">
      {!draft && (projectId ? canWrite(projectId) : writableProjects.length > 0) && (
        <Card>
          <CardHeader title="Generate documentation" description="Written by AI from the records you select — nothing else. Missing information is flagged, never filled in." />
          <div className="space-y-5 p-5">
            {!aiEnabled && <SetupNotice title="AI documentation needs an Anthropic key">Set <code>ANTHROPIC_API_KEY</code> in your environment and restart. Saved documents below stay available.</SetupNotice>}
            <div className="grid gap-4 sm:grid-cols-2">
              {!projectId && <Field label="Project"><Select value={pid} onChange={(e) => { setPid(e.target.value); setSubIds([]); setPick({ decisions: [], research: [], revisions: [], reviews: [] }); }}>{writableProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>}
              <Field label="Document type"><Select value={docType} onChange={(e) => setDocType(e.target.value)}>{Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">Sections: {DOC_TYPES[docType].sections.map((s) => s.title).join(" · ")}</p>
            <Field label="Subsystems" hint="Leave all unselected to include the whole project.">
              <div className="flex flex-wrap gap-1.5">{subs.length === 0 ? <span className="text-xs text-muted-foreground">No subsystems.</span> : subs.map((s) => <button key={s.id} type="button" aria-pressed={subIds.includes(s.id)} onClick={() => setSubIds((p) => p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id])} className={`rounded-md border px-2.5 py-1 text-xs font-medium ${subIds.includes(s.id) ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-foreground hover:bg-muted"}`}>{s.name}</button>)}</div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="From date"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field><Field label="To date"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field></div>
            <button type="button" className="text-xs font-medium text-accent hover:underline" onClick={() => setShowAdvanced((s) => !s)}>{showAdvanced ? "Hide" : "Choose"} specific decisions, research, revisions &amp; review comments</button>
            {showAdvanced && (
              <div className="grid gap-4 md:grid-cols-2">
                {([["decisions", "Design decisions", scope.decisions.filter((d) => d.project_id === pid).map((d) => [d.id, d.title])], ["research", "Research sources", scope.research.filter((d) => d.project_id === pid).map((d) => [d.id, d.title])],
                  ["revisions", "Revisions", scope.revisions.filter((d) => d.project_id === pid).map((d) => [d.id, `${d.rev_label} — ${d.title}`])], ["reviews", "Reviews & comments", scope.reviews.filter((d) => d.project_id === pid).map((d) => [d.id, d.title])]] as const).map(([key, label, items]) => (
                  <fieldset key={key} className="rounded-lg border border-border p-3"><legend className="px-1 text-xs font-semibold">{label} <span className="font-normal text-muted-foreground">({pick[key].length || "all"})</span></legend>
                    <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">{items.length === 0 ? <li className="text-muted-foreground">None</li> : items.map(([id, t]) => <li key={id}><label className="flex cursor-pointer items-start gap-2"><input type="checkbox" className="mt-0.5 accent-[var(--accent)]" checked={pick[key].includes(id)} onChange={() => toggle(key, id)} /><span>{t}</span></label></li>)}</ul></fieldset>))}
              </div>)}
            <Field label="Emphasis (optional)" hint="Tone or focus only — this can't add facts."><Input value={guidance} onChange={(e) => setGuidance(e.target.value)} placeholder="e.g. focus on the suspension work for a design review" /></Field>
            {error && (error.setup ? <SetupNotice title="AI not configured">{error.text}</SetupNotice> : <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">{error.text}</p>)}
            <div className="flex justify-end"><Button variant="accent" size="lg" loading={busy} disabled={!aiEnabled || !pid} onClick={generate}><Sparkles className="h-4 w-4" />{busy ? "Generating…" : `Generate ${DOC_TYPES[docType].label.toLowerCase()}`}</Button></div>
          </div>
        </Card>
      )}

      {draft && <DocEditor key={draft.id ?? draft.title} draft={draft} setDraft={setDraft} scope={scope} aiEnabled={aiEnabled} onClose={() => { setDraft(null); setOpen(null); setLastOpen(null); }} />}

      <section>
        <h2 className="mb-3 text-sm font-semibold">Saved documents</h2>
        {saved.length === 0 ? <EmptyState icon={<FileText className="h-5 w-5" />} title="No saved documents" description="Generate a document above and save it to the project." /> : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card"><ul className="divide-y divide-border">{saved.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-5 py-3.5">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <button className="min-w-0 flex-1 text-left" onClick={() => { openSaved(d); setLastOpen(d.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                <p className="truncate text-[13px] font-medium hover:text-accent">{d.title}</p>
                <p className="text-xs text-muted-foreground">{DOC_TYPES[d.doc_type]?.label ?? d.doc_type} · {scope.projects.find((p) => p.id === d.project_id)?.name} · updated {formatDate(d.updated_at)}</p>
              </button>
              {canWrite(d.project_id) && <Button variant="danger-ghost" size="icon" aria-label={`Delete ${d.title}`} onClick={() => setDel(d)}><Trash2 className="h-4 w-4" /></Button>}
            </li>))}</ul></div>)}
      </section>
      <ConfirmDialog open={Boolean(del)} onOpenChange={(o) => !o && setDel(null)} title="Delete this document?" description="The saved document is permanently removed." onConfirm={async () => { if (!del) return; const r = await act(deleteDocument(del.id), "Document deleted"); if (r.ok) { if (draft?.id === del.id) setDraft(null); router.refresh(); } }} />
    </div>
  );
}

function DocEditor({ draft, setDraft, scope, aiEnabled, onClose }: { draft: Draft; setDraft: (d: Draft) => void; scope: Scope; aiEnabled: boolean; onClose: () => void }) {
  const { canWrite } = useProjectPermissions();
  const editable = canWrite(draft.projectId);
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [regen, setRegen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const project = scope.projects.find((p) => p.id === draft.projectId);
  const spec = DOC_TYPES[draft.docType];

  // id → title for every citable source in the project (used for source chips and the PDF).
  const titles = useMemo(() => {
    const m = new Map<string, string>();
    scope.decisions.forEach((d) => m.set(`decision:${d.id}`, `Decision: ${d.title}`));
    scope.research.forEach((r) => m.set(`research:${r.id}`, `Research: ${r.title}`));
    scope.revisions.forEach((r) => m.set(`revision:${r.id}`, `Revision ${r.rev_label}`));
    scope.files.forEach((f) => m.set(`file:${f.id}`, `File: ${f.name}`));
    scope.reviews.forEach((r) => m.set(`review:${r.id}`, `Review: ${r.title}`));
    scope.notes.forEach((n) => m.set(`note:${n.id}`, `Note: ${n.title}`));
    scope.subsystems.forEach((s) => m.set(`subsystem:${s.id}`, `Subsystem: ${s.name}`));
    if (project) m.set(`project:${project.id}`, `Project: ${project.name}`);
    m.set("timeline:all", "Revision timeline");
    return m;
  }, [scope, project]);

  const update = (key: string, patch: Partial<DocSection>) => setDraft({ ...draft, dirty: true, sections: draft.sections.map((s) => (s.key === key ? { ...s, ...patch } : s)) });

  async function regenerate(key: string) {
    setRegen(key);
    try {
      const res = await fetch("/api/ai/generate-doc", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId: draft.projectId, docType: draft.docType, selection: (draft.params.selection as object) ?? {}, onlySection: key, guidance: draft.params.guidance || undefined }) });
      const j = await res.json();
      notifyAnonymousAiLimit(res);
      if (!res.ok) return void toast.error(j.error ?? "Couldn't regenerate");
      update(key, j.sections[0]);
      toast.success("Section regenerated");
    } finally { setRegen(null); }
  }

  async function save() {
    setSaving(true);
    const r = await act(saveDocument({ id: draft.id, project_id: draft.projectId, doc_type: draft.docType, title: draft.title, sections: draft.sections, params: draft.params }), "Saved to the project");
    setSaving(false);
    if (r.ok) { setDraft({ ...draft, id: r.id, dirty: false }); router.refresh(); }
  }
  async function exportPdf() {
    setExporting(true);
    try { await exportDocPdf({ title: draft.title, projectName: project?.name ?? "Project", sections: draft.sections, typeLabel: spec?.label ?? "Document", sourceTitles: titles }); toast.success("PDF downloaded"); }
    catch (e) { toast.error(`PDF export failed: ${(e as Error).message}`); } finally { setExporting(false); }
  }

  const counts = { confirmed: 0, partial: 0, missing: 0 };
  draft.sections.forEach((s) => counts[s.status]++);

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
        <div className="min-w-0 flex-1">
          <Input readOnly={!editable} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value, dirty: true })} aria-label="Document title" className="h-9 border-transparent px-0 text-[15px] font-semibold shadow-none hover:border-border focus:px-3" />
          <p className="text-xs text-muted-foreground">{spec?.label} · {project?.name}{project?.is_sample && <span className="ml-1.5"><SampleBadge /></span>}</p>
        </div>
        <div className="flex items-center gap-2">
          {draft.dirty && <span className="text-xs text-warning">Unsaved changes</span>}
          <Button variant="outline" size="sm" onClick={exportPdf} loading={exporting}><Download className="h-3.5 w-3.5" />Export PDF</Button>
          {editable && <Button variant="accent" size="sm" onClick={save} loading={saving}><Save className="h-3.5 w-3.5" />{draft.id ? "Save changes" : "Save to project"}</Button>}
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-border bg-muted/40 px-5 py-2 text-xs">
        <span className="font-medium text-muted-foreground">Documentation coverage:</span>
        <span className="text-success">{counts.confirmed} documented</span><span className="text-warning">{counts.partial} partial</span><span className="text-danger">{counts.missing} not documented</span>
      </div>
      <div className="divide-y divide-border">
        {draft.sections.map((s) => {
          const st = STATUS[s.status]; const Icon = st.icon;
          return (
            <section key={s.key} className="px-5 py-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="text-[15px] font-semibold">{s.title}</h3><Badge tone={st.tone}><Icon className="h-3 w-3" />{st.label}</Badge>
                {editable && <div className="ml-auto flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(editing === s.key ? null : s.key)}><Pencil className="h-3.5 w-3.5" />{editing === s.key ? "Done" : "Edit"}</Button>
                  <Button variant="ghost" size="sm" disabled={!aiEnabled || regen !== null} onClick={() => regenerate(s.key)} title={aiEnabled ? undefined : "Anthropic key not configured"}>{regen === s.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Regenerate</Button>
                </div>}
              </div>
              {editing === s.key ? <Textarea value={s.content} onChange={(e) => update(s.key, { content: e.target.value })} className="min-h-[160px] font-mono text-xs" /> : <RenderContent text={s.content} />}
              {s.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5"><span className="text-[11px] text-muted-foreground">Sources:</span>
                  {s.sources.map((id) => { const [type, rid] = id.split(":"); return titles.has(id) ? <Link key={id} href={type === "timeline" ? `/projects/${draft.projectId}/history` : refHref(draft.projectId, type, rid)} className="rounded border border-border bg-surface px-1.5 py-0.5 text-[11px] text-muted-foreground hover:border-accent hover:text-accent">{titles.get(id)}</Link> : null; })}
                </div>)}
            </section>
          );
        })}
      </div>
      <p className="border-t border-border bg-muted/40 px-5 py-2.5 text-[11px] text-muted-foreground">AI-generated from selected project records. Review before sharing: edits you make here are yours; “Not documented” lines mark gaps the project record doesn&apos;t fill.</p>
    </Card>
  );
}

function RenderContent({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="prose-doc">
      {blocks.map((b, i) => {
        const lines = b.split("\n").filter((l) => l.trim());
        if (lines.every((l) => /^\s*[-•*]\s+/.test(l))) return <ul key={i}>{lines.map((l, j) => <li key={j}><Line t={l.replace(/^\s*[-•*]\s+/, "")} /></li>)}</ul>;
        return <div key={i}>{lines.map((l, j) => /^\s*[-•*]\s+/.test(l) ? <ul key={j}><li><Line t={l.replace(/^\s*[-•*]\s+/, "")} /></li></ul> : <p key={j}><Line t={l} /></p>)}</div>;
      })}
    </div>
  );
}
function Line({ t }: { t: string }) {
  if (/^not documented:/i.test(t.trim())) return <span className="rounded border border-dashed border-warning/40 bg-warning-soft px-1.5 py-0.5 text-[13px] text-warning">{t}</span>;
  return <>{t}</>;
}

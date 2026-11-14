"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardCheck, GitCompare, MessageSquareQuote, Plus, Trash2 } from "lucide-react";
import { Badge, SampleBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DrawerContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ConfirmDialog, EmptyState } from "@/components/ui/misc";
import { act, fileUrl, isImage } from "@/lib/client";
import { createRevision, deleteRevision } from "@/app/actions/knowledge";
import { formatDate } from "@/lib/utils";
import type { Revision } from "@/lib/types";
import type { Scope } from "@/lib/scope";
import { FileThumb, FilterSelect, NotDocumented, RefChip, Section, SubsystemTag, useOpenParam } from "./common";
import { REVISION_KIND } from "./meta";
import { UploadRows, useUploader, type PendingFile } from "./upload-rows";

export function HistoryView({ scope, projectId, subsystemId }: { scope: Scope; projectId: string; subsystemId?: string }) {
  const [open, setOpen] = useOpenParam();
  const [adding, setAdding] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [sub, setSub] = useState(subsystemId ?? "");
  const [kind, setKind] = useState("");
  const [asc, setAsc] = useState(false);
  const subs = scope.subsystems.filter((s) => s.project_id === projectId);

  const entries = useMemo(() => {
    const revs = scope.revisions.filter((r) => r.project_id === projectId && (!sub || r.subsystem_id === sub) && (!kind || r.kind === kind));
    return revs.sort((a, b) => (asc ? 1 : -1) * (a.occurred_on.localeCompare(b.occurred_on) || a.created_at.localeCompare(b.created_at)));
  }, [scope.revisions, projectId, sub, kind, asc]);
  const selected = scope.revisions.find((r) => r.id === open) ?? null;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {!subsystemId && <FilterSelect value={sub} onChange={setSub} label="All subsystems" options={subs.map((s) => ({ value: s.id, label: s.name }))} />}
        <FilterSelect value={kind} onChange={setKind} label="All event types" options={Object.entries(REVISION_KIND).map(([v, m]) => ({ value: v, label: m.label }))} />
        <Button variant="ghost" size="sm" onClick={() => setAsc((a) => !a)}>{asc ? "Oldest first" : "Newest first"}</Button>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => setComparing(true)} disabled={scope.revisions.filter((r) => r.project_id === projectId).length < 2}><GitCompare className="h-4 w-4" />Compare revisions</Button>
          <Button variant="accent" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />New revision</Button>
        </div>
      </div>

      {entries.length === 0 ? (
        <EmptyState icon={GitCompareIcon} title="No design history yet" description="Upload a CAD screenshot, calculation or simulation result and explain what changed and why. The timeline builds itself from there."
          action={<Button variant="accent" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Record the first revision</Button>} />
      ) : (
        <ol className="relative ml-3 border-l-2 border-border pl-7">
          {entries.map((r) => {
            const k = REVISION_KIND[r.kind];
            const files = scope.files.filter((f) => f.revision_id === r.id);
            const thumbs = files.filter((f) => isImage(f.mime, f.name)).slice(0, 3);
            return (
              <li key={r.id} className="relative pb-6 last:pb-0">
                <span className="absolute -left-[37px] top-4 h-3.5 w-3.5 rounded-full border-[3px] border-background" style={{ background: k.color }} />
                <button onClick={() => setOpen(r.id)} className="w-full rounded-lg border border-border bg-surface p-4 text-left shadow-card transition-all hover:border-border-strong hover:shadow-[var(--shadow-pop)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="accent" className="font-mono">{r.rev_label}</Badge><Badge tone={k.tone}>{k.label}</Badge><SubsystemTag id={r.subsystem_id} subsystems={scope.subsystems} />{r.is_sample && <SampleBadge />}
                    <span className="ml-auto text-xs text-muted-foreground">{formatDate(r.occurred_on)} · {r.author_name}</span>
                  </div>
                  <p className="mt-2 text-[14px] font-semibold">{r.title}</p>
                  <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground"><span className="font-medium text-[#344054]">Why: </span>{r.reason || "Not documented"}</p>
                  {(thumbs.length > 0 || files.length > 0) && (
                    <div className="mt-3 flex items-center gap-2">{thumbs.map((f) => <div key={f.id} className="h-12 w-[72px] overflow-hidden rounded-md border border-border"><FileThumb file={f} /></div>)}
                      <span className="text-xs text-muted-foreground">{files.length} file{files.length === 1 ? "" : "s"}</span></div>)}
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {adding && <RevisionDialog scope={scope} projectId={projectId} subsystemId={subsystemId} onClose={() => setAdding(false)} />}
      {comparing && <CompareDialog scope={scope} projectId={projectId} onClose={() => setComparing(false)} />}
      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setOpen(null)}>
        {selected && <RevisionDrawer r={selected} scope={scope} onClose={() => setOpen(null)} />}
      </Dialog>
    </div>
  );
}
const GitCompareIcon = GitCompare;

function RevisionDrawer({ r, scope, onClose }: { r: Revision; scope: Scope; onClose: () => void }) {
  const router = useRouter();
  const [del, setDel] = useState(false);
  const files = scope.files.filter((f) => f.revision_id === r.id);
  const decisions = scope.evidence.filter((e) => e.revision_id === r.id).map((e) => scope.decisions.find((d) => d.id === e.decision_id)).filter(Boolean);
  const reviews = scope.reviews.filter((rv) => rv.revision_id === r.id);
  const influenced = scope.comments.filter((c) => c.influenced_revision_id === r.id);
  const k = REVISION_KIND[r.kind];
  const prev = scope.revisions.filter((x) => x.project_id === r.project_id && x.subsystem_id === r.subsystem_id && x.id !== r.id && x.occurred_on <= r.occurred_on && ["initial", "design_change", "final"].includes(x.kind)).sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))[0];

  return (
    <DrawerContent title={`${r.rev_label} — ${r.title}`} description={`${k.label} · ${formatDate(r.occurred_on)} · ${r.author_name}`}
      actions={<Button variant="danger-ghost" size="icon" aria-label="Delete revision" onClick={() => setDel(true)}><Trash2 className="h-4 w-4" /></Button>}>
      <div className="mb-5 flex flex-wrap gap-1.5"><Badge tone={k.tone}>{k.label}</Badge><SubsystemTag id={r.subsystem_id} subsystems={scope.subsystems} />{r.is_sample && <SampleBadge />}</div>
      <Section title="What changed">{r.description ? <p className="whitespace-pre-wrap">{r.description}</p> : <NotDocumented />}</Section>
      <Section title="Why it changed">{r.reason ? <p className="whitespace-pre-wrap">{r.reason}</p> : <NotDocumented />}</Section>
      <Section title="Supporting documents">
        {files.length === 0 ? <NotDocumented>No files attached</NotDocumented> : (
          <div className="grid gap-3 sm:grid-cols-2">{files.map((f) => (
            <div key={f.id} className="overflow-hidden rounded-lg border border-border">
              <a href={fileUrl(f.storage_path)} target="_blank" rel="noopener noreferrer" className="block aspect-[16/10] overflow-hidden bg-muted"><FileThumb file={f} /></a>
              <div className="p-2.5"><p className="truncate text-xs font-medium">{f.name}</p><p className="text-[11px] capitalize text-muted-foreground">{f.category.replace("_", " ")}</p>{f.description && <p className="mt-1 text-[11px] text-muted-foreground">{f.description}</p>}</div>
            </div>))}</div>)}
        <p className="mt-2 text-[11px] text-muted-foreground">Project Memory stores these files; it does not analyse CAD geometry or simulation results.</p>
      </Section>
      {decisions.length > 0 && <Section title="Used as evidence in decisions"><ul className="space-y-1.5">{decisions.map((d) => d && <li key={d.id}><RefChip projectId={r.project_id} type="decision" id={d.id} label={d.title} onNavigate={onClose} /></li>)}</ul></Section>}
      {reviews.length > 0 && <Section title="Peer reviews"><ul className="space-y-1.5">{reviews.map((rv) => <li key={rv.id} className="flex items-center gap-1.5"><ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" /><RefChip projectId={r.project_id} type="review" id={rv.id} label={rv.title} onNavigate={onClose} /></li>)}</ul></Section>}
      {influenced.length > 0 && (
        <Section title="Feedback that led to this revision">
          <ul className="space-y-2">{influenced.map((c) => <li key={c.id} className="rounded-md border border-border p-2.5 text-xs"><MessageSquareQuote className="mb-1 h-3.5 w-3.5 text-accent" /><span className="font-medium">{c.author_name}:</span> {c.body}</li>)}</ul>
        </Section>)}
      {prev && <Section title="Previous revision in this subsystem"><RefChip projectId={r.project_id} type="revision" id={prev.id} label={`${prev.rev_label} — ${prev.title}`} onNavigate={() => undefined} /></Section>}
      <ConfirmDialog open={del} onOpenChange={setDel} title={`Delete ${r.rev_label}?`} description="The revision record and its explanation are removed. Attached files are kept in the Files section." onConfirm={async () => { const x = await act(deleteRevision(r.id), "Revision deleted"); if (x.ok) { onClose(); router.refresh(); } }} />
    </DrawerContent>
  );
}

function CompareDialog({ scope, projectId, onClose }: { scope: Scope; projectId: string; onClose: () => void }) {
  const revs = scope.revisions.filter((r) => r.project_id === projectId).sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));
  const [a, setA] = useState(revs[0]?.id ?? "");
  const [b, setB] = useState(revs[1]?.id ?? "");
  const col = (id: string) => {
    const r = revs.find((x) => x.id === id);
    if (!r) return <div key={id} />;
    const imgs = scope.files.filter((f) => f.revision_id === r.id && isImage(f.mime, f.name));
    return (
      <div key={id} className="min-w-0 space-y-3">
        <div className="flex items-center gap-2"><Badge tone="accent" className="font-mono">{r.rev_label}</Badge><span className="text-xs text-muted-foreground">{formatDate(r.occurred_on)} · <SubsystemTag id={r.subsystem_id} subsystems={scope.subsystems} /></span></div>
        <p className="text-[13px] font-semibold">{r.title}</p>
        {imgs.length ? imgs.slice(0, 2).map((f) => <div key={f.id} className="aspect-[16/10] overflow-hidden rounded-md border border-border"><FileThumb file={f} /></div>) : <p className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">No image attached</p>}
        <Section title="What changed">{r.description || <NotDocumented />}</Section>
        <Section title="Why">{r.reason || <NotDocumented />}</Section>
      </div>
    );
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Compare revisions" description="See what changed between two points in the design history." className="max-w-5xl">
        <div className="mb-4 flex items-center gap-2">
          <Select value={a} onChange={(e) => setA(e.target.value)} aria-label="First revision">{revs.map((r) => <option key={r.id} value={r.id}>{r.rev_label} — {r.title}</option>)}</Select>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Select value={b} onChange={(e) => setB(e.target.value)} aria-label="Second revision">{revs.map((r) => <option key={r.id} value={r.id}>{r.rev_label} — {r.title}</option>)}</Select>
        </div>
        <div className="grid gap-6 md:grid-cols-2">{col(a)}{col(b)}</div>
      </DialogContent>
    </Dialog>
  );
}

export function RevisionDialog({ scope, projectId, subsystemId, onClose }: { scope: Scope; projectId: string; subsystemId?: string; onClose: () => void }) {
  const router = useRouter();
  const { upload, progress } = useUploader();
  const [step, setStep] = useState<1 | 2>(1);
  const [items, setItems] = useState<PendingFile[]>([]);
  const [f, setF] = useState({ rev_label: "", title: "", kind: "design_change", subsystem_id: subsystemId ?? "", occurred_on: new Date().toISOString().slice(0, 10), description: "", reason: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const subs = scope.subsystems.filter((s) => s.project_id === projectId);

  function next() {
    setError("");
    if (!f.rev_label.trim()) return setError("Give the revision a name or number (e.g. Rev C).");
    if (!f.title.trim()) return setError("Give the revision a short title.");
    setStep(2);
  }
  async function save() {
    setError("");
    if (!f.description.trim()) return setError("Describe what changed.");
    if (!f.reason.trim()) return setError("Explain why you made this change — it is the most valuable part of the record.");
    setBusy(true);
    try {
      const files = await upload(projectId, items);
      const r = await act(createRevision({ project_id: projectId, ...f, kind: f.kind as Revision["kind"], subsystem_id: f.subsystem_id || null }, files), "Revision saved to the project history");
      if (r.ok) { onClose(); router.refresh(); } else setError(r.error);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent wide title={step === 1 ? "New design revision" : "Explain this revision"} description={step === 1 ? "Step 1 of 2 — upload files and describe the revision." : "Step 2 of 2 — this explanation is saved permanently in the project history."}>
        {step === 1 ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Revision name / number" required><Input value={f.rev_label} onChange={(e) => set("rev_label", e.target.value)} placeholder="Rev C" /></Field>
              <Field label="Title" required className="sm:col-span-2"><Input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Shortened upper arm" /></Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Type"><Select value={f.kind} onChange={(e) => set("kind", e.target.value)}>{Object.entries(REVISION_KIND).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}</Select></Field>
              <Field label="Subsystem"><Select value={f.subsystem_id} onChange={(e) => set("subsystem_id", e.target.value)}><option value="">None</option>{subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
              <Field label="Date"><Input type="date" value={f.occurred_on} onChange={(e) => set("occurred_on", e.target.value)} /></Field>
            </div>
            <Field label="Files" hint="Optional — CAD screenshots, CAD files, calculations, FEA / CFD results, documents."><UploadRows items={items} onChange={setItems} /></Field>
            {error && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="accent" onClick={next}>Continue</Button></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-accent-soft/60 p-3.5 text-[13px] font-medium text-[#1a3a8a]">What changed in this revision, and why did you make this change?</div>
            <Field label="What changed?" required><Textarea value={f.description} onChange={(e) => set("description", e.target.value)} className="min-h-[96px]" placeholder="Describe the change in the design." autoFocus /></Field>
            <Field label="Why did you make this change?" required hint="Mention the problem, the research or test result behind it, and anything you rejected."><Textarea value={f.reason} onChange={(e) => set("reason", e.target.value)} className="min-h-[110px]" /></Field>
            {error && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}
            <div className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{progress}</span>
              <div className="flex gap-2"><Button variant="outline" onClick={() => setStep(1)} disabled={busy}>Back</Button><Button variant="accent" loading={busy} onClick={save}>Save revision</Button></div></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

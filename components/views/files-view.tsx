"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileUp, FolderOpen, Plus, Trash2 } from "lucide-react";
import { Badge, SampleBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DrawerContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ConfirmDialog, EmptyState } from "@/components/ui/misc";
import { CATEGORY_LABEL, act, fileUrl, isImage } from "@/lib/client";
import { createFileRecords, deleteFile, updateFile } from "@/app/actions/knowledge";
import { formatBytes, formatDate } from "@/lib/utils";
import type { FileRow } from "@/lib/types";
import type { Scope } from "@/lib/scope";
import { FileThumb, FilterSelect, RefChip, SearchBox, Section, SubsystemTag, useOpenParam } from "./common";
import { UploadRows, useUploader, type PendingFile } from "./upload-rows";

export function FilesView({ scope, projectId, subsystemId }: { scope: Scope; projectId: string; subsystemId?: string }) {
  const [open, setOpen] = useOpenParam();
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [sub, setSub] = useState(subsystemId ?? "");
  const [cat, setCat] = useState("");
  const rows = scope.files.filter((f) => f.project_id === projectId && (!sub || f.subsystem_id === sub) && (!cat || f.category === cat) && (!q || `${f.name} ${f.description}`.toLowerCase().includes(q.toLowerCase())));
  const selected = scope.files.find((f) => f.id === open) ?? null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search files…" />
        {!subsystemId && <FilterSelect value={sub} onChange={setSub} label="All subsystems" options={scope.subsystems.filter((s) => s.project_id === projectId).map((s) => ({ value: s.id, label: s.name }))} />}
        <FilterSelect value={cat} onChange={setCat} label="All categories" options={Object.entries(CATEGORY_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
        <Button variant="accent" onClick={() => setAdding(true)}><FileUp className="h-4 w-4" />Upload files</Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<FolderOpen className="h-5 w-5" />} title={scope.files.some((f) => f.project_id === projectId) ? "No files match your filters" : "No files uploaded yet"} description="Upload CAD screenshots, calculations, FEA/CFD results and documents. Files are private to this project's team."
          action={<Button variant="accent" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Upload files</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((f) => (
            <button key={f.id} onClick={() => setOpen(f.id)} className="group overflow-hidden rounded-lg border border-border bg-surface text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-pop)]">
              <div className="aspect-[16/10] overflow-hidden bg-muted"><FileThumb file={f} className="transition-transform duration-300 group-hover:scale-[1.03]" /></div>
              <div className="p-3">
                <p className="truncate text-[13px] font-medium">{f.name}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5"><Badge tone="accent">{CATEGORY_LABEL[f.category]}</Badge><SubsystemTag id={f.subsystem_id} subsystems={scope.subsystems} />{f.is_sample && <SampleBadge />}</div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">{formatBytes(f.size)} · {formatDate(f.created_at)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {adding && <UploadDialog scope={scope} projectId={projectId} subsystemId={subsystemId} onClose={() => setAdding(false)} />}
      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setOpen(null)}>{selected && <FileDrawer f={selected} scope={scope} onClose={() => setOpen(null)} />}</Dialog>
    </div>
  );
}

function UploadDialog({ scope, projectId, subsystemId, onClose }: { scope: Scope; projectId: string; subsystemId?: string; onClose: () => void }) {
  const router = useRouter();
  const { upload, progress } = useUploader();
  const [items, setItems] = useState<PendingFile[]>([]);
  const [sub, setSub] = useState(subsystemId ?? "");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent title="Upload files" description="Files go into private storage that only project members can open.">
        <div className="space-y-4">
          <UploadRows items={items} onChange={setItems} />
          <Field label="Subsystem"><Select value={sub} onChange={(e) => setSub(e.target.value)}><option value="">None</option>{scope.subsystems.filter((s) => s.project_id === projectId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Description" hint="Applies to all files in this upload."><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What are these files?" /></Field>
          {error && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}
          <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{progress}</span>
            <div className="flex gap-2"><Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
              <Button variant="accent" loading={busy} onClick={async () => {
                if (!items.length) return setError("Choose at least one file.");
                setBusy(true); setError("");
                try { const files = await upload(projectId, items, desc); const r = await act(createFileRecords(projectId, sub || null, files), "Files uploaded"); if (r.ok) { onClose(); router.refresh(); } else setError(r.error); }
                catch (e) { setError((e as Error).message); } finally { setBusy(false); }
              }}>Upload</Button></div></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FileDrawer({ f, scope, onClose }: { f: FileRow; scope: Scope; onClose: () => void }) {
  const router = useRouter();
  const [del, setDel] = useState(false);
  const [desc, setDesc] = useState(f.description);
  const [busy, setBusy] = useState(false);
  const rev = scope.revisions.find((r) => r.id === f.revision_id);
  const decisions = scope.evidence.filter((e) => e.file_id === f.id).map((e) => scope.decisions.find((d) => d.id === e.decision_id)).filter(Boolean);
  return (
    <DrawerContent title={f.name} description={`${CATEGORY_LABEL[f.category]} · ${formatBytes(f.size)} · uploaded ${formatDate(f.created_at)}`}
      actions={<><a href={fileUrl(f.storage_path, f.name)} aria-label="Download" className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"><Download className="h-4 w-4" /></a><Button variant="danger-ghost" size="icon" aria-label="Delete file" onClick={() => setDel(true)}><Trash2 className="h-4 w-4" /></Button></>}>
      <div className="mb-5 flex flex-wrap gap-1.5"><SubsystemTag id={f.subsystem_id} subsystems={scope.subsystems} />{f.is_sample && <SampleBadge />}</div>
      {isImage(f.mime, f.name) ? (
        <a href={fileUrl(f.storage_path)} target="_blank" rel="noopener noreferrer" className="mb-5 block overflow-hidden rounded-lg border border-border bg-muted"><FileThumb file={f} className="max-h-[360px] object-contain" /></a>
      ) : (
        <a href={fileUrl(f.storage_path)} target="_blank" rel="noopener noreferrer" className="mb-5 flex items-center justify-center rounded-lg border border-dashed border-border-strong bg-muted/50 py-8 text-[13px] font-medium text-accent hover:underline">Open file</a>
      )}
      <Section title="Description">
        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="min-h-[64px]" placeholder="Describe what this file shows" />
        {desc !== f.description && <Button size="sm" variant="accent" className="mt-2" loading={busy} onClick={async () => { setBusy(true); const r = await act(updateFile(f.id, { description: desc }), "Saved"); setBusy(false); if (r.ok) router.refresh(); }}>Save description</Button>}
      </Section>
      {rev && <Section title="Part of revision"><RefChip projectId={f.project_id} type="revision" id={rev.id} label={`${rev.rev_label} — ${rev.title}`} onNavigate={onClose} /></Section>}
      {decisions.length > 0 && <Section title="Evidence for decisions"><ul className="space-y-1.5">{decisions.map((d) => d && <li key={d.id}><RefChip projectId={f.project_id} type="decision" id={d.id} label={d.title} onNavigate={onClose} /></li>)}</ul></Section>}
      {f.extracted_text ? <Section title="Extracted text"><p className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/60 p-3 text-xs">{f.extracted_text.slice(0, 4000)}</p></Section>
        : <p className="text-[11px] text-muted-foreground">No text was extracted. CONTINUUM stores images, CAD and simulation files but does not analyse their contents — add a description so the AI assistant and teammates know what this file shows.</p>}
      <ConfirmDialog open={del} onOpenChange={setDel} title="Delete this file?" description="The stored file is permanently removed, and any decision evidence links to it are dropped." onConfirm={async () => { const r = await act(deleteFile(f.id), "File deleted"); if (r.ok) { onClose(); router.refresh(); } }} />
    </DrawerContent>
  );
}

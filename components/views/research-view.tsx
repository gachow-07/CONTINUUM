"use client";
import { notifyAnonymousAiLimit } from "@/lib/ai/anonymous-limit-notice";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ExternalLink, FileText, Link2, Loader2, Plus, Sparkles, StickyNote, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Badge, SampleBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DrawerContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ConfirmDialog, EmptyState, SetupNotice } from "@/components/ui/misc";
import { act, fileUrl, uploadToProject } from "@/lib/client";
import { createResearch, deleteResearch, linkResearchToDecision, unlinkEvidence, updateResearch } from "@/app/actions/knowledge";
import { formatDate } from "@/lib/utils";
import type { Research, ResearchType } from "@/lib/types";
import type { Scope } from "@/lib/scope";
import { FilterSelect, NotDocumented, RefChip, SearchBox, Section, SubsystemTag, TagList, useOpenParam } from "./common";
import { RESEARCH_TYPE } from "./meta";

const TYPE_ICON: Record<ResearchType, React.ComponentType<{ className?: string }>> = { url: ExternalLink, pdf: FileText, paper: BookOpen, article: BookOpen, image: FileText, note: StickyNote };

export function ResearchView({ scope, projectId, subsystemId, aiEnabled }: { scope: Scope; projectId?: string; subsystemId?: string; aiEnabled: boolean }) {
  const [open, setOpen] = useOpenParam();
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [project, setProject] = useState(projectId ?? "");
  const [sub, setSub] = useState(subsystemId ?? "");
  const [type, setType] = useState("");
  const [tag, setTag] = useState("");

  const projectName = (id: string) => scope.projects.find((p) => p.id === id)?.name ?? "";
  const subsystems = scope.subsystems.filter((s) => !project || s.project_id === project);
  const allTags = useMemo(() => [...new Set(scope.research.filter((r) => !project || r.project_id === project).flatMap((r) => r.tags))].sort(), [scope.research, project]);

  const rows = scope.research.filter((r) => {
    if (project && r.project_id !== project) return false;
    if (sub && r.subsystem_id !== sub) return false;
    if (type && r.type !== type) return false;
    if (tag && !r.tags.includes(tag)) return false;
    if (q) { const hay = `${r.title} ${r.description} ${r.why_important} ${r.tags.join(" ")} ${r.site_name ?? ""}`.toLowerCase(); if (!hay.includes(q.toLowerCase())) return false; }
    return true;
  });
  const selected = scope.research.find((r) => r.id === open) ?? null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search title, notes, tags…" />
        {!projectId && <FilterSelect value={project} onChange={(v) => { setProject(v); setSub(""); setTag(""); }} label="All projects" options={scope.projects.map((p) => ({ value: p.id, label: p.name }))} />}
        {!subsystemId && <FilterSelect value={sub} onChange={setSub} label="All subsystems" options={subsystems.map((s) => ({ value: s.id, label: s.name }))} />}
        <FilterSelect value={type} onChange={setType} label="All types" options={Object.entries(RESEARCH_TYPE).map(([v, l]) => ({ value: v, label: l }))} />
        <Button variant="accent" onClick={() => setAdding(true)} disabled={scope.projects.length === 0}><Plus className="h-4 w-4" />Add research</Button>
      </div>
      {allTags.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-muted-foreground">Tags:</span>
          <TagList tags={allTags} active={tag} onClick={(t) => setTag(tag === t ? "" : t)} />
          {tag && <button className="ml-1 text-xs text-accent hover:underline" onClick={() => setTag("")}>Clear</button>}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-5 w-5" />} title={scope.research.length ? "No research matches your filters" : "No research saved yet"}
          description={scope.research.length ? "Try clearing a filter or searching for something else." : "Save links, PDFs and notes — with why they matter — so the reasoning behind your design never gets lost."}
          action={scope.research.length === 0 && scope.projects.length > 0 && <Button variant="accent" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Add research</Button>} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const Icon = TYPE_ICON[r.type];
              const linked = scope.evidence.filter((e) => e.research_id === r.id).length;
              return (
                <li key={r.id}>
                  <button onClick={() => setOpen(r.id)} className="flex w-full items-start gap-3.5 px-5 py-3.5 text-left transition-colors hover:bg-muted/60">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="text-[13px] font-semibold">{r.title}</p>{r.is_sample && <SampleBadge />}</div>
                      <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">{r.description || r.why_important || "No description"}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge tone="accent">{RESEARCH_TYPE[r.type]}</Badge><SubsystemTag id={r.subsystem_id} subsystems={scope.subsystems} />
                        {!projectId && <Badge>{projectName(r.project_id)}</Badge>}<TagList tags={r.tags.slice(0, 4)} />
                      </div>
                    </div>
                    <div className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block">
                      <p>{formatDate(r.created_at)}</p>
                      <p className={`mt-1 inline-flex items-center gap-1 ${linked ? "text-accent" : ""}`}><Link2 className="h-3 w-3" />{linked ? `${linked} decision${linked > 1 ? "s" : ""}` : "not linked"}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {adding && <AddResearchDialog scope={scope} projectId={projectId} subsystemId={subsystemId} onClose={() => setAdding(false)} />}
      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setOpen(null)}>
        {selected && <ResearchDrawer r={selected} scope={scope} aiEnabled={aiEnabled} onClose={() => setOpen(null)} />}
      </Dialog>
    </div>
  );
}

function ResearchDrawer({ r, scope, aiEnabled, onClose }: { r: Research; scope: Scope; aiEnabled: boolean; onClose: () => void }) {
  const router = useRouter();
  const [del, setDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(false);
  const [decisionId, setDecisionId] = useState("");
  const [note, setNote] = useState("");
  const [linking, setLinking] = useState(false);
  const [showText, setShowText] = useState(false);
  const links = scope.evidence.filter((e) => e.research_id === r.id);
  const decisions = scope.decisions.filter((d) => d.project_id === r.project_id);
  const linkable = decisions.filter((d) => !links.some((l) => l.decision_id === d.id));

  async function summarize() {
    setBusy(true);
    try {
      const res = await fetch("/api/ai/summarize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "research", id: r.id }) });
      const j = await res.json();
      notifyAnonymousAiLimit(res);
      if (!res.ok) toast.error(j.error ?? "Summary failed"); else { toast.success("Summary saved"); router.refresh(); }
    } finally { setBusy(false); }
  }

  return (
    <DrawerContent title={r.title} description={`${RESEARCH_TYPE[r.type]} · saved ${formatDate(r.created_at)}${r.site_name ? ` · ${r.site_name}` : ""}`}
      actions={<Button variant="danger-ghost" size="icon" aria-label="Delete research" onClick={() => setDel(true)}><Trash2 className="h-4 w-4" /></Button>}>
      <div className="mb-4 flex flex-wrap gap-1.5">{r.is_sample && <SampleBadge />}<SubsystemTag id={r.subsystem_id} subsystems={scope.subsystems} /><TagList tags={r.tags} /></div>
      {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="mb-5 inline-flex items-center gap-1.5 break-all text-[13px] font-medium text-accent hover:underline"><ExternalLink className="h-3.5 w-3.5 shrink-0" />{r.url}</a>}
      {r.file_path && <a href={fileUrl(r.file_path)} target="_blank" className="mb-5 flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"><FileText className="h-3.5 w-3.5" />Open original file</a>}
      <Section title="Why this matters" action={<button className="text-xs text-accent hover:underline" onClick={() => setEdit(true)}>Edit</button>}>{r.why_important || <NotDocumented>The author hasn&apos;t said why this source matters</NotDocumented>}</Section>
      {r.description && <Section title="Description"><p className="whitespace-pre-wrap">{r.description}</p></Section>}
      <Section title="AI summary" action={aiEnabled && (r.content_text || r.description) ? <button disabled={busy} onClick={summarize} className="ai-gradient inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold disabled:opacity-50">{busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}{r.ai_summary ? "Regenerate" : "Summarize"}</button> : undefined}>
        {r.ai_summary ? <p className="rounded-md bg-accent-soft/50 p-3">{r.ai_summary}</p> : aiEnabled ? <span className="text-muted-foreground">Not generated yet.{!r.content_text && !r.description && " There is no text to summarize."}</span> : <SetupNotice title="AI not configured">Add ANTHROPIC_API_KEY to enable summaries.</SetupNotice>}
      </Section>
      {r.content_text && (
        <Section title={r.type === "pdf" ? "Extracted text" : "Content"}>
          <p className={`whitespace-pre-wrap rounded-md bg-muted/60 p-3 text-xs leading-relaxed ${showText ? "" : "line-clamp-6"}`}>{r.content_text}</p>
          <button className="mt-1 text-xs text-accent hover:underline" onClick={() => setShowText((s) => !s)}>{showText ? "Show less" : "Show more"}</button>
        </Section>
      )}
      <Section title="Influenced decisions">
        {links.length === 0 ? <NotDocumented>Not connected to any design decision</NotDocumented> : (
          <ul className="space-y-2">{links.map((l) => { const d = scope.decisions.find((x) => x.id === l.decision_id); return d ? (
            <li key={l.id} className="rounded-md border border-border p-2.5">
              <div className="flex items-start justify-between gap-2"><RefChip projectId={r.project_id} type="decision" id={d.id} label={d.title} onNavigate={onClose} />
                <button aria-label="Unlink" className="text-xs text-muted-foreground hover:text-danger" onClick={async () => { const x = await act(unlinkEvidence(l.id), "Unlinked"); if (x.ok) router.refresh(); }}>Unlink</button></div>
              {l.note && <p className="mt-1.5 text-xs text-muted-foreground">“{l.note}”</p>}
            </li>) : null; })}</ul>)}
        {linkable.length > 0 && (
          <div className="mt-3 space-y-2 rounded-md bg-muted/50 p-3">
            <Select value={decisionId} onChange={(e) => setDecisionId(e.target.value)} aria-label="Decision to connect"><option value="">Connect to a design decision…</option>{linkable.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</Select>
            {decisionId && <>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="How did this source influence the decision? (optional)" />
              <Button size="sm" variant="accent" loading={linking} onClick={async () => { setLinking(true); const x = await act(linkResearchToDecision(r.project_id, r.id, decisionId, note), "Connected to decision"); setLinking(false); if (x.ok) { setDecisionId(""); setNote(""); router.refresh(); } }}>Connect</Button>
            </>}
          </div>)}
      </Section>
      <ConfirmDialog open={del} onOpenChange={setDel} title="Delete this research source?" description="Its connections to design decisions will be removed. This cannot be undone." onConfirm={async () => { const x = await act(deleteResearch(r.id), "Research deleted"); if (x.ok) { onClose(); router.refresh(); } }} />
      {edit && <EditResearchDialog r={r} scope={scope} onClose={() => setEdit(false)} />}
    </DrawerContent>
  );
}

function EditResearchDialog({ r, scope, onClose }: { r: Research; scope: Scope; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const canEditUrl = Boolean(r.url && r.is_sample && scope.projects.some((p) => p.id === r.project_id && p.is_sample));
  const canEditContent = Boolean(r.is_sample && scope.projects.some((p) => p.id === r.project_id && p.is_sample));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Edit research">
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true);
          const x = await act(updateResearch(r.id, {
            title: String(f.get("title")), why_important: String(f.get("why")), subsystem_id: String(f.get("sub")) || null,
            tags: String(f.get("tags")).split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean),
            ...(canEditUrl && String(f.get("url")) !== r.url ? { url: String(f.get("url")) } : {}),
            ...(canEditContent && String(f.get("content")) !== (r.content_text ?? "") ? { content_text: String(f.get("content")) } : {}),
          }), "Research updated");
          setBusy(false); if (x.ok) { onClose(); router.refresh(); }
        }}>
          <Field label="Title" required><Input name="title" defaultValue={r.title} /></Field>
          {canEditUrl && <Field label="URL" required><Input name="url" type="url" required defaultValue={r.url ?? ""} /></Field>}
          <Field label="Subsystem"><Select name="sub" defaultValue={r.subsystem_id ?? ""}><option value="">None</option>{scope.subsystems.filter((s) => s.project_id === r.project_id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Tags" hint="Comma-separated"><Input name="tags" defaultValue={r.tags.join(", ")} /></Field>
          <Field label="Why is this important?"><Textarea name="why" defaultValue={r.why_important} /></Field>
          {canEditContent && <Field label="Content"><Textarea name="content" maxLength={200_000} defaultValue={r.content_text ?? ""} /></Field>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" variant="accent" loading={busy}>Save</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Mode = "url" | "pdf" | "note" | "image";

export function AddResearchDialog({ scope, projectId, subsystemId, onClose }: { scope: Scope; projectId?: string; subsystemId?: string; onClose: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("note");
  const [pid, setPid] = useState(projectId ?? scope.projects[0]?.id ?? "");
  const [url, setUrl] = useState("");
  const [meta, setMeta] = useState({ title: "", site_name: "", description: "" });
  const [kind, setKind] = useState<"url" | "article" | "paper">("url");
  const [fetching, setFetching] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [noteText, setNoteText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const subs = scope.subsystems.filter((s) => s.project_id === pid);

  async function fetchMeta() {
    setError("");
    if (!url.trim()) return setError("Paste a URL first.");
    setFetching(true);
    try {
      const res = await fetch(`/api/research/metadata?url=${encodeURIComponent(url.trim())}`);
      const j = await res.json();
      if (!res.ok) return setError(j.error ?? "Couldn't fetch details");
      const m = j.partial ?? j;
      setMeta((p) => ({ title: m.title ?? p.title, site_name: m.site_name ?? p.site_name, description: m.description ?? p.description }));
      if (j.error) toast.message(j.error); else toast.success("Page details fetched");
    } catch { setError("Couldn't reach the metadata service."); } finally { setFetching(false); }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError("");
    const f = new FormData(e.currentTarget);
    const common = {
      project_id: pid, subsystem_id: String(f.get("sub")) || null,
      tags: String(f.get("tags")).split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean), why_important: String(f.get("why")),
    };
    if (!pid) return setError("Choose a project.");
    setBusy(true);
    try {
      let r;
      if (mode === "url") {
        if (!url.trim()) { setBusy(false); return setError("Paste a URL."); }
        r = await act(createResearch({ ...common, type: kind, url: url.trim(), title: meta.title.trim() || url.trim(), site_name: meta.site_name, description: meta.description }), "Research saved");
      } else if (mode === "note") {
        r = await act(createResearch({ ...common, type: "note", title: String(f.get("title")), content_text: noteText, description: noteText.slice(0, 200) }), "Note saved");
      } else {
        if (!file) { setBusy(false); return setError(mode === "pdf" ? "Choose a PDF." : "Choose an image."); }
        const path = await uploadToProject(pid, file);
        r = await act(createResearch({ ...common, type: mode, title: String(f.get("title")) || file.name, file_path: path, description: String(f.get("desc")) }), "Research saved");
        if (r.ok && mode === "pdf") toast.message(r.extracted ? "Readable text was extracted from the PDF." : "No readable text found — this PDF may be scanned images.");
      }
      if (r.ok) { onClose(); router.refresh(); } else setError(r.error);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  const tabs: { id: Mode; label: string }[] = [{ id: "note", label: "Reasoning / note" }, { id: "url", label: "Website / URL" }, { id: "pdf", label: "PDF" }, { id: "image", label: "Image" }];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent wide title="Add research" description="Capture where it came from and why it matters.">
        <div className="mb-4 inline-flex rounded-md bg-muted p-0.5" role="tablist">
          {tabs.map((t) => <button key={t.id} role="tab" aria-selected={mode === t.id} type="button" onClick={() => { setMode(t.id); setError(""); }} className={`rounded px-3 py-1 text-xs font-medium transition-colors ${mode === t.id ? "bg-surface shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{t.label}</button>)}
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "url" && (<>
            <Field label="URL" required>
              <div className="flex gap-2"><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" inputMode="url" />
                <Button type="button" variant="outline" onClick={fetchMeta} loading={fetching}><Wand2 className="h-4 w-4" />Fetch details</Button></div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Title" className="sm:col-span-2"><Input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} placeholder="Fetched automatically, or type one" /></Field>
              <Field label="Source type"><Select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}><option value="url">Website</option><option value="article">Technical article</option><option value="paper">Research paper</option></Select></Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Website name"><Input value={meta.site_name} onChange={(e) => setMeta({ ...meta, site_name: e.target.value })} /></Field>
              <Field label="Description"><Input value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} /></Field>
            </div>
          </>)}
          {(mode === "pdf" || mode === "image") && (<>
            <Field label={mode === "pdf" ? "PDF file" : "Image file"} required>
              <input type="file" accept={mode === "pdf" ? "application/pdf" : "image/*"} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-[13px] file:mr-3 file:rounded-md file:border file:border-border-strong file:bg-surface file:px-3 file:py-1.5 file:text-[13px] file:font-medium hover:file:bg-muted" />
              {mode === "pdf" && <p className="text-xs text-muted-foreground">Readable text is extracted so the AI assistant can use it. Scanned PDFs without a text layer can&apos;t be read.</p>}
            </Field>
            <Field label="Title"><Input name="title" placeholder={file?.name ?? "Defaults to the file name"} /></Field>
            <Field label="Description"><Input name="desc" /></Field>
          </>)}
          {mode === "note" && (<>
            <Field label="Title" required><Input name="title" placeholder="e.g. Track test observations" /></Field>
            <Field label="Note" required><Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} className="min-h-[120px]" placeholder="What did you learn or observe?" /></Field>
          </>)}
          <div className="grid gap-4 sm:grid-cols-2">
            {!projectId && <Field label="Project" required><Select value={pid} onChange={(e) => setPid(e.target.value)}>{scope.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>}
            <Field label="Subsystem"><Select name="sub" defaultValue={subsystemId ?? ""} key={pid}><option value="">None</option>{subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          </div>
          <Field label="Tags" hint="Comma-separated, e.g. suspension, roll, geometry"><Input name="tags" /></Field>
          <Field label={mode === "note" ? "Why does this matter?" : "Why is this source important?"} hint="This is what future engineers will thank you for."><Textarea name="why" placeholder="What does it tell us, and how should it influence the design?" /></Field>
          {error && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" variant="accent" loading={busy}>Save research</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

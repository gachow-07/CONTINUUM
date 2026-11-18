"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardCheck, CornerDownRight, HelpCircle, Plus, Send, Trash2 } from "lucide-react";
import { Badge, SampleBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DrawerContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ConfirmDialog, EmptyState } from "@/components/ui/misc";
import { act, fileUrl } from "@/lib/client";
import { addReviewComment, assignReviewer, createFileRecords, createReview, deleteReview, linkCommentToRevision, setCommentResolved, setReviewStatus } from "@/app/actions/knowledge";
import { formatDate, initials, timeAgo } from "@/lib/utils";
import type { Review, ReviewComment, ReviewStatus } from "@/lib/types";
import type { Scope } from "@/lib/scope";
import { FileThumb, FilterSelect, RefChip, SearchBox, Section, SubsystemTag, useOpenParam } from "./common";
import { REVIEW_STATUS } from "./meta";
import { UploadRows, useUploader, type PendingFile } from "./upload-rows";
import { useProjectPermissions } from "@/components/shell/project-permissions";

export function ReviewsView({ scope, projectId, subsystemId }: { scope: Scope; projectId?: string; subsystemId?: string }) {
  const { canWrite } = useProjectPermissions();
  const mayRequest = projectId ? canWrite(projectId) : scope.projects.some((p) => canWrite(p.id));
  const [open, setOpen] = useOpenParam();
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [project, setProject] = useState(projectId ?? "");
  const [status, setStatus] = useState("");
  const rows = scope.reviews.filter((r) => (!project || r.project_id === project) && (!subsystemId || r.subsystem_id === subsystemId) && (!status || r.status === status) && (!q || `${r.title} ${r.description} ${r.reviewer_name ?? ""}`.toLowerCase().includes(q.toLowerCase())));
  const selected = scope.reviews.find((r) => r.id === open) ?? null;
  const pname = (id: string) => scope.projects.find((p) => p.id === id)?.name ?? "";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search reviews…" />
        {!projectId && <FilterSelect value={project} onChange={setProject} label="All projects" options={scope.projects.map((p) => ({ value: p.id, label: p.name }))} />}
        <FilterSelect value={status} onChange={setStatus} label="Any status" options={Object.entries(REVIEW_STATUS).map(([v, m]) => ({ value: v, label: m.label }))} />
        {mayRequest && <Button variant="accent" onClick={() => setAdding(true)} disabled={scope.projects.length === 0}><Plus className="h-4 w-4" />Request review</Button>}
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<ClipboardCheck className="h-5 w-5" />} title={scope.reviews.length ? "No reviews match your filters" : "No reviews yet"} description="Ask a teammate to review a decision or a revision. Comments, questions and their resolutions stay on the record."
          action={mayRequest && !scope.reviews.length && <Button variant="accent" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Request a review</Button>} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const cs = scope.comments.filter((c) => c.review_id === r.id);
              const openCount = cs.filter((c) => !c.resolved && !c.parent_id).length;
              return (
                <li key={r.id}>
                  <button onClick={() => setOpen(r.id)} className="flex w-full items-start gap-3.5 px-5 py-4 text-left transition-colors hover:bg-muted/60">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><p className="text-[13px] font-semibold">{r.title}</p>{r.is_sample && <SampleBadge />}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {!projectId && <Badge>{pname(r.project_id)}</Badge>}<SubsystemTag id={r.subsystem_id} subsystems={scope.subsystems} />
                        <span>Reviewer: <span className="font-medium text-foreground">{r.reviewer_name ?? "unassigned"}</span></span><span>· Submitted {formatDate(r.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge tone={REVIEW_STATUS[r.status].tone} dot>{REVIEW_STATUS[r.status].label}</Badge>
                      <span className="text-xs text-muted-foreground">{cs.length} comment{cs.length === 1 ? "" : "s"}{openCount > 0 && <span className="text-warning"> · {openCount} open</span>}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {adding && <ReviewDialog scope={scope} projectId={projectId} subsystemId={subsystemId} onClose={() => setAdding(false)} />}
      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setOpen(null)}>{selected && <ReviewDrawer r={selected} scope={scope} onClose={() => setOpen(null)} />}</Dialog>
    </div>
  );
}

function ReviewDrawer({ r, scope, onClose }: { r: Review; scope: Scope; onClose: () => void }) {
  const { canWrite } = useProjectPermissions();
  const editable = canWrite(r.project_id);
  const router = useRouter();
  const [del, setDel] = useState(false);
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"comment" | "question">("comment");
  const [busy, setBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const members = scope.members.filter((m) => m.project_id === r.project_id);
  const revisions = scope.revisions.filter((x) => x.project_id === r.project_id);
  const comments = scope.comments.filter((c) => c.review_id === r.id);
  const top = comments.filter((c) => !c.parent_id);
  const decision = scope.decisions.find((d) => d.id === r.decision_id);
  const revision = scope.revisions.find((x) => x.id === r.revision_id);
  const file = scope.files.find((f) => f.id === r.file_id);
  const refresh = () => router.refresh();

  async function post() {
    setBusy(true);
    const res = await act(addReviewComment({ project_id: r.project_id, review_id: r.id, body, kind: replyTo ? "response" : kind, parent_id: replyTo, decision_id: r.decision_id, file_id: r.file_id }), replyTo ? "Reply posted" : "Comment posted");
    setBusy(false);
    if (res.ok) { setBody(""); setReplyTo(null); refresh(); }
  }

  const renderComment = (c: ReviewComment, reply?: boolean) => {
    const influenced = scope.revisions.find((x) => x.id === c.influenced_revision_id);
    return (
      <div key={c.id} className={`rounded-lg border p-3 ${c.resolved ? "border-success/30 bg-success-soft/40" : "border-border bg-surface"} ${reply ? "ml-6" : ""}`}>
        <div className="flex items-start gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">{initials(c.author_name)}</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 text-xs"><span className="font-semibold">{c.author_name}</span>
              {c.kind === "question" && <Badge tone="accent"><HelpCircle className="h-3 w-3" />Question</Badge>}{c.is_sample && <SampleBadge />}
              <span className="text-muted-foreground">{timeAgo(c.created_at)}</span></div>
            <p className="mt-1 whitespace-pre-wrap text-[13px]">{c.body}</p>
            {influenced && <p className="mt-2 text-xs text-muted-foreground">This feedback led to <RefChip projectId={r.project_id} type="revision" id={influenced.id} label={`${influenced.rev_label} — ${influenced.title}`} onNavigate={onClose} /></p>}
            {c.resolved && <p className="mt-1.5 flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" />Resolved by {c.resolved_by}{c.resolved_at ? ` · ${formatDate(c.resolved_at)}` : ""}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
              {!reply && editable && <button className="font-medium text-accent hover:underline" onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}>Reply</button>}
              {!reply && editable && <button className="font-medium text-foreground hover:underline" onClick={async () => { const x = await act(setCommentResolved(c.id, !c.resolved), c.resolved ? "Reopened" : "Marked resolved"); if (x.ok) refresh(); }}>{c.resolved ? "Reopen" : "Mark resolved"}</button>}
              {!reply && editable && (
                <label className="flex items-center gap-1 text-muted-foreground">Led to revision:
                  <select aria-label="Revision influenced by this comment" className="max-w-[160px] rounded border border-border bg-surface px-1 py-0.5 text-xs" value={c.influenced_revision_id ?? ""} onChange={async (e) => { const x = await act(linkCommentToRevision(c.id, e.target.value || null), "Linked"); if (x.ok) refresh(); }}>
                    <option value="">—</option>{revisions.map((v) => <option key={v.id} value={v.id}>{v.rev_label}</option>)}
                  </select></label>)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DrawerContent title={r.title} description={`Requested by ${r.requester_name} · ${formatDate(r.created_at)}`}
      actions={editable && <Button variant="danger-ghost" size="icon" aria-label="Delete review" onClick={() => setDel(true)}><Trash2 className="h-4 w-4" /></Button>}>
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        <Badge tone={REVIEW_STATUS[r.status].tone} dot>{REVIEW_STATUS[r.status].label}</Badge><SubsystemTag id={r.subsystem_id} subsystems={scope.subsystems} />{r.is_sample && <SampleBadge />}
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <Field label="Status"><Select disabled={!editable} value={r.status} onChange={async (e) => { const x = await act(setReviewStatus(r.id, e.target.value as ReviewStatus), "Status updated"); if (x.ok) refresh(); }}>{Object.entries(REVIEW_STATUS).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}</Select></Field>
        <Field label="Reviewer"><Select disabled={!editable} value={r.reviewer_member_id ?? ""} onChange={async (e) => { const x = await act(assignReviewer(r.id, e.target.value || null), "Reviewer assigned"); if (x.ok) refresh(); }}><option value="">Unassigned</option>{members.filter((m) => m.role !== "viewer" || m.id === r.reviewer_member_id).map((m) => <option key={m.id} value={m.id} disabled={m.role === "viewer"}>{m.display_name}{m.role === "viewer" ? " (view-only)" : ""}</option>)}</Select></Field>
      </div>
      {r.description && <Section title="Request"><p className="whitespace-pre-wrap">{r.description}</p></Section>}
      {(decision || revision || file) && (
        <Section title="Linked to">
          <div className="flex flex-wrap gap-1.5">
            {decision && <RefChip projectId={r.project_id} type="decision" id={decision.id} label={decision.title} onNavigate={onClose} />}
            {revision && <RefChip projectId={r.project_id} type="revision" id={revision.id} label={`${revision.rev_label} — ${revision.title}`} onNavigate={onClose} />}
            {file && <RefChip projectId={r.project_id} type="file" id={file.id} label={file.name} onNavigate={onClose} />}
          </div>
          {file && <a href={fileUrl(file.storage_path)} target="_blank" rel="noopener noreferrer" className="mt-3 block aspect-[16/8] max-w-sm overflow-hidden rounded-lg border border-border bg-muted"><FileThumb file={file} /></a>}
        </Section>)}
      <Section title={`Discussion (${comments.length})`}>
        {top.length === 0 ? <p className="text-muted-foreground">{editable ? "No comments yet. Start the discussion below." : "No comments yet."}</p> : (
          <div className="space-y-3">{top.map((c) => (
            <div key={c.id} className="space-y-2">{renderComment(c)}{comments.filter((x) => x.parent_id === c.id).map((x) => renderComment(x, true))}
              {replyTo === c.id && <div className="ml-6 flex items-start gap-2"><CornerDownRight className="mt-2.5 h-4 w-4 text-muted-foreground" /><Textarea autoFocus value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[64px]" placeholder={`Reply to ${c.author_name}…`} />
                <Button variant="accent" size="icon" loading={busy} disabled={!body.trim()} onClick={post} aria-label="Send reply"><Send className="h-4 w-4" /></Button></div>}
            </div>))}
          </div>)}
      </Section>
      {editable && !replyTo && (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <div className="mb-2 flex gap-1" role="tablist">{(["comment", "question"] as const).map((k) => <button key={k} role="tab" aria-selected={kind === k} onClick={() => setKind(k)} className={`rounded px-2.5 py-1 text-xs font-medium ${kind === k ? "bg-surface shadow-sm" : "text-muted-foreground"}`}>{k === "comment" ? "Comment" : "Technical question"}</button>)}</div>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={kind === "question" ? "Ask a technical question…" : "Leave feedback…"} className="min-h-[72px] bg-surface" />
          <div className="mt-2 flex justify-end"><Button variant="accent" size="sm" loading={busy} disabled={!body.trim()} onClick={post}><Send className="h-3.5 w-3.5" />Post</Button></div>
        </div>)}
      <ConfirmDialog open={del} onOpenChange={setDel} title="Delete this review?" description="The review and all of its comments are permanently deleted." onConfirm={async () => { const x = await act(deleteReview(r.id), "Review deleted"); if (x.ok) { onClose(); refresh(); } }} />
    </DrawerContent>
  );
}

function ReviewDialog({ scope, projectId, subsystemId, onClose }: { scope: Scope; projectId?: string; subsystemId?: string; onClose: () => void }) {
  const router = useRouter();
  const { canWrite } = useProjectPermissions();
  const writableProjects = scope.projects.filter((p) => canWrite(p.id));
  const { upload, progress } = useUploader();
  const [pid, setPid] = useState(projectId ?? writableProjects[0]?.id ?? "");
  const [f, setF] = useState({ title: "", description: "", subsystem_id: subsystemId ?? "", decision_id: "", revision_id: "", file_id: "", reviewer: "" });
  const [items, setItems] = useState<PendingFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const members = scope.members.filter((m) => m.project_id === pid && m.role !== "viewer");
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent wide title="Request a review" description="Ask a teammate to review a decision, revision or document.">
        <div className="space-y-4">
          <Field label="Title" required><Input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Review: steering linkage geometry" autoFocus /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            {!projectId && <Field label="Project" required><Select value={pid} onChange={(e) => { setPid(e.target.value); setF({ ...f, subsystem_id: "", decision_id: "", revision_id: "", file_id: "", reviewer: "" }); }}>{writableProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>}
            <Field label="Reviewer"><Select value={f.reviewer} onChange={(e) => set("reviewer", e.target.value)}><option value="">Assign later</option>{members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}</Select></Field>
            <Field label="Subsystem"><Select value={f.subsystem_id} onChange={(e) => set("subsystem_id", e.target.value)}><option value="">None</option>{scope.subsystems.filter((s) => s.project_id === pid).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
            <Field label="Design decision under review"><Select value={f.decision_id} onChange={(e) => set("decision_id", e.target.value)}><option value="">None</option>{scope.decisions.filter((d) => d.project_id === pid).map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</Select></Field>
            <Field label="Revision under review"><Select value={f.revision_id} onChange={(e) => set("revision_id", e.target.value)}><option value="">None</option>{scope.revisions.filter((d) => d.project_id === pid).map((d) => <option key={d.id} value={d.id}>{d.rev_label} — {d.title}</option>)}</Select></Field>
            <Field label="Attach an existing file"><Select value={f.file_id} onChange={(e) => set("file_id", e.target.value)}><option value="">None</option>{scope.files.filter((d) => d.project_id === pid).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
          </div>
          <Field label="What should the reviewer look at?"><Textarea value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Explain what you'd like feedback on." /></Field>
          <Field label="Or upload a new CAD image / document"><UploadRows items={items} onChange={setItems} /></Field>
          {error && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}
          <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{progress}</span>
            <div className="flex gap-2"><Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
              <Button variant="accent" loading={busy} onClick={async () => {
                if (!f.title.trim()) return setError("Give the review a title.");
                setBusy(true); setError("");
                try {
                  let fileId = f.file_id || null;
                  if (items.length) { const files = await upload(pid, items); const up = await createFileRecords(pid, f.subsystem_id || null, files); if (!up.ok) { setError(up.error); setBusy(false); return; } fileId = up.ids[0]; }
                  const r = await act(createReview({ project_id: pid, title: f.title, description: f.description, subsystem_id: f.subsystem_id || null, decision_id: f.decision_id || null, revision_id: f.revision_id || null, file_id: fileId, reviewer_member_id: f.reviewer || null }), "Review requested");
                  if (r.ok) { onClose(); router.refresh(); } else setError(r.error);
                } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
              }}>Submit review request</Button></div></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

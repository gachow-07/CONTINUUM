"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/misc";
import { SampleBadge } from "@/components/ui/badge";
import { act } from "@/lib/client";
import { createNote, deleteNote, setNoteStatus } from "@/app/actions/knowledge";
import type { NoteKind, ProjectNote, Subsystem } from "@/lib/types";
import { SubsystemTag } from "./common";

const LABEL: Record<NoteKind, { add: string; empty: string; ph: string }> = {
  background: { add: "Add background", empty: "No background recorded.", ph: "What was the team trying to accomplish?" },
  lesson: { add: "Add lesson", empty: "No lessons learned recorded yet.", ph: "What failed, what did you learn?" },
  issue: { add: "Add issue", empty: "No unresolved issues recorded.", ph: "What problem still needs attention?" },
  next_step: { add: "Add next step", empty: "No next steps recorded.", ph: "What should the next engineer do?" },
};

export function NotesPanel({ notes, kind, projectId, subsystems, trackStatus }: { notes: ProjectNote[]; kind: NoteKind; projectId: string; subsystems: Subsystem[]; trackStatus?: boolean }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<ProjectNote | null>(null);
  const [error, setError] = useState("");
  const items = notes.filter((n) => n.kind === kind);
  return (
    <div>
      {items.length === 0 ? <p className="text-[13px] text-muted-foreground">{LABEL[kind].empty}</p> : (
        <ul className="space-y-2.5">
          {items.map((n) => (
            <li key={n.id} className="group flex gap-3 rounded-lg border border-border bg-surface p-3.5">
              {trackStatus && <button aria-label={n.status === "open" ? "Mark resolved" : "Reopen"} className="mt-0.5 shrink-0 text-muted-foreground hover:text-success" onClick={async () => { const r = await act(setNoteStatus(n.id, n.status === "open" ? "resolved" : "open"), n.status === "open" ? "Marked done" : "Reopened"); if (r.ok) router.refresh(); }}>{n.status === "resolved" ? <CheckCircle2 className="h-4.5 w-4.5 text-success" /> : <Circle className="h-4.5 w-4.5" />}</button>}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><p className={`text-[13px] font-semibold ${n.status === "resolved" ? "text-muted-foreground line-through" : ""}`}>{n.title}</p><SubsystemTag id={n.subsystem_id} subsystems={subsystems} />{n.is_sample && <SampleBadge />}</div>
                {n.body && <p className="mt-1 text-[13px] text-muted-foreground">{n.body}</p>}
                <p className="mt-1.5 text-[11px] text-muted-foreground">{n.author_name}</p>
              </div>
              <button aria-label="Delete" className="self-start rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-danger focus:opacity-100 group-hover:opacity-100" onClick={() => setDel(n)}><Trash2 className="h-3.5 w-3.5" /></button>
            </li>))}
        </ul>)}
      <Button variant="outline" size="sm" className="mt-3" onClick={() => setAdding(true)}><Plus className="h-3.5 w-3.5" />{LABEL[kind].add}</Button>
      {adding && (
        <Dialog open onOpenChange={(o) => !o && setAdding(false)}>
          <DialogContent title={LABEL[kind].add}>
            <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setError("");
              const r = await act(createNote({ project_id: projectId, kind, title: String(f.get("title")), body: String(f.get("body")), subsystem_id: String(f.get("sub")) || null }), "Saved");
              setBusy(false); if (r.ok) { setAdding(false); router.refresh(); } else setError(r.error);
            }}>
              <Field label="Title" required><Input name="title" autoFocus /></Field>
              <Field label="Details"><Textarea name="body" placeholder={LABEL[kind].ph} /></Field>
              <Field label="Subsystem"><Select name="sub" defaultValue=""><option value="">None</option>{subsystems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
              {error && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancel</Button><Button type="submit" variant="accent" loading={busy}>Save</Button></div>
            </form>
          </DialogContent>
        </Dialog>)}
      <ConfirmDialog open={Boolean(del)} onOpenChange={(o) => !o && setDel(null)} title="Delete this entry?" description="This permanently removes it from the project record." onConfirm={async () => { if (!del) return; const r = await act(deleteNote(del.id), "Deleted"); if (r.ok) router.refresh(); }} />
    </div>
  );
}

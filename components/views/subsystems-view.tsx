"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, FileText, Layers, Pencil, Plus, Scale, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { ConfirmDialog, EmptyState } from "@/components/ui/misc";
import { act } from "@/lib/client";
import { createSubsystem, deleteSubsystem, updateSubsystem } from "@/app/actions/knowledge";
import type { Subsystem } from "@/lib/types";
import type { Scope } from "@/lib/scope";

export function SubsystemDialog({ projectId, subsystem, onClose }: { projectId: string; subsystem?: Subsystem; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={subsystem ? "Edit subteam" : "New subteam"}>
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault(); const f = new FormData(e.currentTarget); setError(""); setBusy(true);
          const name = String(f.get("name")), description = String(f.get("description"));
          const r = subsystem ? await act(updateSubsystem(subsystem.id, name, description), "Subteam updated") : await act(createSubsystem(projectId, name, description), "Subteam created");
          setBusy(false); if (r.ok) { onClose(); router.refresh(); } else setError(r.error);
        }}>
          <Field label="Name" required><Input name="name" defaultValue={subsystem?.name} placeholder="e.g. Drivetrain" autoFocus maxLength={80} /></Field>
          <Field label="Description"><Textarea name="description" defaultValue={subsystem?.description} placeholder="What does this subteam work on?" /></Field>
          {error && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" variant="accent" loading={busy}>{subsystem ? "Save" : "Create subteam"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SubsystemActions({ subsystem, redirectTo }: { subsystem: Subsystem; redirectTo?: string }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [del, setDel] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setEdit(true)}><Pencil className="h-3.5 w-3.5" />Rename / edit</Button>
      <Button variant="danger-ghost" size="sm" onClick={() => setDel(true)}><Trash2 className="h-3.5 w-3.5" />Delete</Button>
      {edit && <SubsystemDialog projectId={subsystem.project_id} subsystem={subsystem} onClose={() => setEdit(false)} />}
      <ConfirmDialog open={del} onOpenChange={setDel} title={`Delete “${subsystem.name}”?`} description="The subteam and its created components are removed. Its research, files, revisions and decisions are kept but become unassigned." onConfirm={async () => { const r = await act(deleteSubsystem(subsystem.id), "Subteam deleted"); if (r.ok) { if (redirectTo) router.push(redirectTo); router.refresh(); } }} />
    </>
  );
}

export function SubsystemsView({ scope, projectId }: { scope: Scope; projectId: string }) {
  const [adding, setAdding] = useState(false);
  const subs = scope.subsystems.filter((s) => s.project_id === projectId);
  return (
    <div>
      <div className="mb-4 flex justify-between gap-3">
        <p className="max-w-xl text-[13px] text-muted-foreground">Each subsystem is its own mini-workspace — with its own research, files, decisions and revision history — that stays connected to the project.</p>
        <Button variant="accent" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />New subsystem</Button>
      </div>
      {subs.length === 0 ? (
        <EmptyState icon={<Layers className="h-5 w-5" />} title="No subsystems yet" description="Break the project into parts — for an RC car: Suspension, Steering, Chassis, Drivetrain." action={<Button variant="accent" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Create subsystem</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subs.map((s) => {
            const n = { r: scope.research.filter((x) => x.subsystem_id === s.id).length, d: scope.decisions.filter((x) => x.subsystem_id === s.id).length, f: scope.files.filter((x) => x.subsystem_id === s.id).length, v: scope.revisions.filter((x) => x.subsystem_id === s.id).length };
            return (
              <Link key={s.id} href={`/projects/${projectId}/subsystems/${s.id}`} className="group rounded-lg border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-pop)]">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-soft text-accent"><Layers className="h-4.5 w-4.5" /></div>
                <h3 className="mt-3 text-[15px] font-semibold">{s.name}</h3>
                <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-[13px] text-muted-foreground">{s.description || "No description."}</p>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1" title="Research"><BookOpen className="h-3.5 w-3.5" />{n.r}</span><span className="inline-flex items-center gap-1" title="Decisions"><Scale className="h-3.5 w-3.5" />{n.d}</span>
                  <span className="inline-flex items-center gap-1" title="Files"><FileText className="h-3.5 w-3.5" />{n.f}</span><span className="ml-auto text-muted-foreground">{n.v} revision{n.v === 1 ? "" : "s"}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {adding && <SubsystemDialog projectId={projectId} onClose={() => setAdding(false)} />}
    </div>
  );
}

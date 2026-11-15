"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Archive, ArchiveRestore, FlaskConical, ImagePlus, MoreHorizontal, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/misc";
import { act, uploadToProject } from "@/lib/client";
import { createProject, createSampleProject, updateProject } from "@/app/actions/projects";
import type { Project } from "@/lib/types";

const CATEGORIES = ["Mechanical", "Mechanical / Vehicle", "Aerospace", "Electrical", "Robotics", "Embedded / Software", "Civil / Structural", "Biomedical", "Research", "General"];

export function ProjectFormDialog({ open, onOpenChange, project }: { open: boolean; onOpenChange: (o: boolean) => void; project?: Project }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const editing = Boolean(project);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name")).trim();
    if (!name) return setError("Project name is required.");
    const base = {
      name, description: String(f.get("description")), category: String(f.get("category")).trim() || "General",
      status: String(f.get("status")) as Project["status"],
    };
    setBusy(true);
    if (editing) {
      let cover_path: string | undefined;
      if (cover) { try { cover_path = await uploadToProject(project!.id, cover); } catch (err) { setBusy(false); return setError((err as Error).message); } }
      const r = await act(updateProject(project!.id, { ...base, ...(cover_path ? { cover_path } : {}) }), "Project updated");
      setBusy(false);
      if (r.ok) { onOpenChange(false); router.refresh(); }
      return;
    }
    const subsystems = String(f.get("subsystems")).split(",").map((s) => s.trim()).filter(Boolean);
    const members = String(f.get("members")).split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
    const r = await act(createProject({ ...base, subsystems, members }));
    if (!r.ok) { setBusy(false); return setError(r.error); }
    if (cover) {
      try { const path = await uploadToProject(r.id, cover); await updateProject(r.id, { cover_path: path }); }
      catch (err) { setError(`Project created, but the cover failed to upload: ${(err as Error).message}`); }
    }
    r.warnings.forEach((w) => setError((p) => (p ? p + " " : "") + `Couldn't add ${w}`));
    setBusy(false);
    onOpenChange(false);
    router.push(`/projects/${r.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent wide title={editing ? "Edit project" : "Create a new project"} description={editing ? undefined : "Everything your team learns about this project will live here."}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Project name" required><Input name="name" defaultValue={project?.name} placeholder="e.g. RC Car Design" autoFocus maxLength={120} /></Field>
          <Field label="Description"><Textarea name="description" defaultValue={project?.description} placeholder="What are you building, and why?" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <Input name="category" list="project-categories" defaultValue={project?.category ?? "Mechanical"} />
              <datalist id="project-categories">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={project?.status ?? "active"}>
                <option value="planning">Planning</option><option value="active">Active</option><option value="on_hold">On hold</option><option value="completed">Completed</option>
              </Select>
            </Field>
          </div>
          <Field label="Cover image" hint="Optional. PNG, JPG, WebP or SVG.">
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><ImagePlus className="h-4 w-4" />{cover ? "Change image" : "Choose image"}</Button>
              <span className="truncate text-xs text-muted-foreground">{cover?.name ?? (project?.cover_path ? "Current cover will be kept" : "No image selected")}</span>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
            </div>
          </Field>
          {!editing && (
            <>
              <Field label="Starting subsystems" hint="Comma-separated, e.g. Suspension, Steering, Chassis. You can change these any time."><Input name="subsystems" placeholder="Suspension, Steering, Chassis" /></Field>
              <Field label="Team members" hint="Invite teammates with a CONTINUUM account (comma-separated). They must accept before joining."><Input name="members" placeholder="teammate@school.edu" /></Field>
            </>
          )}
          {error && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="accent" loading={busy}>{editing ? "Save changes" : "Create project"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateProjectButton({ label = "Create New Project", variant = "accent", size = "md" }: { label?: string; variant?: "accent" | "primary" | "outline"; size?: "sm" | "md" | "lg" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{label}</Button>
      {open && <ProjectFormDialog open={open} onOpenChange={setOpen} />}
    </>
  );
}

/** A full-width list row that opens the same "new project" dialog as CreateProjectButton. */
export function NewProjectRow({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <span className="grid h-10 w-[84px] shrink-0 place-items-center rounded-[10px] border border-dashed border-white/15 transition-colors group-hover:border-[#22d3ee]/50"><Plus className="h-4 w-4" /></span>
        <span className="text-left"><span className="block text-[13.5px] font-semibold">New project</span><span className="block text-[11.5px] text-[#6c7178]">Start a workspace for research, decisions and reviews</span></span>
      </button>
      {open && <ProjectFormDialog open={open} onOpenChange={setOpen} />}
    </>
  );
}

export function LoadSampleButton({ variant = "outline" }: { variant?: "outline" | "primary" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button variant={variant} loading={busy} onClick={async () => {
      setBusy(true);
      const r = await act(createSampleProject(), "Sample project loaded — it's labelled as demonstration data.");
      setBusy(false);
      if (r.ok) router.push(`/projects/${r.id}`);
    }}><FlaskConical className="h-4 w-4" />Load sample project (RC Car Design)</Button>
  );
}

export function ProjectMenu({ project }: { project: Project }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [archive, setArchive] = useState(false);
  return (
    <div className="relative">
      <Button variant="outline" size="icon" aria-label="Project actions" onClick={() => setOpen((o) => !o)}><MoreHorizontal className="h-4 w-4" /></Button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-1.5 w-48 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-[var(--shadow-pop)]" role="menu">
            <button role="menuitem" className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] hover:bg-muted" onClick={() => { setOpen(false); setEdit(true); }}><Pencil className="h-4 w-4 text-muted-foreground" />Edit project</button>
            <button role="menuitem" className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] hover:bg-muted" onClick={() => { setOpen(false); if (project.archived) act(updateProject(project.id, { archived: false }), "Project restored").then(() => router.refresh()); else setArchive(true); }}>
              {project.archived ? <ArchiveRestore className="h-4 w-4 text-muted-foreground" /> : <Archive className="h-4 w-4 text-muted-foreground" />}{project.archived ? "Restore project" : "Archive project"}
            </button>
          </div>
        </>
      )}
      {edit && <ProjectFormDialog open={edit} onOpenChange={setEdit} project={project} />}
      <ConfirmDialog open={archive} onOpenChange={setArchive} title="Archive this project?" description="It will be hidden from your dashboard and lists but all knowledge is kept. You can restore it any time." confirmLabel="Archive"
        onConfirm={async () => { const r = await act(updateProject(project.id, { archived: true }), "Project archived"); if (r.ok) router.push("/projects"); }} />
    </div>
  );
}

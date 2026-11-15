"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createProjectComponent, deleteProjectComponent, renameProjectComponent } from "@/app/actions/review-targets";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/misc";
import { act } from "@/lib/client";
import type { ProjectComponent } from "@/lib/types";
export function SubteamComponents({ projectId, subteamId, components }: { projectId: string; subteamId: string; components: ProjectComponent[] }) {
  const [name, setName] = useState(""); const [busy, setBusy] = useState(false); const [editing, setEditing] = useState<string | null>(null); const [editName, setEditName] = useState(""); const [removing, setRemoving] = useState<ProjectComponent | null>(null); const router = useRouter();
  return <><Card><CardHeader title="Components" description="Create components for this subteam. Assigned 3D model parts can also be selected in reviews." />
    <div className="space-y-3 p-4">{components.length ? <ul className="space-y-2">{components.map((c) => <li key={c.id} className="flex items-center gap-2 text-sm">{editing === c.id ? <form className="flex min-w-0 flex-1 gap-2" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { const r = await act(renameProjectComponent(c.id, editName), "Component renamed"); if (r.ok) { setEditing(null); router.refresh(); } } finally { setBusy(false); } }}><Input aria-label="Edit component name" value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={120} /><Button type="submit" variant="outline" disabled={!editName.trim()} loading={busy}>Save</Button><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></form> : <><span className="min-w-0 flex-1 truncate">{c.name}</span><Button size="sm" variant="ghost" onClick={() => { setEditing(c.id); setEditName(c.name); }}>Edit</Button><Button size="sm" variant="danger-ghost" onClick={() => setRemoving(c)}>Remove</Button></>}</li>)}</ul> : <p className="text-xs text-muted-foreground">No components created yet.</p>}
      <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (!name.trim()) return; setBusy(true); try { const r = await act(createProjectComponent(projectId, subteamId, name), "Component added"); if (r.ok) { setName(""); router.refresh(); } } finally { setBusy(false); } }}><Input aria-label="New component name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Component name" maxLength={120} /><Button type="submit" variant="outline" loading={busy} disabled={!name.trim()}><Plus className="h-4 w-4" />Add</Button></form>
      <Link href={`/projects/${projectId}/research`} className="inline-block text-xs font-medium text-accent hover:underline">View and assign 3D model parts →</Link>
    </div></Card><ConfirmDialog open={Boolean(removing)} onOpenChange={(open) => !open && setRemoving(null)} title={`Remove ${removing?.name ?? "component"}?`} description="Past reviews keep the recorded component name." confirmLabel="Remove" onConfirm={async () => { if (!removing) return; const r = await act(deleteProjectComponent(removing.id), "Component removed"); if (r.ok) router.refresh(); }} /></>;
}

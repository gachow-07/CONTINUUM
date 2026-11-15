"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, UserPlus } from "lucide-react";
import { Badge, SampleBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/misc";
import { act } from "@/lib/client";
import { cancelInvitation } from "@/app/actions/invitations";
import { addMemberByEmail, addTeammateName, removeMember, updateMemberRole } from "@/app/actions/projects";
import { initials } from "@/lib/utils";
import type { Member, Project } from "@/lib/types";

export function TeamManager({ project, members, isOwner, currentUserId, invitations }: { project: Project; members: Member[]; isOwner: boolean; currentUserId: string; invitations: { id: string; invitee_email: string; role: string }[] }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [busy, setBusy] = useState(false);
  const [rm, setRm] = useState<Member | null>(null);
  const isEmail = value.includes("@");

  return (
    <Card>
      <CardHeader title={project.name} description={`${members.length} member${members.length === 1 ? "" : "s"}`} action={project.is_sample ? <SampleBadge /> : undefined} />
      <ul className="divide-y divide-border">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-5 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">{initials(m.display_name)}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium">{m.display_name}{m.user_id === currentUserId && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}</p>
              <p className="truncate text-xs text-muted-foreground">{m.email ?? "No account linked"}{!m.user_id && " · name only"}</p></div>
            {m.role === "owner" || !isOwner ? <Badge tone={m.role === "owner" ? "accent" : "neutral"} className="capitalize">{m.role}</Badge> : (
              <>
                <Select aria-label={`Role for ${m.display_name}`} className="h-8 w-auto py-0 text-xs" value={m.role} onChange={async (e) => { const r = await act(updateMemberRole(m.id, e.target.value as "editor" | "viewer"), "Role updated"); if (r.ok) router.refresh(); }}><option value="editor">Editor</option><option value="viewer">Viewer</option></Select>
                <Button variant="danger-ghost" size="icon" aria-label={`Remove ${m.display_name}`} onClick={() => setRm(m)}><Trash2 className="h-4 w-4" /></Button>
              </>)}
          </li>))}
      </ul>
      {isOwner && invitations.length > 0 && <div className="border-t border-border px-5 py-3"><p className="mb-2 text-xs font-semibold text-muted-foreground">Pending invitations</p><ul className="space-y-2">{invitations.map((i) => <li key={i.id} className="flex items-center gap-2 text-xs"><span className="min-w-0 flex-1 truncate">{i.invitee_email} · {i.role}</span><Badge tone="neutral">Pending</Badge><Button variant="ghost" size="sm" onClick={async () => { const r = await act(cancelInvitation(i.id), "Invitation cancelled"); if (r.ok) router.refresh(); }}>Cancel invite</Button></li>)}</ul></div>}
      {isOwner ? (
        <form className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/40 px-5 py-3" onSubmit={async (e) => {
          e.preventDefault(); if (!value.trim()) return; setBusy(true);
          const r = await act(isEmail ? addMemberByEmail(project.id, value, role) : addTeammateName(project.id, value, role), isEmail ? "Invitation created" : "Teammate added by name");
          setBusy(false); if (r.ok) { setValue(""); router.refresh(); }
        }}>
          <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Teammate email (existing account) or a name" className="min-w-[220px] flex-1" aria-label="Add teammate by email or name" />
          <Select value={role} onChange={(e) => setRole(e.target.value as "editor" | "viewer")} className="w-auto" aria-label="Role"><option value="editor">Editor</option><option value="viewer">Viewer</option></Select>
          <Button type="submit" variant="accent" loading={busy} disabled={!value.trim()}><UserPlus className="h-4 w-4" />{isEmail ? "Invite" : "Add"}</Button>
        </form>) : <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">Only the project owner can change the team.</p>}
      <ConfirmDialog open={Boolean(rm)} onOpenChange={(o) => !o && setRm(null)} title={`Remove ${rm?.display_name}?`} description="They lose access to this project immediately. Anything they contributed stays in the record." confirmLabel="Remove" onConfirm={async () => { if (!rm) return; const r = await act(removeMember(rm.id), "Member removed"); if (r.ok) router.refresh(); }} />
    </Card>
  );
}

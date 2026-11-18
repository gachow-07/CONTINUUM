"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/misc";
import { act } from "@/lib/client";
import { cancelTeamInvitation, changeTeamRole, createTeam, inviteToTeam, removeFromTeam, switchTeam, transferTeamOwnership } from "@/app/actions/organizations";

export type Workspace = { id: string; name: string; kind: "personal" | "team" };
export type TeamMember = { user_id: string; full_name: string; email: string | null; role: "owner" | "admin" | "member"; created_at: string };
export type TeamInvitation = { id: string; invitee_email: string; role: "admin" | "member" };

export function OrganizationManager({ workspaces, activeId, role, roster, invitations, currentUserId }: {
  workspaces: Workspace[]; activeId: string | null; role: "owner" | "admin" | "member" | null;
  roster: TeamMember[]; invitations: TeamInvitation[]; currentUserId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const [transferring, setTransferring] = useState<TeamMember | null>(null);
  const active = workspaces.find((w) => w.id === activeId);
  const isAdmin = active?.kind === "team" && (role === "owner" || role === "admin");
  const run = async (task: () => Promise<{ ok: boolean }>) => {
    setBusy(true);
    try { const result = await task(); if (result.ok) router.refresh(); return result.ok; }
    finally { setBusy(false); }
  };
  return <Card>
    <CardHeader title="Team workspaces" description="Team membership manages the people in your organization. Projects remain private until shared separately." />
    <div className="space-y-4 p-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-56 flex-1 space-y-1 text-xs font-medium">Active workspace
          <Select aria-label="Active workspace" value={activeId ?? ""} disabled={busy || !workspaces.length} onChange={(e) => void run(() => act(switchTeam(e.target.value), "Workspace changed"))}>
            {!activeId && <option value="">Select a workspace</option>}{workspaces.map((w) => <option key={w.id} value={w.id}>{w.name} {w.kind === "personal" ? "(personal)" : "(team)"}</option>)}
          </Select>
        </label>
      </div>
      <p className="text-xs text-muted-foreground">New projects are created in the active workspace. Switching doesn’t change who can see your existing projects.</p>
      <form className="flex flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); if (await run(() => act(createTeam(name), "Team workspace created"))) setName(""); }}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New team name" maxLength={120} aria-label="New team name" className="min-w-48 flex-1" />
        <Button type="submit" variant="outline" disabled={!name.trim() || busy}><Building2 className="h-4 w-4" />Create team</Button>
      </form>
      {active?.kind === "team" && <div className="space-y-4 border-t border-border pt-4">
        <div><h3 className="text-sm font-semibold">{active.name}</h3><p className="mt-1 text-xs text-muted-foreground">Your team role: {role ?? "unavailable"}. Team roles do not grant project access.</p></div>
        {!isAdmin ? <p className="text-xs text-muted-foreground">Contact a team administrator to manage membership.</p> : <>
          <div><h4 className="mb-2 text-xs font-semibold">Members ({roster.length})</h4>
            <ul className="divide-y divide-border rounded-lg border border-border">{roster.map((member) => {
              const mayManage = member.role !== "owner" && member.user_id !== currentUserId && (role === "owner" || member.role === "member");
              return <li key={member.user_id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <div className="min-w-40 flex-1"><p className="truncate font-medium">{member.full_name}{member.user_id === currentUserId ? " (you)" : ""}</p><p className="truncate text-xs text-muted-foreground">{member.email}</p></div>
                {mayManage && role === "owner" ? <Select aria-label={`Team role for ${member.full_name}`} value={member.role} disabled={busy} className="w-32" onChange={(e) => void run(() => act(changeTeamRole(active.id, member.user_id, e.target.value as "admin" | "member"), "Team role updated"))}><option value="member">Member</option><option value="admin">Admin</option></Select> : <span className="text-xs capitalize text-muted-foreground">{member.role}</span>}
                {mayManage && <Button variant="danger-ghost" size="sm" disabled={busy} onClick={() => setRemoving(member)}>Remove</Button>}
                {role === "owner" && member.user_id !== currentUserId && <Button variant="ghost" size="sm" disabled={busy} onClick={() => setTransferring(member)}>Transfer ownership</Button>}
              </li>;
            })}</ul>
          </div>
          <form className="flex flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); if (await run(() => act(inviteToTeam(active.id, email, inviteRole), "Team invitation created"))) setEmail(""); }}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Teammate’s verified account email" aria-label="Invite email" className="min-w-48 flex-1" required />
            {role === "owner" && <Select aria-label="Team role for invitation" value={inviteRole} className="w-32" onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}><option value="member">Member</option><option value="admin">Admin</option></Select>}
            <Button type="submit" variant="accent" disabled={busy || !email.trim()}><UserPlus className="h-4 w-4" />Invite to team</Button>
          </form>
          <p className="text-xs text-muted-foreground">The person must already have a verified CONTINUUM account. They accept in their inbox; no email is sent yet.</p>
          {invitations.length > 0 && <div><h4 className="mb-2 text-xs font-semibold">Pending invitations</h4><ul className="space-y-2">{invitations.map((i) => <li key={i.id} className="flex items-center gap-2 text-xs"><span className="min-w-0 flex-1 truncate">{i.invitee_email} · {i.role}</span><Button variant="ghost" size="sm" disabled={busy} onClick={() => void run(() => act(cancelTeamInvitation(i.id), "Invitation cancelled"))}>Cancel</Button></li>)}</ul></div>}
        </>}
      </div>}
    </div>
    <ConfirmDialog open={Boolean(removing)} onOpenChange={(open) => !open && setRemoving(null)} title={`Remove ${removing?.full_name} from this team?`} description="Their access to this team's projects is removed. Their account and projects outside this team stay intact. Project owners must transfer ownership first." confirmLabel="Remove member" onConfirm={async () => { if (removing && active) await run(() => act(removeFromTeam(active.id, removing.user_id), "Team member removed")); }} />
    <ConfirmDialog open={Boolean(transferring)} onOpenChange={(open) => !open && setTransferring(null)} title={`Transfer team ownership to ${transferring?.full_name}?`} description="They become the team owner. You remain a team administrator." confirmLabel="Transfer ownership" onConfirm={async () => { if (transferring && active) await run(() => act(transferTeamOwnership(active.id, transferring.user_id), "Team ownership transferred")); }} />
  </Card>;
}

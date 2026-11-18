"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { respondToTeamInvitation } from "@/app/actions/organizations";
import { Button } from "@/components/ui/button";
import { act } from "@/lib/client";
import { formatDate } from "@/lib/utils";

export type OrganizationInvitation = { id: string; organization_id: string; organization_name: string; inviter_name: string; role: "admin" | "member"; created_at: string };

export function OrganizationInviteInbox({ invitations }: { invitations: OrganizationInvitation[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  async function respond(invitation: OrganizationInvitation, accept: boolean) {
    setBusy(invitation.id);
    try {
      const result = await act(respondToTeamInvitation(invitation.id, accept), accept ? "Team invitation accepted" : "Team invitation declined");
      if (result.ok) router.refresh();
    } finally { setBusy(null); }
  }
  return <ul className="space-y-3">{invitations.map((invitation) => <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface p-5 shadow-card">
    <div><h3 className="text-sm font-semibold">{invitation.organization_name}</h3><p className="mt-1 text-[13px] text-muted-foreground">{invitation.inviter_name} invited you to the team as {invitation.role === "admin" ? "an administrator" : "a member"} · {formatDate(invitation.created_at)}</p><p className="mt-1 text-xs text-muted-foreground">Joining the team does not grant access to individual projects.</p></div>
    <div className="flex gap-2"><Button variant="outline" disabled={busy !== null} onClick={() => void respond(invitation, false)}>Decline</Button><Button variant="accent" loading={busy === invitation.id} disabled={busy !== null} onClick={() => void respond(invitation, true)}>Accept invitation</Button></div>
  </li>)}</ul>;
}

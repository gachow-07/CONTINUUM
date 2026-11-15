"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { respondToInvitation } from "@/app/actions/invitations";
import { Button } from "@/components/ui/button";
import { act } from "@/lib/client";
import { formatDate } from "@/lib/utils";

export type Invitation = { id: string; project_id: string; project_name: string; inviter_name: string; role: "editor" | "viewer"; created_at: string };
export function InviteInbox({ invitations }: { invitations: Invitation[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  async function respond(invite: Invitation, accept: boolean) {
    setBusy(invite.id);
    try {
      const r = await act(respondToInvitation(invite.id, accept), accept ? "Invitation accepted" : "Invitation declined");
      if (r.ok) { if (accept) router.push(`/projects/${r.projectId}`); router.refresh(); }
    } finally { setBusy(null); }
  }
  return <ul className="space-y-3">{invitations.map((invitation) => <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface p-5 shadow-card">
    <div><h2 className="text-sm font-semibold">{invitation.project_name}</h2><p className="mt-1 text-[13px] text-muted-foreground">{invitation.inviter_name} invited you as {invitation.role === "editor" ? "an editor" : "a viewer"} · {formatDate(invitation.created_at)}</p></div>
    <div className="flex gap-2"><Button variant="outline" disabled={busy !== null} onClick={() => void respond(invitation, false)}>Decline</Button><Button variant="accent" loading={busy === invitation.id} disabled={busy !== null} onClick={() => void respond(invitation, true)}>Accept invitation</Button></div>
  </li>)}</ul>;
}

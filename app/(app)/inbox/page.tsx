import { Inbox } from "lucide-react";
import { PageHeader, EmptyState, SetupNotice } from "@/components/ui/misc";
import { InviteInbox, type Invitation } from "@/components/views/invite-inbox";
import { OrganizationInviteInbox, type OrganizationInvitation } from "@/components/views/organization-invite-inbox";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Inbox" };
export default async function InboxPage() {
  const { supabase } = await requireSession();
  const { data, error } = await supabase.rpc("list_my_project_invitations");
  const teams = await supabase.rpc("list_my_organization_invitations");
  const invitations = (data ?? []) as Invitation[];
  const teamInvitations = (teams.data ?? []) as OrganizationInvitation[];
  return <div className="animate-fade-in"><PageHeader title="Inbox" description="Review team and project invitations. You only join when you accept." />
    {error && <SetupNotice title="Project invitations are unavailable">Ask your project administrator to check the database setup.</SetupNotice>}
    {teams.error && <SetupNotice title="Team invitations are unavailable">Ask your administrator to check the team workspace database setup.</SetupNotice>}
    {!error && !teams.error && !invitations.length && !teamInvitations.length && <EmptyState icon={<Inbox className="h-5 w-5" />} title="No invitations" description="Team and project invitations will appear here when someone invites you." />}
    {teamInvitations.length > 0 && <section className="mb-6"><h2 className="mb-3 text-sm font-semibold">Team invitations</h2><OrganizationInviteInbox invitations={teamInvitations} /></section>}
    {invitations.length > 0 && <section><h2 className="mb-3 text-sm font-semibold">Project invitations</h2><InviteInbox invitations={invitations} /></section>}
  </div>;
}

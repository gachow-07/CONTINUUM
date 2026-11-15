import { Inbox } from "lucide-react";
import { PageHeader, EmptyState, SetupNotice } from "@/components/ui/misc";
import { InviteInbox, type Invitation } from "@/components/views/invite-inbox";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Inbox" };
export default async function InboxPage() {
  const { supabase } = await requireSession();
  const { data, error } = await supabase.rpc("list_my_project_invitations");
  const invitations = (data ?? []) as Invitation[];
  return <div className="animate-fade-in"><PageHeader title="Inbox" description="Review project invitations. You only join a project when you accept." />
    {error ? <SetupNotice title="Invitations are unavailable">The invitation database setup may need to be applied. Ask your project administrator to check it.</SetupNotice> : invitations.length ? <InviteInbox invitations={invitations} /> : <EmptyState icon={<Inbox className="h-5 w-5" />} title="No invitations" description="Project invitations will appear here when someone invites you." />}
  </div>;
}

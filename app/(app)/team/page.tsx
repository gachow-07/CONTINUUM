import { Users } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { TeamManager } from "@/components/views/team-manager";
import { loadAll } from "@/lib/bundle";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Team management" };
export default async function Page() {
  const { supabase, user } = await requireSession();
  const s = await loadAll(supabase, true);
  const { data: pendingInvites } = await supabase.from("project_invitations").select("id,project_id,invitee_email,role").eq("status", "pending").order("created_at", { ascending: false });
  return (
    <div className="animate-fade-in">
      <PageHeader title="Team management" description="Invite existing CONTINUUM users by email. They accept in their in-app inbox; no email notification is sent yet." />
      {s.projects.length === 0 ? <EmptyState icon={<Users className="h-5 w-5" />} title="No projects yet" description="Team members are managed per project. Create a project to invite teammates." /> : (
        <div className="space-y-5">{s.projects.map((p) => <TeamManager key={p.id} project={p} invitations={(pendingInvites ?? []).filter((i) => i.project_id === p.id)} members={s.members.filter((m) => m.project_id === p.id).sort((a, b) => a.role === "owner" ? -1 : b.role === "owner" ? 1 : a.display_name.localeCompare(b.display_name))} isOwner={p.owner_id === user.id} currentUserId={user.id} />)}</div>)}
    </div>
  );
}

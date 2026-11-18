import { Users } from "lucide-react";
import { EmptyState, PageHeader, SetupNotice } from "@/components/ui/misc";
import { TeamManager } from "@/components/views/team-manager";
import { OrganizationManager, type Workspace, type TeamMember, type TeamInvitation } from "@/components/views/organization-manager";
import { loadAll } from "@/lib/bundle";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Team management" };
export default async function Page() {
  const { supabase, user, profile } = await requireSession();
  const s = await loadAll(supabase, true);
  const { data: pendingInvites } = await supabase.from("project_invitations").select("id,project_id,invitee_email,role").eq("status", "pending").order("created_at", { ascending: false });
  const { data: workspaces, error: workspaceError } = await supabase.from("organizations").select("id,name,kind").order("created_at");
  const active = (workspaces ?? []).find((w) => w.id === profile.org_id);
  const { data: membership, error: membershipError } = active ? await supabase.from("organization_members").select("role").eq("organization_id", active.id).eq("user_id", user.id).maybeSingle() : { data: null, error: null };
  const admin = active?.kind === "team" && (membership?.role === "owner" || membership?.role === "admin");
  const rosterResult = admin ? await supabase.rpc("list_organization_members", { p_organization: active.id }) : { data: [], error: null };
  const teamInvites = admin ? await supabase.from("organization_invitations").select("id,invitee_email,role").eq("organization_id", active.id).eq("status", "pending").order("created_at", { ascending: false }) : { data: [], error: null };
  return (
    <div className="animate-fade-in">
      <PageHeader title="Team management" description="Manage team workspaces and the people you share individual projects with." />
      {workspaceError || membershipError || rosterResult.error || teamInvites.error ? <SetupNotice title="Team workspaces are unavailable">Ask your administrator to verify the workspace database setup. Existing project sharing remains below.</SetupNotice> : <div className="mb-6"><OrganizationManager workspaces={(workspaces ?? []) as Workspace[]} activeId={active?.id ?? null} role={membership?.role ?? null} roster={(rosterResult.data ?? []) as TeamMember[]} invitations={(teamInvites.data ?? []) as TeamInvitation[]} currentUserId={user.id} /></div>}
      <h2 className="mb-3 text-sm font-semibold">Project sharing</h2>
      <p className="mb-4 text-xs text-muted-foreground">A team member only sees a project when its owner shares it with them. This list includes projects from all your workspaces.</p>
      {s.projects.length === 0 ? <EmptyState icon={<Users className="h-5 w-5" />} title="No projects yet" description="Team members are managed per project. Create a project to invite teammates." /> : (
        <div className="space-y-5">{s.projects.map((p) => <TeamManager key={p.id} project={p} invitations={(pendingInvites ?? []).filter((i) => i.project_id === p.id)} members={s.members.filter((m) => m.project_id === p.id).sort((a, b) => a.role === "owner" ? -1 : b.role === "owner" ? 1 : a.display_name.localeCompare(b.display_name))} isOwner={p.owner_id === user.id} currentUserId={user.id} />)}</div>)}
    </div>
  );
}

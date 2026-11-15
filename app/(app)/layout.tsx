import { AppShell } from "@/components/shell/sidebar";
import { requireSession } from "@/lib/session";
import { SampleOnboarding } from "@/components/projects/sample-onboarding";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await requireSession();
  const { data: org } = profile.org_id ? await supabase.from("organizations").select("name").eq("id", profile.org_id).maybeSingle() : { data: null };
  const { count } = await supabase.from("project_invitations").select("id", { count: "exact", head: true }).eq("invitee_id", user.id).eq("status", "pending");
  return (
    <AppShell pendingInvites={count ?? 0} user={{ name: profile.full_name || user.email || "You", email: user.email ?? "", role: profile.role_title, workspace: org?.name ?? "Workspace" }}>
      <SampleOnboarding pending={user.user_metadata?.continuum_sample_pending === true} />
      {children}
    </AppShell>
  );
}

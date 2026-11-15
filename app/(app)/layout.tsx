import { AppShell } from "@/components/shell/sidebar";
import { requireSession } from "@/lib/session";
import { SampleOnboarding } from "@/components/projects/sample-onboarding";
import { openaiConfigured } from "@/lib/env";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await requireSession();
  const { data: org } = profile.org_id ? await supabase.from("organizations").select("name").eq("id", profile.org_id).maybeSingle() : { data: null };
  // Projects the top-bar Ask AI dropdown can answer about, most recent first (RLS limits this to the user's own).
  const { data: projects } = await supabase.from("projects").select("id,name").eq("archived", false).order("updated_at", { ascending: false }).limit(50);
  const { count } = await supabase.from("project_invitations").select("id", { count: "exact", head: true }).eq("invitee_id", user.id).eq("status", "pending");
  return (
    <AppShell pendingInvites={count ?? 0} projects={projects ?? []} aiEnabled={openaiConfigured()} user={{ name: profile.full_name || user.email || "You", email: user.email ?? "", role: profile.role_title, workspace: org?.name ?? "Workspace", isGuest: user.is_anonymous === true }}>
      <SampleOnboarding pending={user.user_metadata?.continuum_sample_pending === true} />
      {children}
    </AppShell>
  );
}

import { AppShell } from "@/components/shell/sidebar";
import { requireSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await requireSession();
  const { data: org } = profile.org_id ? await supabase.from("organizations").select("name").eq("id", profile.org_id).maybeSingle() : { data: null };
  const { data: projects } = await supabase.from("projects").select("id,name").order("name");
  return (
    <AppShell projects={projects ?? []} user={{ name: profile.full_name || user.email || "You", email: user.email ?? "", role: profile.role_title, workspace: org?.name ?? "Workspace" }}>
      {children}
    </AppShell>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { AskAiDropdown } from "@/components/ai/ask-ai-dropdown";
import { anthropicConfigured } from "@/lib/env";
import { Badge, SampleBadge } from "@/components/ui/badge";
import { ProjectMenu } from "@/components/projects/project-dialogs";
import { STATUS_META } from "@/components/projects/project-card";
import { getBundle } from "@/lib/bundle-cache";
import { requireSession } from "@/lib/session";

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const b = await getBundle(id);
  if (!b) notFound();
  const p = b.project;
  const { user } = await requireSession();
  const canWrite = b.members.some((m) => m.user_id === user.id && (m.role === "owner" || m.role === "editor"));
  const st = STATUS_META[p.status];
  return (
    <div className="animate-fade-in">
      <nav aria-label="Breadcrumb" className="mb-2 text-xs text-muted-foreground"><Link href="/projects" className="hover:text-foreground">Projects</Link> <span className="mx-1">›</span> <Link href={`/projects/${id}`} className="hover:text-foreground">{p.name}</Link></nav>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1>
          {p.is_sample && <SampleBadge />}<Badge tone={st.tone} dot>{st.label}</Badge>{p.archived && <Badge>Archived</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {canWrite && <AskAiDropdown project={{ id, name: p.name }} aiEnabled={anthropicConfigured()} />}
          <ProjectMenu project={p} />
        </div>
      </div>
      {!canWrite && <div className="mb-5 rounded-lg border border-border bg-surface px-4 py-2.5 text-xs text-muted-foreground">View-only access: you can explore this project, but cannot make changes.</div>}
      {p.is_sample && !user.is_anonymous && (
        <div className="mb-5 rounded-lg border border-warning/30 bg-warning-soft px-4 py-2.5 text-xs text-warning">
          <strong>Sample project.</strong> “RC Car Design” is illustrative demonstration data, not verified engineering information. The 3D model is a placeholder built from simple shapes and the images are drawings.
        </div>
      )}
      {children}
    </div>
  );
}

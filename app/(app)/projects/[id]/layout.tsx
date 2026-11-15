import Link from "next/link";
import { notFound } from "next/navigation";
import { Box, Sparkles } from "lucide-react";
import { Badge, SampleBadge } from "@/components/ui/badge";
import { ProjectMenu } from "@/components/projects/project-dialogs";
import { STATUS_META } from "@/components/projects/project-card";
import { getBundle } from "@/lib/bundle-cache";

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const b = await getBundle(id);
  if (!b) notFound();
  const p = b.project;
  const st = STATUS_META[p.status];
  return (
    <div className="animate-fade-in">
      <nav aria-label="Breadcrumb" className="mb-2 text-xs text-muted-foreground"><Link href="/projects" className="transition-colors hover:text-foreground">Projects</Link> <span className="mx-1">›</span> <Link href={`/projects/${id}`} className="transition-colors hover:text-foreground">{p.name}</Link></nav>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-gradient text-[26px] font-semibold tracking-tight">{p.name}</h1>
          {p.is_sample && <SampleBadge />}<Badge tone={st.tone} dot>{st.label}</Badge>{p.archived && <Badge>Archived</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/projects/${id}/workspace`} className="group inline-flex h-9 items-center gap-1.5 rounded-md border border-border-strong bg-surface/60 px-3 text-[13px] font-medium transition-[background-color,border-color,transform] duration-200 hover:-translate-y-px hover:border-accent/40 hover:bg-muted active:scale-[0.97]"><Box className="h-4 w-4 transition-transform duration-500 ease-[var(--ease-spring)] group-hover:rotate-[20deg] group-hover:text-accent" />3D editor</Link>
          <Link href={`/projects/${id}/assistant`} className="group inline-flex h-9 items-center gap-1.5 rounded-md border border-border-strong bg-surface/60 px-3 text-[13px] font-medium transition-[background-color,border-color,transform] duration-200 hover:-translate-y-px hover:border-accent/40 hover:bg-muted active:scale-[0.97]"><Sparkles className="h-4 w-4 transition-transform duration-500 ease-[var(--ease-spring)] group-hover:scale-125 group-hover:text-accent" />Ask AI</Link>
          <ProjectMenu project={p} />
        </div>
      </div>
      {p.is_sample && (
        <div className="mb-5 rounded-lg border border-warning/30 bg-warning-soft px-4 py-2.5 text-xs text-warning">
          <strong>Sample project.</strong> “RC Car Design” is illustrative demonstration data, not verified engineering information. The 3D model is a placeholder built from simple shapes and the images are drawings.
        </div>
      )}
      {children}
    </div>
  );
}

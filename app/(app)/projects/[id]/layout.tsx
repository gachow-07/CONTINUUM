import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, SampleBadge } from "@/components/ui/badge";
import { ProjectCover } from "@/components/projects/cover";
import { ProjectMenu } from "@/components/projects/project-dialogs";
import { STATUS_META } from "@/components/projects/project-card";
import { ProjectTabs } from "@/components/projects/project-tabs";
import { requireSession } from "@/lib/session";
import type { Project } from "@/lib/types";

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await requireSession();
  const { data } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const p = data as Project;
  const st = STATUS_META[p.status];
  return (
    <div className="animate-fade-in">
      <div className="mb-1 text-xs text-muted-foreground"><Link href="/projects" className="hover:text-foreground">My Projects</Link> <span className="mx-1">/</span> {p.name}</div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-border"><ProjectCover path={p.cover_path} name={p.name} /></div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-xl font-semibold tracking-tight">{p.name}</h1><Badge tone={st.tone} dot>{st.label}</Badge>{p.is_sample && <SampleBadge />}{p.archived && <Badge>Archived</Badge>}</div>
            <p className="text-xs text-muted-foreground">{p.category}</p>
          </div>
        </div>
        <ProjectMenu project={p} />
      </div>
      {p.is_sample && (
        <div className="mb-5 rounded-lg border border-[#f3e2b3] bg-warning-soft px-4 py-2.5 text-xs text-[#6b4a10]">
          <strong>Sample project.</strong> Everything in “RC Car Design” is demonstration data written to show how Project Memory works — it is not verified engineering information, and the images are illustrations, not real CAD or simulation output.
        </div>
      )}
      <ProjectTabs id={id} />
      {children}
    </div>
  );
}

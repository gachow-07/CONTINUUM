import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SampleBadge } from "@/components/ui/badge";
import { ProjectCover } from "@/components/projects/cover";
import type { Project } from "@/lib/types";

/** Compact project entry for the application home screen. */
export function HomeProjectCard({ project, componentCount, href }: { project: Project; componentCount: number; href?: string }) {
  return (
    <Link href={href ?? `/projects/${project.id}`} className="group flex h-full flex-col rounded-lg border border-border bg-surface p-2 shadow-card transition-colors hover:border-accent/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
      <div className="relative h-36 overflow-hidden rounded-md border border-border bg-muted">
        <ProjectCover path={project.cover_path} name={project.name} className="transition-transform duration-300 group-hover:scale-[1.02]" />
        {project.is_sample && <span className="absolute left-3 top-3"><SampleBadge /></span>}
      </div>
      <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
        <h3 className="text-[15px] font-semibold">{project.name}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{project.category} · {componentCount} {componentCount === 1 ? "component" : "components"}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-accent">Open project <ArrowRight className="h-3.5 w-3.5" aria-hidden /></span>
      </div>
    </Link>
  );
}

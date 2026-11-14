import Link from "next/link";
import { BookOpen, FileText, Scale } from "lucide-react";
import { Badge, SampleBadge, type Tone } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Project } from "@/lib/types";
import type { Scope } from "@/lib/scope";
import { ProjectCover } from "./cover";
import { ModelThumbnail } from "./model-thumbnail";
import type { Part } from "@/lib/cad/types";

export const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  planning: { label: "Planning", tone: "neutral" }, active: { label: "Active", tone: "accent" },
  on_hold: { label: "On hold", tone: "warning" }, completed: { label: "Completed", tone: "success" },
};

/** Documentation completeness: share of decisions that have reasoning + evidence. */
export function projectStats(p: Project, s: Scope) {
  const decisions = s.decisions.filter((d) => d.project_id === p.id);
  const documented = decisions.filter((d) => d.reasoning.trim() && s.evidence.some((e) => e.decision_id === d.id)).length;
  return {
    research: s.research.filter((r) => r.project_id === p.id).length,
    decisions: decisions.length,
    files: s.files.filter((f) => f.project_id === p.id).length,
    pct: decisions.length ? Math.round((documented / decisions.length) * 100) : 0,
    hasDecisions: decisions.length > 0,
  };
}

export function ProjectCard({ project, scope, model }: { project: Project; scope: Scope; model?: Part[] }) {
  const st = projectStats(project, scope);
  const status = STATUS_META[project.status];
  return (
    <Link href={`/projects/${project.id}`} className="group flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-pop)]">
      <div className="relative h-32 overflow-hidden">{model?.length ? <ModelThumbnail parts={model} name={project.name} /> : <ProjectCover path={project.cover_path} name={project.name} className="transition-transform duration-500 group-hover:scale-[1.03]" />}
        <div className="absolute left-3 top-3 flex gap-1.5">{project.is_sample && <SampleBadge />}{project.archived && <Badge>Archived</Badge>}</div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-semibold leading-snug">{project.name}</h3>
          <Badge tone={status.tone} dot>{status.label}</Badge>
        </div>
        <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">{project.description || "No description yet."}</p>
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1" title="Research sources"><BookOpen className="h-3.5 w-3.5" />{st.research}</span>
          <span className="inline-flex items-center gap-1" title="Design decisions"><Scale className="h-3.5 w-3.5" />{st.decisions}</span>
          <span className="inline-flex items-center gap-1" title="Files"><FileText className="h-3.5 w-3.5" />{st.files}</span>
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-[11px] text-muted-foreground"><span>Decisions fully documented</span><span>{st.hasDecisions ? `${st.pct}%` : "—"}</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${st.pct}%` }} /></div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">Updated {formatDate(project.updated_at)}</p>
      </div>
    </Link>
  );
}

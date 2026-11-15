import type { Tone } from "@/components/ui/badge";
import type { ProjectBundle } from "@/lib/bundle";
import { buildComponents, componentsNeedingAttention } from "@/lib/readiness";
import type { Scope } from "@/lib/scope";
import type { Project } from "@/lib/types";
import { formatDate, timeAgo } from "@/lib/utils";
import { projectStats, STATUS_META } from "./project-card";

export interface ProjectSummary {
  id: string; name: string; description: string; isSample: boolean; archived: boolean; updatedAt: string;
  status: { label: string; tone: Tone };
  /** Documentation readiness across all components (same rules as the project Overview). */
  readiness: { done: number; total: number; pct: number };
  components: number; needAttention: number;
  research: number; decisions: number; files: number; documentedPct: number; hasDecisions: boolean;
  members: { id: string; name: string }[];
  lastActivity: { summary: string; actor: string; ago: string } | null;
  updatedLabel: string;
  modelName: string | null;
}

/** Everything the projects list shows about one project, computed from records already loaded for the page. */
export function summarizeProject(p: Project, s: Scope): ProjectSummary {
  const mine = <T extends { project_id: string }>(rows: T[]) => rows.filter((r) => r.project_id === p.id);
  const bundle: ProjectBundle = {
    project: p, members: mine(s.members), subsystems: mine(s.subsystems), research: mine(s.research), revisions: mine(s.revisions), files: mine(s.files),
    decisions: mine(s.decisions), evidence: mine(s.evidence), notes: mine(s.notes), reviews: mine(s.reviews), comments: mine(s.comments), activity: mine(s.activity), docs: mine(s.docs),
  };
  const comps = buildComponents(bundle);
  const done = comps.reduce((sum, c) => sum + c.done, 0);
  const total = comps.reduce((sum, c) => sum + c.total, 0);
  const stats = projectStats(p, s);
  const latest = [...bundle.activity].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const model = bundle.files.find((f) => f.id === p.viewer_model_file_id);
  return {
    id: p.id, name: p.name, description: p.description, isSample: p.is_sample, archived: p.archived, updatedAt: p.updated_at,
    status: STATUS_META[p.status] ?? { label: p.status, tone: "neutral" },
    readiness: { done, total, pct: total ? Math.round((done / total) * 100) : 0 },
    components: comps.length, needAttention: componentsNeedingAttention(comps),
    research: stats.research, decisions: stats.decisions, files: stats.files, documentedPct: stats.pct, hasDecisions: stats.hasDecisions,
    members: bundle.members.map((m) => ({ id: m.id, name: m.display_name || m.email || "Member" })),
    lastActivity: latest ? { summary: latest.summary, actor: latest.actor_name, ago: timeAgo(latest.created_at) } : null,
    updatedLabel: formatDate(p.updated_at),
    modelName: model ? model.name.replace(/\.glb$/i, "") : null,
  };
}

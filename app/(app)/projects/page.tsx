import { FolderKanban } from "lucide-react";
import { EmptyState } from "@/components/ui/misc";
import { CreateProjectButton, LoadSampleButton } from "@/components/projects/project-dialogs";
import { ProjectPreview } from "@/components/projects/project-card";
import { ProjectHero } from "@/components/projects/project-hero";
import { ProjectsList } from "@/components/projects/projects-list";
import { summarizeProject } from "@/components/projects/project-summary";
import { loadAll } from "@/lib/bundle";
import { requireSession } from "@/lib/session";
import { loadModel } from "@/lib/cad/load";

export const metadata = { title: "My Projects" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const { archived } = await searchParams;
  const showArchived = archived === "1";
  const { supabase } = await requireSession();
  const s = await loadAll(supabase, true);
  const counts = { active: s.projects.filter((p) => !p.archived).length, archived: s.projects.filter((p) => p.archived).length };
  // Already ordered by most recently updated.
  const projects = s.projects.filter((p) => p.archived === showArchived);
  const models = new Map(await Promise.all(projects.map(async (project) => [project.id, await loadModel(supabase, project.id)] as const)));
  const rows = projects.map((p) => ({ ...summarizeProject(p, s), preview: <ProjectPreview project={p} scope={s} model={models.get(p.id)} /> }));
  const recent = showArchived ? null : projects[0] ?? null;
  const recentRow = recent ? rows[0] : null;

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.03em]">My Projects</h1>
          <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">Each project is a workspace for its research, design history, decisions and reviews.</p>
        </div>
        <CreateProjectButton />
      </div>
      {counts.active === 0 && !showArchived ? (
        <EmptyState icon={<FolderKanban className="h-5 w-5" />} title="No projects yet" description="Create a project or load the sample to explore the platform."
          action={<div className="flex flex-wrap justify-center gap-2"><CreateProjectButton /><LoadSampleButton /></div>} />
      ) : (
        <>
          {recent && recentRow && <ProjectHero summary={recentRow} preview={<ProjectPreview project={recent} scope={s} model={models.get(recent.id)} hiRes transparent />} />}
          <ProjectsList rows={rows} recentId={recent?.id ?? null} archived={showArchived} counts={counts} />
        </>
      )}
    </div>
  );
}

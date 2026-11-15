import { TabBar } from "@/components/ui/tab-bar";
import { FolderKanban } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { CreateProjectButton, LoadSampleButton } from "@/components/projects/project-dialogs";
import { ProjectCard } from "@/components/projects/project-card";
import { loadAll } from "@/lib/bundle";
import { requireSession } from "@/lib/session";
import { loadModel } from "@/lib/cad/load";

export const metadata = { title: "My Projects" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const { archived } = await searchParams;
  const showArchived = archived === "1";
  const { supabase } = await requireSession();
  const s = await loadAll(supabase, true);
  const projects = s.projects.filter((p) => p.archived === showArchived);
  const models = new Map(await Promise.all(projects.map(async (project) => [project.id, await loadModel(supabase, project.id)] as const)));
  return (
    <div className="animate-fade-in">
      <PageHeader title="My Projects" description="Each project is a workspace for its research, design history, decisions and reviews." actions={<CreateProjectButton />} />
      <TabBar size="sm" tabs={[{ label: "Active", href: "/projects", active: !showArchived }, { label: "Archived", href: "/projects?archived=1", active: showArchived }]} />
      {projects.length === 0 ? (
        <EmptyState icon={<FolderKanban className="h-5 w-5" />} title={showArchived ? "No archived projects" : "No projects yet"} description={showArchived ? "Projects you archive appear here." : "Create a project or load the sample to explore the platform."}
          action={!showArchived && <div className="flex flex-wrap justify-center gap-2"><CreateProjectButton /><LoadSampleButton /></div>} />
      ) : (
        <div key={showArchived ? "archived" : "active"} className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{projects.map((p) => <ProjectCard key={p.id} project={p} scope={s} model={models.get(p.id)} />)}</div>
      )}
    </div>
  );
}

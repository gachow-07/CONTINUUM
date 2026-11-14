import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { CreateProjectButton, LoadSampleButton } from "@/components/projects/project-dialogs";
import { ProjectCard } from "@/components/projects/project-card";
import { loadAll } from "@/lib/bundle";
import { requireSession } from "@/lib/session";

export const metadata = { title: "My Projects" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const { archived } = await searchParams;
  const showArchived = archived === "1";
  const { supabase } = await requireSession();
  const s = await loadAll(supabase, true);
  const projects = s.projects.filter((p) => p.archived === showArchived);
  return (
    <div className="animate-fade-in">
      <PageHeader title="My Projects" description="Each project is a workspace for its research, design history, decisions and reviews." actions={<CreateProjectButton />} />
      <div className="mb-5 flex gap-1 border-b border-border text-[13px]">
        {[{ l: "Active", h: "/projects", on: !showArchived }, { l: "Archived", h: "/projects?archived=1", on: showArchived }].map((t) => (
          <Link key={t.l} href={t.h} className={`-mb-px border-b-2 px-3 py-2 font-medium ${t.on ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t.l}</Link>
        ))}
      </div>
      {projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title={showArchived ? "No archived projects" : "No projects yet"} description={showArchived ? "Projects you archive appear here." : "Create a project or load the sample to explore the platform."}
          action={!showArchived && <div className="flex flex-wrap justify-center gap-2"><CreateProjectButton /><LoadSampleButton /></div>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{projects.map((p) => <ProjectCard key={p.id} project={p} scope={s} />)}</div>
      )}
    </div>
  );
}

import Link from "next/link";
import { ArrowUpRight, BookOpen, ClipboardCheck, FileText, FolderKanban, Scale } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { ActivityFeed } from "@/components/shell/activity-feed";
import { Greeting } from "@/components/shell/greeting";
import { CreateProjectButton, LoadSampleButton } from "@/components/projects/project-dialogs";
import { ProjectCard } from "@/components/projects/project-card";
import { loadAll } from "@/lib/bundle";
import { loadModel } from "@/lib/cad/load";
import { requireSession } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const { supabase, profile, user } = await requireSession();
  const s = await loadAll(supabase);
  const displayedProjects = s.projects.slice(0, 6);
  const models = new Map(await Promise.all(displayedProjects.map(async (project) => [project.id, await loadModel(supabase, project.id)] as const)));
  const first = (profile.full_name || user.email || "there").split(/[\s@]/)[0];
  const pending = s.reviews.filter((r) => ["pending", "in_review", "changes_requested"].includes(r.status)).length;
  const names = new Map(s.projects.map((p) => [p.id, p.name]));
  const stats = [
    { label: "Projects", value: s.projects.length, icon: FolderKanban, href: "/projects" },
    { label: "Research sources", value: s.research.length, icon: BookOpen, href: "/research" },
    { label: "Design decisions", value: s.decisions.length, icon: Scale, href: "/decisions" },
    { label: "Pending reviews", value: pending, icon: ClipboardCheck, href: "/reviews", highlight: pending > 0 },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight"><Greeting name={first} /></h1>
          <p className="mt-1 max-w-xl text-[13px] text-muted-foreground">
            Your engineering memory. Every source, revision, decision and review your team records is kept here — so the next engineer never has to start from scratch.
          </p>
        </div>
        <CreateProjectButton />
      </div>

      <section aria-label="Knowledge overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((st) => (
          <Link key={st.label} href={st.href} className="group rounded-lg border border-border bg-surface p-4 shadow-card transition-all hover:border-border-strong hover:shadow-[var(--shadow-pop)]">
            <div className="flex items-center justify-between text-muted-foreground"><st.icon className="h-4 w-4" /><ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" /></div>
            <p className={`mt-3 text-2xl font-semibold tracking-tight ${st.highlight ? "text-warning" : ""}`}>{st.value}</p>
            <p className="text-xs text-muted-foreground">{st.label}</p>
          </Link>
        ))}
      </section>

      <section aria-label="Active projects">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Active projects</h2><Link href="/projects" className="text-xs font-medium text-accent hover:underline">View all</Link></div>
        {s.projects.length === 0 ? (
          <EmptyState icon={<FolderKanban className="h-5 w-5" />} title="Create your first project" description="Start a project workspace, or explore a prepopulated example to see how CONTINUUM captures what was built and why."
            action={<div className="flex flex-wrap justify-center gap-2"><CreateProjectButton /><LoadSampleButton /></div>} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{displayedProjects.map((p) => <ProjectCard key={p.id} project={p} scope={s} model={models.get(p.id)} />)}</div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Recent activity" description="Research, uploads, decisions, reviews and documents across your projects" />
          <ActivityFeed items={s.activity.slice(0, 10)} projectNames={names} />
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Recently generated documents" action={<Link href="/documentation" className="text-xs font-medium text-accent hover:underline">All documents</Link>} />
          {s.docs.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">No documents yet. Generate a project summary or handoff from Documentation.</p>
          ) : (
            <ul className="divide-y divide-border">
              {s.docs.slice(0, 5).map((d) => (
                <li key={d.id}><Link href={`/projects/${d.project_id}/docs?open=${d.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/60">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0"><p className="truncate text-[13px] font-medium">{d.title}</p><p className="text-[11px] text-muted-foreground">{names.get(d.project_id)} · {formatDate(d.updated_at)}</p></div>
                </Link></li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

import Link from "next/link";
import { ArrowUpRight, BookOpen, ClipboardCheck, FileText, FolderKanban, Scale } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
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
          <h1 className="text-gradient text-[28px] font-semibold tracking-tight"><Greeting name={first} /></h1>
          <p className="mt-1 max-w-xl text-[13px] text-muted-foreground">
            Your engineering memory. Every source, revision, decision and review your team records is kept here — so the next engineer never has to start from scratch.
          </p>
        </div>
        <CreateProjectButton />
      </div>

      <section aria-label="Knowledge overview" className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((st) => (
          <Link key={st.label} href={st.href} className="card-hover group relative overflow-hidden rounded-lg border border-border bg-surface bg-gradient-to-b from-white/[0.02] to-transparent p-4 shadow-card">
            <span aria-hidden className={`pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full blur-2xl transition-opacity duration-500 opacity-40 group-hover:opacity-90 ${st.highlight ? "bg-warning/20" : "bg-accent/20"}`} />
            <div className="relative flex items-center justify-between text-muted-foreground"><span className={`flex h-8 w-8 items-center justify-center rounded-md ring-1 transition-transform duration-300 ease-[var(--ease-spring)] group-hover:scale-110 ${st.highlight ? "bg-warning-soft text-warning ring-warning/25" : "bg-accent-soft text-accent ring-accent/20"}`}><st.icon className="h-4 w-4" /></span><ArrowUpRight className="h-3.5 w-3.5 -translate-x-1 translate-y-1 opacity-0 transition-all duration-300 ease-[var(--ease-out)] group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" /></div>
            <p className={`relative mt-3 text-[28px] font-semibold leading-none tracking-tight ${st.highlight ? "text-warning" : ""}`}><CountUp value={st.value} /></p>
            <p className="relative mt-1.5 text-xs text-muted-foreground">{st.label}</p>
          </Link>
        ))}
      </section>

      <section aria-label="Active projects">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Active projects</h2><Link href="/projects" className="text-xs font-medium text-accent underline-offset-4 transition-colors hover:text-[#7fb2ff] hover:underline">View all</Link></div>
        {s.projects.length === 0 ? (
          <EmptyState icon={<FolderKanban className="h-5 w-5" />} title="Create your first project" description="Start a project workspace, or explore a prepopulated example to see how CONTINUUM captures what was built and why."
            action={<div className="flex flex-wrap justify-center gap-2"><CreateProjectButton /><LoadSampleButton /></div>} />
        ) : (
          <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{displayedProjects.map((p) => <ProjectCard key={p.id} project={p} scope={s} model={models.get(p.id)} />)}</div>
        )}
      </section>

      <div className="stagger grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Recent activity" description="Research, uploads, decisions, reviews and documents across your projects" />
          <ActivityFeed items={s.activity.slice(0, 10)} projectNames={names} />
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Recently generated documents" action={<Link href="/documentation" className="text-xs font-medium text-accent underline-offset-4 transition-colors hover:text-[#7fb2ff] hover:underline">All documents</Link>} />
          {s.docs.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">No documents yet. Generate a project summary or handoff from Documentation.</p>
          ) : (
            <ul className="divide-y divide-border">
              {s.docs.slice(0, 5).map((d) => (
                <li key={d.id}><Link href={`/projects/${d.project_id}/docs?open=${d.id}`} className="group flex items-start gap-3 px-5 py-3 transition-colors duration-200 hover:bg-muted/60">
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

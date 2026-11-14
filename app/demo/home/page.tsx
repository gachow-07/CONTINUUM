import Link from "next/link";
import { Box, Home, Layers, BookOpen, Scale, ClipboardCheck, FileText } from "lucide-react";
import { HomeProjectCard } from "@/components/projects/home-project-card";
import { NewProjectCard } from "@/components/projects/new-project-card";
import { Card, CardHeader } from "@/components/ui/card";
import { Logo } from "@/components/shell/logo";
import type { Project } from "@/lib/types";

export const metadata = { title: "Homepage Preview" };

const sample: Project = {
  id: "sample", org_id: null, owner_id: "sample", name: "RC Car Design",
  description: "Illustrative engineering project", category: "Mechanical / Vehicle",
  status: "active", cover_path: null, archived: false, is_sample: true,
  created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
};

export default function HomePreview() {
  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      <aside className="border-b border-sidebar-border bg-sidebar p-4 lg:min-h-screen lg:w-[216px] lg:shrink-0 lg:border-b-0 lg:border-r">
        <Logo />
        <div className="mt-8 flex items-center gap-3 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white"><Home className="h-4 w-4" />Home</div>
        <p className="mt-6 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Preview navigation</p>
        <div className="mt-2 space-y-1 text-[13px] text-muted-foreground">
          {[[BookOpen, "Research"], [Scale, "Decisions"], [ClipboardCheck, "Reviews"], [FileText, "Documentation"]].map(([Icon, label]) => {
            const ItemIcon = Icon as typeof Home;
            return <div key={label as string} className="flex items-center gap-3 px-3 py-2"><ItemIcon className="h-4 w-4" />{label as string}</div>;
          })}
        </div>
      </aside>
      <main className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-sm">
          <span><strong>Homepage preview.</strong> Sample data only; changes aren’t saved.</span>
          <Link href="/demo" className="font-medium text-accent hover:underline">Open 3D demo →</Link>
        </div>
        <div className="space-y-8">
          <div><h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1><p className="mt-1 text-[13px] text-muted-foreground">Pick up where your team left off.</p></div>
          <section aria-label="Knowledge overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[["Projects", "1", Box], ["Research sources", "3", BookOpen], ["Design decisions", "3", Scale], ["Pending reviews", "1", ClipboardCheck]].map(([label, value, Icon]) => {
              const StatIcon = Icon as typeof Box;
              return <div key={label as string} className="rounded-lg border border-border bg-surface p-4 shadow-card"><StatIcon className="h-4 w-4 text-muted-foreground" /><p className="mt-3 text-2xl font-semibold">{value as string}</p><p className="text-xs text-muted-foreground">{label as string}</p></div>;
            })}
          </section>
          <section aria-label="Your projects"><h2 className="mb-3 text-sm font-semibold">Your projects</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><HomeProjectCard project={sample} componentCount={4} href="/demo/project" /><NewProjectCard preview /></div></section>
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3"><CardHeader title="Recent activity" description="Illustrative activity from the sample project" /><ul className="divide-y divide-border text-[13px]">{["Suspension review updated", "Decision added to drivetrain", "Research linked to suspension"].map((item) => <li key={item} className="flex items-center gap-3 px-5 py-3"><Layers className="h-4 w-4 text-muted-foreground" /><span>{item}<span className="block text-[11px] text-muted-foreground">RC Car Design · Sample activity</span></span></li>)}</ul></Card>
            <Card className="lg:col-span-2"><CardHeader title="Recently generated documents" /><p className="px-5 py-8 text-center text-[13px] text-muted-foreground">No documents in this preview.</p></Card>
          </div>
        </div>
      </main>
    </div>
  );
}

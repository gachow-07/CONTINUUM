import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { SampleBadge } from "@/components/ui/badge";
import { refHref } from "@/lib/links";
import type { ProjectBundle } from "@/lib/bundle";

/** A starting point for the project's saved research, without generating new summaries. */
export function HubResearchPanel({ bundle }: { bundle: ProjectBundle }) {
  const researchHref = `/projects/${bundle.project.id}/research`;
  const names = new Map(bundle.subsystems.map((component) => [component.id, component.name]));
  return (
    <Card>
      <CardHeader title="Project research" description="Sources and the team's notes about why they matter" action={<Link href={researchHref} className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">All research <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>} />
      {bundle.research.length === 0 ? (
        <div className="p-5 text-sm text-muted-foreground"><p>No research saved yet.</p><Link href={researchHref} className="mt-2 inline-block text-accent hover:underline">Open research to add a source</Link></div>
      ) : (
        <ul className="divide-y divide-border">
          {bundle.research.slice(0, 4).map((source) => (
            <li key={source.id}>
              <Link href={refHref(bundle.project.id, "research", source.id)} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-muted/60">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-[13px] font-semibold">{source.title}</span>{source.is_sample && <SampleBadge />}</span>
                  <span className="mt-1 block text-[12px] text-muted-foreground">{source.subsystem_id && names.get(source.subsystem_id) ? `${names.get(source.subsystem_id)} · ` : ""}{source.why_important || "No relevance note recorded yet."}</span>
                </span><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

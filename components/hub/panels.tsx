import Link from "next/link";
import { AlertTriangle, ArrowRight, ChevronRight, CircleHelp, Info, MessageSquare, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { CRITERIA, componentsNeedingAttention, reviewStateLabel, type AttentionItem, type ComponentModel } from "@/lib/readiness";
import type { ProjectBundle } from "@/lib/bundle";
import { formatDate } from "@/lib/utils";
import { ComponentIcon } from "./icons";

export const reviewTone = (s: ComponentModel["reviewState"]) => (s === "approved" ? "success" : s === "changes_requested" ? "warning" : s === "none" ? "neutral" : "accent") as "success" | "warning" | "neutral" | "accent";

export function ReadinessPanel({ projectId, comps }: { projectId: string; comps: ComponentModel[] }) {
  const need = componentsNeedingAttention(comps);
  return (
    <Card>
      <CardHeader title="Documentation readiness" />
      <div className="space-y-3 p-4">
        {comps.length === 0 ? <p className="text-[13px] text-muted-foreground">No components yet. Add components to track how well each one is documented.</p> : (
          <>
            <div className={`flex items-center gap-2 rounded-md border px-3 py-2 text-[12.5px] ${need ? "border-accent/30 bg-accent-soft text-accent" : "border-success/30 bg-success-soft text-success"}`}>
              {need ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}{need ? `${need} of ${comps.length} components need attention` : "All components are fully documented"}
            </div>
            <ul className="space-y-2.5">
              {comps.map((c) => (
                <li key={c.subsystem.id}>
                  <Link href={`/projects/${projectId}/components/${c.subsystem.id}`} className="group block rounded-md p-1.5 -m-1.5 hover:bg-muted/60">
                    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5">
                      <span className="text-[13px] font-semibold">{c.subsystem.name}</span>
                      <Badge tone={c.status.tone}>{c.status.label}</Badge>
                      <div className="flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(c.done / c.total) * 100}%` }} /></div></div>
                      <span className="text-right text-[11.5px] tabular-nums text-muted-foreground">{c.done} / {c.total} complete</span>
                    </div>
                    {c.missing.length > 0 && <p className="mt-1 text-[11.5px] text-muted-foreground">Missing: {c.missing.map((m) => m.label.toLowerCase()).join(", ")}</p>}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="flex items-start gap-1.5 border-t border-border pt-3 text-[11.5px] text-muted-foreground"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />Documentation status measures whether reasoning is written down. Engineering approval is tracked separately, in Reviews.</p>
            <details className="text-[12px] text-muted-foreground">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 hover:text-foreground"><CircleHelp className="h-3.5 w-3.5" />How readiness is calculated</summary>
              <ul className="mt-2 space-y-1.5 pl-5">{CRITERIA.map((c) => <li key={c.key} className="list-disc"><span className="text-foreground">{c.label}.</span> {c.rule}</li>)}</ul>
            </details>
          </>
        )}
      </div>
    </Card>
  );
}

export function NeedsAttention({ items }: { items: AttentionItem[] }) {
  return (
    <Card>
      <CardHeader title="Needs attention" description="From incomplete documentation, open reviews and issues" />
      {items.length === 0 ? <p className="p-4 text-[13px] text-muted-foreground">Nothing needs attention right now.</p> : (
        <ul className="divide-y divide-border">
          {items.map((it) => (
            <li key={it.id}><Link href={it.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60">
              <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1"><span className="block text-[13px]">{it.label}</span><span className="block truncate text-[11.5px] text-muted-foreground">{it.detail}</span></span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link></li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Built only from saved decisions: nothing is summarised that wasn't recorded. */
export function LivingSummary({ b, comps }: { b: ProjectBundle; comps: ComponentModel[] }) {
  const base = `/projects/${b.project.id}`;
  const revFor = (decisionId: string) => {
    const ids = b.evidence.filter((e) => e.decision_id === decisionId && e.revision_id).map((e) => e.revision_id!);
    return b.revisions.filter((r) => ids.includes(r.id)).sort((a, c) => c.occurred_on.localeCompare(a.occurred_on))[0];
  };
  return (
    <Card>
      <CardHeader title="Living design summary" description="Updated from recorded decisions" />
      {comps.length === 0 ? <p className="p-4 text-[13px] text-muted-foreground">Add components and record decisions to build the summary.</p> : (
        <ul className="divide-y divide-border">
          {comps.map((c) => {
            const ds = [...c.decisions].sort((a, d) => d.decided_on.localeCompare(a.decided_on));
            if (!ds.length) return (
              <li key={c.subsystem.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <ComponentIcon name={c.subsystem.name} className="h-4 w-4 text-muted-foreground" /><span className="w-24 text-[13px] font-medium">{c.subsystem.name}</span>
                <span className="flex-1 text-[12.5px] text-muted-foreground">No decisions recorded for this component yet.</span>
                <Link href={`${base}/components/${c.subsystem.id}?tab=decisions`} className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline"><Plus className="h-3.5 w-3.5" />Record a decision</Link>
              </li>
            );
            return ds.slice(0, 2).map((d, i) => {
              const rev = revFor(d.id);
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <ComponentIcon name={c.subsystem.name} className={`h-4 w-4 ${i ? "opacity-0" : "text-muted-foreground"}`} /><span className="w-24 text-[13px] font-medium">{i === 0 ? c.subsystem.name : ""}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px]">{d.selected_solution || d.title}</p>
                    <p className="text-[11.5px] text-muted-foreground">{d.title} · {formatDate(d.decided_on)}{rev ? ` · ${rev.rev_label}` : ""}{!d.reasoning.trim() && <span className="ml-1.5 text-warning">· no reasoning recorded</span>}</p>
                  </div>
                  <Link href={`${base}/decisions?open=${d.id}`} className="inline-flex h-7 items-center gap-1 rounded-md border border-accent/30 bg-accent-soft px-2.5 text-[12px] font-medium text-accent hover:bg-accent/20">View decision <ArrowRight className="h-3 w-3" /></Link>
                </li>
              );
            });
          })}
        </ul>
      )}
    </Card>
  );
}

export { reviewStateLabel };

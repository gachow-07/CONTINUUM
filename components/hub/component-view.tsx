import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, CircleCheck, Plus } from "lucide-react";
import { AskBar } from "@/components/hub/ask-bar";
import { ComponentIcon } from "@/components/hub/icons";
import { reviewTone } from "@/components/hub/panels";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { SubsystemActions } from "@/components/views/subsystems-view";
import { DecisionsView } from "@/components/views/decisions-view";
import { HistoryView } from "@/components/views/history-view";
import { ResearchView } from "@/components/views/research-view";
import { ReviewsView } from "@/components/views/reviews-view";
import type { ProjectBundle } from "@/lib/bundle";
import { refHref } from "@/lib/links";
import { buildComponent, buildComponents, reviewStateLabel, type ChecklistItem } from "@/lib/readiness";
import { scopeFromBundle } from "@/lib/scope";
import { cn, formatDate } from "@/lib/utils";

const TABS = [["summary", "Summary"], ["research", "Research"], ["decisions", "Decisions"], ["revisions", "Revisions"], ["reviews", "Reviews"]] as const;
const FIX_TAB: Record<ChecklistItem["key"], string> = { described: "summary", choices: "decisions", alternatives: "decisions", sources: "research", revision: "revisions", review: "reviews" };
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n).trimEnd() + "…" : s);

export function ComponentView({ b, sid, tab, ai }: { b: ProjectBundle; sid: string; tab: string; ai: boolean }) {
  const id = b.project.id;
  const sub = b.subsystems.find((s) => s.id === sid)!;
  const c = buildComponent(b, sub);
  const all = buildComponents(b);
  const scope = scopeFromBundle(b);
  const base = `/projects/${id}`;
  const revById = new Map(b.revisions.map((r) => [r.id, r]));
  const resById = new Map(b.research.map((r) => [r.id, r]));
  const issues = [...c.issues.map((n) => ({ id: n.id, label: n.title, chip: "Open issue", href: `${base}/handoff#notes` })), ...c.openComments.map((m) => ({ id: m.id, label: m.body.length > 60 ? m.body.slice(0, 60) + "…" : m.body, chip: reviewStateLabel(c.reviewState), href: `${base}/reviews?open=${m.review_id}` }))];
  const nextStep = c.nextSteps[0];

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="-mt-2 text-xs text-muted-foreground"><Link href={`${base}?tab=components`} className="hover:text-foreground">Components</Link> <span className="mx-1">›</span> <span className="text-foreground">{sub.name}</span></nav>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent"><ComponentIcon name={sub.name} className="h-5 w-5" /></span>
          <div><h2 className="text-xl font-semibold tracking-tight">{sub.name}</h2><div className="mt-1 flex flex-wrap gap-1.5"><Badge tone={c.status.tone}>{c.status.label}</Badge><Badge tone={reviewTone(c.reviewState)}>{reviewStateLabel(c.reviewState)}</Badge></div></div></div>
        <div className="flex gap-2"><SubsystemActions subsystem={sub} redirectTo={`${base}?tab=components`} /></div>
      </div>
      <div className="flex gap-1 border-b border-border" role="tablist">
        {TABS.map(([k, label]) => <Link key={k} role="tab" aria-selected={tab === k} href={`${base}/components/${sid}?tab=${k}`} className={cn("-mb-px border-b-2 px-3.5 py-2.5 text-[13px] font-medium", tab === k ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{label}</Link>)}
      </div>

      <div className="grid gap-5 xl:grid-cols-[210px_minmax(0,1fr)_330px]">
        <aside className="order-2 xl:order-1">
          <Card><CardHeader title="Components" /><ul className="p-1.5">{all.map((x) => (
            <li key={x.subsystem.id}><Link href={`${base}/components/${x.subsystem.id}?tab=${tab}`} aria-current={x.subsystem.id === sid ? "page" : undefined} className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-2 hover:bg-muted", x.subsystem.id === sid && "bg-accent-soft ring-1 ring-accent/40")}>
              <ComponentIcon name={x.subsystem.name} className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{x.subsystem.name}</span><span className="block text-[11px] text-muted-foreground">{x.done} / {x.total} complete</span></span>
              {x.done === x.total ? <CircleCheck className="h-4 w-4 shrink-0 text-success" aria-label="Fully documented" /> : <Ring v={x.done / x.total} />}
            </Link></li>))}</ul></Card>
        </aside>

        <section className="order-1 min-w-0 xl:order-2">
          {tab === "summary" && (
            <div className="space-y-4">
              <Card>
                <div className="p-5">
                  <h3 className="text-[17px] font-semibold">Why this design?</h3>
                  <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-muted-foreground">{sub.description || <span className="text-warning">No description recorded for this component.</span>}</p>
                  <p className="mt-2 text-[12px] text-muted-foreground">Everything below is built from recorded decisions, revisions and research. Nothing is inferred.</p>
                </div>
              </Card>
              {c.decisions.length === 0 ? (
                <Card><div className="flex flex-col items-center gap-2 p-8 text-center"><p className="text-[13px] font-medium">No decisions recorded for {sub.name} yet</p><p className="max-w-sm text-xs text-muted-foreground">Record what was chosen, what was rejected and why, and it will appear here with its sources.</p>
                  <Link href={`${base}/components/${sid}?tab=decisions`} className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-[12px] font-semibold text-white"><Plus className="h-3.5 w-3.5" />Record a decision</Link></div></Card>
              ) : c.decisions.map((d) => {
                const ev = b.evidence.filter((e) => e.decision_id === d.id);
                return (
                  <Link key={d.id} href={refHref(id, "decision", d.id)} className="group block rounded-lg border border-border bg-surface p-4 shadow-card transition-colors hover:border-border-strong">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[14px] font-semibold">{d.title}</p>
                      <p className="mt-1 text-[13px] text-muted-foreground"><span className="text-foreground/90">Selected:</span> {clip(d.selected_solution, 200) || "—"}</p></div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-accent" /></div>
                    <p className="mt-2 text-[13px] leading-relaxed">{d.reasoning.trim() ? clip(d.reasoning, 280) : <span className="inline-flex items-center gap-1.5 text-warning"><AlertTriangle className="h-3.5 w-3.5" />No reasoning recorded for this decision.</span>}</p>
                    {d.alternatives.length > 0 && <p className="mt-2 text-xs text-muted-foreground"><span className="font-medium text-foreground/80">Alternatives considered:</span> {d.alternatives.map((a) => a.name).join(" · ")}</p>}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {ev.filter((e) => e.research_id).slice(0, 3).map((e) => <span key={e.id} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 text-[11.5px]"><span className="text-[10px] uppercase text-muted-foreground">Research</span>{clip(resById.get(e.research_id!)?.title ?? "", 34)}</span>)}
                      {ev.filter((e) => e.revision_id).slice(0, 3).map((e) => <span key={e.id} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 text-[11.5px]"><span className="text-[10px] uppercase text-muted-foreground">Revision</span>{revById.get(e.revision_id!)?.rev_label}</span>)}
                      {ev.length === 0 && <span className="text-[11.5px] text-warning">No evidence linked</span>}
                    </div>
                  </Link>
                );
              })}
              {c.revisions[0] && (
                <Card><CardHeader title="Latest revision" action={<Link href={`${base}/components/${sid}?tab=revisions`} className="text-xs font-medium text-accent hover:underline">All revisions</Link>} />
                  <Link href={refHref(id, "revision", c.revisions[0].id)} className="block p-4 hover:bg-muted/40"><p className="text-[13px]"><Badge tone="accent" className="mr-1.5 font-mono">{c.revisions[0].rev_label}</Badge><span className="font-medium">{c.revisions[0].title}</span> <span className="text-xs text-muted-foreground">· {formatDate(c.revisions[0].occurred_on)} · {c.revisions[0].author_name}</span></p>
                    <p className="mt-2 text-[13px]"><span className="text-muted-foreground">What changed: </span>{c.revisions[0].description || <span className="text-warning">not documented</span>}</p>
                    <p className="mt-1 text-[13px]"><span className="text-muted-foreground">Why: </span>{c.revisions[0].reason || <span className="text-warning">not documented</span>}</p></Link></Card>
              )}
            </div>
          )}
          {tab === "research" && <ResearchView scope={scope} projectId={id} subsystemId={sid} aiEnabled={ai} />}
          {tab === "decisions" && <DecisionsView scope={scope} projectId={id} subsystemId={sid} aiEnabled={ai} />}
          {tab === "revisions" && <HistoryView scope={scope} projectId={id} subsystemId={sid} />}
          {tab === "reviews" && <ReviewsView scope={scope} projectId={id} subsystemId={sid} />}
        </section>

        <aside className="order-3 space-y-4">
          <Card>
            <CardHeader title="Documentation checklist" action={<span className="text-xs tabular-nums text-muted-foreground">{c.done} of {c.total} complete</span>} />
            <div className="p-4">
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${(c.done / c.total) * 100}%` }} /></div>
              <ul className="space-y-1">
                {c.items.map((it) => (
                  <li key={it.key} className="py-1">
                    <div className="flex items-center gap-2.5 text-[13px]">
                      <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", it.ok ? "border-accent bg-accent text-white" : "border-border-strong")} aria-hidden>{it.ok && <Check className="h-3 w-3" />}</span>
                      <span className={it.ok ? "" : "font-medium"}>{it.label}</span><span className="sr-only">{it.ok ? "complete" : "incomplete"}</span>
                      {!it.ok && <Link href={`${base}/components/${sid}?tab=${FIX_TAB[it.key]}`} className="ml-auto text-[11.5px] font-medium text-accent hover:underline">Resolve</Link>}
                    </div>
                    <p className="ml-[26px] text-[11.5px] text-muted-foreground" title={it.rule}>{it.detail}</p>
                  </li>))}
              </ul>
              <p className="mt-3 border-t border-border pt-2.5 text-[11px] leading-relaxed text-muted-foreground">Checked against saved records, not file contents. This is documentation status, not engineering approval.</p>
            </div>
          </Card>
          <Card><CardHeader title="Open issues" />
            {issues.length === 0 ? <p className="p-4 text-[13px] text-muted-foreground">No open issues recorded.</p> : <ul className="divide-y divide-border">{issues.map((i) => <li key={i.id}><Link href={i.href} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-muted/50"><AlertTriangle className="h-4 w-4 shrink-0 text-warning" /><span className="min-w-0 flex-1 truncate text-[13px]">{i.label}</span><Badge tone="accent">{i.chip}</Badge></Link></li>)}</ul>}
          </Card>
          <Card><CardHeader title="Next step" />
            <div className="p-4 text-[13px]">{nextStep ? <><p className="font-medium">{nextStep.title}</p>{nextStep.body && <p className="mt-1 text-muted-foreground">{nextStep.body}</p>}</>
              : c.missing[0] ? <><p className="font-medium">{c.missing[0].label}</p><p className="mt-1 text-muted-foreground">Suggested from the checklist: {c.missing[0].detail.toLowerCase()}.</p></>
              : <p className="text-muted-foreground">No next step recorded. The checklist is complete.</p>}</div>
          </Card>
        </aside>
      </div>
      <AskBar projectId={id} componentName={sub.name} aiEnabled={ai} />
    </div>
  );
}

function Ring({ v }: { v: number }) {
  const r = 7, c = 2 * Math.PI * r;
  return <svg width="18" height="18" viewBox="0 0 18 18" className="shrink-0 -rotate-90" aria-hidden><circle cx="9" cy="9" r={r} fill="none" stroke="var(--border-strong)" strokeWidth="2" /><circle cx="9" cy="9" r={r} fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray={`${c * v} ${c}`} strokeLinecap="round" /></svg>;
}

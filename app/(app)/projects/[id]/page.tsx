import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ArrowRight, FileText, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { ActivityFeed } from "@/components/shell/activity-feed";
import { DECISION_STATUS } from "@/components/views/meta";
import { loadBundle } from "@/lib/bundle";
import { refHref } from "@/lib/links";
import { requireSession } from "@/lib/session";
import { formatDate, initials } from "@/lib/utils";

export default async function Overview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireSession();
  const b = await loadBundle(supabase, id);
  if (!b) notFound();
  const sub = (sid: string | null) => b.subsystems.find((s) => s.id === sid)?.name;
  const openIssues = b.notes.filter((n) => n.kind === "issue" && n.status === "open");
  const openComments = b.comments.filter((c) => !c.resolved && c.kind !== "response");
  const importantDecisions = b.decisions.filter((d) => d.status === "accepted").slice(0, 4);
  const recentUpdates = [...b.revisions].slice(0, 4);
  const undocumented = b.decisions.filter((d) => !d.reasoning.trim() && !b.evidence.some((e) => e.decision_id === d.id));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader title="About this project" />
          <div className="p-5">
            <p className="text-[13px] leading-relaxed text-[#344054]">{b.project.description || "No description yet — edit the project to add one."}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">{b.subsystems.map((s) => <Link key={s.id} href={`/projects/${id}/subsystems/${s.id}`}><Badge tone="neutral" className="hover:bg-border">{s.name}</Badge></Link>)}</div>
          </div>
        </Card>

        <Card className="border-accent/30 bg-accent-soft/40">
          <div className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div><h3 className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-accent" />Taking over this project?</h3><p className="mt-0.5 text-xs text-muted-foreground">The handoff dashboard gathers what was built, why, what failed, and what to do next — and lets you ask the project questions.</p></div>
            <Link href={`/projects/${id}/handoff`} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-accent px-3.5 text-[13px] font-medium text-white hover:bg-[#1a4fd6]">Open handoff <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </Card>

        <Card>
          <CardHeader title="Important decisions" action={<Link href={`/projects/${id}/decisions`} className="text-xs font-medium text-accent hover:underline">All decisions</Link>} />
          {importantDecisions.length === 0 ? <p className="px-5 py-6 text-[13px] text-muted-foreground">No accepted decisions recorded yet.</p> : (
            <ul className="divide-y divide-border">{importantDecisions.map((d) => (
              <li key={d.id}><Link href={refHref(id, "decision", d.id)} className="block px-5 py-3 hover:bg-muted/60">
                <div className="flex items-center justify-between gap-2"><p className="text-[13px] font-medium">{d.title}</p><Badge tone={DECISION_STATUS[d.status].tone}>{DECISION_STATUS[d.status].label}</Badge></div>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{sub(d.subsystem_id) ?? "No subsystem"} · {d.selected_solution}</p>
              </Link></li>))}
            </ul>)}
        </Card>

        <Card>
          <CardHeader title="Recent updates" description="Latest design revisions and events" action={<Link href={`/projects/${id}/history`} className="text-xs font-medium text-accent hover:underline">Design history</Link>} />
          {recentUpdates.length === 0 ? <p className="px-5 py-6 text-[13px] text-muted-foreground">No revisions yet.</p> : (
            <ul className="divide-y divide-border">{recentUpdates.map((r) => (
              <li key={r.id}><Link href={refHref(id, "revision", r.id)} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/60">
                <Badge tone="accent" className="mt-0.5 shrink-0 font-mono">{r.rev_label}</Badge>
                <div className="min-w-0"><p className="text-[13px] font-medium">{r.title}</p><p className="text-xs text-muted-foreground">{formatDate(r.occurred_on)} · {r.author_name}{sub(r.subsystem_id) ? ` · ${sub(r.subsystem_id)}` : ""}</p></div>
              </Link></li>))}
            </ul>)}
        </Card>

        <Card>
          <CardHeader title="Activity" />
          <ActivityFeed items={b.activity.slice(0, 8)} />
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Team" action={<Link href="/team" className="text-xs font-medium text-accent hover:underline">Manage</Link>} />
          <ul className="space-y-3 p-5">{b.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-[#475467]">{initials(m.display_name)}</div>
              <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium">{m.display_name}</p></div>
              <span className="text-[11px] capitalize text-muted-foreground">{m.role}</span>
            </li>))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Unresolved issues" description={`${openIssues.length + openComments.length + undocumented.length} need attention`} />
          <ul className="divide-y divide-border">
            {openIssues.map((n) => <li key={n.id}><Link href={`/projects/${id}/handoff#notes`} className="flex gap-2.5 px-5 py-3 hover:bg-muted/60"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" /><span className="text-[13px]">{n.title}</span></Link></li>)}
            {openComments.map((c) => <li key={c.id}><Link href={`/projects/${id}/reviews?open=${c.review_id}`} className="flex gap-2.5 px-5 py-3 hover:bg-muted/60"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" /><span className="text-[13px]">Open review comment: <span className="text-muted-foreground">{c.body.slice(0, 80)}{c.body.length > 80 ? "…" : ""}</span></span></Link></li>)}
            {undocumented.map((d) => <li key={d.id}><Link href={refHref(id, "decision", d.id)} className="flex gap-2.5 px-5 py-3 hover:bg-muted/60"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" /><span className="text-[13px]">Undocumented decision: <span className="text-muted-foreground">{d.title}</span></span></Link></li>)}
            {openIssues.length + openComments.length + undocumented.length === 0 && <li className="px-5 py-6 text-[13px] text-muted-foreground">Nothing unresolved is recorded.</li>}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Latest documentation" action={<Link href={`/projects/${id}/docs`} className="text-xs font-medium text-accent hover:underline">Generate</Link>} />
          {b.docs.length === 0 ? <p className="px-5 py-6 text-[13px] text-muted-foreground">No documents generated yet.</p> : (
            <ul className="divide-y divide-border">{b.docs.slice(0, 3).map((d) => (
              <li key={d.id}><Link href={refHref(id, "document", d.id)} className="flex items-start gap-2.5 px-5 py-3 hover:bg-muted/60"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div><p className="text-[13px] font-medium">{d.title}</p><p className="text-[11px] text-muted-foreground">{formatDate(d.updated_at)}</p></div></Link></li>))}
            </ul>)}
        </Card>
      </div>
    </div>
  );
}

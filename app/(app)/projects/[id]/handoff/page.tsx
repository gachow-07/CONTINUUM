import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowRight, FileDown, Lightbulb } from "lucide-react";
import { ChatPanel } from "@/components/ai/chat-panel";
import { Badge, SampleBadge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { NotesPanel } from "@/components/views/notes-panel";
import { DECISION_STATUS, REVISION_KIND } from "@/components/views/meta";
import { loadBundle } from "@/lib/bundle";
import { loadLatestConversation } from "@/lib/conversation";
import { openaiConfigured } from "@/lib/env";
import { refHref } from "@/lib/links";
import { DocTabs } from "@/components/hub/doc-tabs";
import { requireSession } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Project Handoff" };

export default async function Handoff({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireSession();
  const b = await loadBundle(supabase, id);
  if (!b) notFound();
  const conv = await loadLatestConversation(supabase, id, user.id);
  const sub = (sid: string | null) => b.subsystems.find((s) => s.id === sid)?.name;
  const evCount = (did: string) => b.evidence.filter((e) => e.decision_id === did).length;
  const undocumented = b.decisions.filter((d) => !d.reasoning.trim() && evCount(d.id) === 0);
  const noEvidence = b.decisions.filter((d) => d.reasoning.trim() && evCount(d.id) === 0);
  const openIssues = b.notes.filter((n) => n.kind === "issue" && n.status === "open");
  const openComments = b.comments.filter((c) => !c.resolved && !c.parent_id);
  const pendingReviews = b.reviews.filter((r) => ["pending", "in_review", "changes_requested"].includes(r.status));
  const hasQuant = b.revisions.some((r) => r.kind === "simulation");
  const keyRevs = [...b.revisions].sort((a, c) => a.occurred_on.localeCompare(c.occurred_on));
  const gaps = undocumented.length + noEvidence.length + openIssues.length;
  const backgrounds = b.notes.filter((n) => n.kind === "background");
  const linkedResearch = b.research.filter((source) => b.evidence.some((e) => e.research_id === source.id && b.decisions.some((d) => d.id === e.decision_id)));

  return (
    <div className="space-y-8">
      <DocTabs projectId={id} />
      <div className="rounded-xl border border-border bg-primary p-6 text-white shadow-card">
        <p className="text-xs font-medium uppercase tracking-wider text-[#8fb0ff]">Project handoff</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">Pick up {b.project.name} without starting from scratch</h2>
        <p className="mt-1.5 max-w-2xl text-[13px] text-[#b4bcc9]">Everything below is assembled from what the team documented. Where something wasn&apos;t written down, it&apos;s flagged as a knowledge gap rather than guessed.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-md bg-white/10 px-2.5 py-1">{b.decisions.length} decisions</span><span className="rounded-md bg-white/10 px-2.5 py-1">{b.research.length} research sources</span><span className="rounded-md bg-white/10 px-2.5 py-1">{b.revisions.length} revisions</span>
          <span className={`rounded-md px-2.5 py-1 ${gaps ? "bg-[#b7791f]/40 text-[#ffe3a3]" : "bg-white/10"}`}>{gaps} knowledge gap{gaps === 1 ? "" : "s"}</span>
        </div>
        <div className="mt-4"><Link href={`/projects/${id}/docs`} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-white px-3 text-[13px] font-medium text-primary hover:bg-accent-soft"><FileDown className="h-4 w-4" />Generate handoff document</Link></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_440px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Project background" description="What the team was trying to accomplish" />
            <div className="space-y-3 p-5 text-[13px] leading-relaxed text-foreground">
              <p>{b.project.description || <span className="text-muted-foreground">No project description recorded.</span>}</p>
              {backgrounds.map((n) => <div key={n.id} className="rounded-md bg-muted/60 p-3"><p className="font-medium">{n.title}</p><p className="mt-0.5">{n.body}</p></div>)}
              <div className="flex flex-wrap gap-1.5 pt-1">{b.subsystems.map((s) => <Link key={s.id} href={`/projects/${id}/subsystems/${s.id}`}><Badge className="hover:bg-border">{s.name}</Badge></Link>)}</div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Design history" description="How the design evolved, oldest first" action={<Link href={`/projects/${id}/history`} className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">Full timeline <ArrowRight className="h-3 w-3" /></Link>} />
            {keyRevs.length === 0 ? <p className="p-5 text-[13px] text-muted-foreground">No revisions recorded.</p> : (
              <ol className="relative ml-8 mr-5 border-l-2 border-border py-4">{keyRevs.map((r) => (
                <li key={r.id} className="relative pb-4 pl-5 last:pb-0"><span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-surface" style={{ background: REVISION_KIND[r.kind].color }} />
                  <Link href={refHref(id, "revision", r.id)} className="block rounded-md px-2 py-1 hover:bg-muted/60"><p className="text-[13px]"><Badge tone="accent" className="mr-1.5 font-mono">{r.rev_label}</Badge><span className="font-medium">{r.title}</span></p><p className="mt-0.5 text-xs text-muted-foreground">{formatDate(r.occurred_on)} · {REVISION_KIND[r.kind].label}{sub(r.subsystem_id) ? ` · ${sub(r.subsystem_id)}` : ""}</p></Link></li>))}</ol>)}
          </Card>

          <Card>
            <CardHeader title="Key decisions" description="What was decided, and why" action={<Link href={`/projects/${id}/decisions`} className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">All decisions <ArrowRight className="h-3 w-3" /></Link>} />
            {b.decisions.length === 0 ? <p className="p-5 text-[13px] text-muted-foreground">No decisions documented.</p> : (
              <ul className="divide-y divide-border">{b.decisions.map((d) => {
                const gap = !d.reasoning.trim() && evCount(d.id) === 0;
                const alts = d.alternatives.length;
                return (
                  <li key={d.id}><Link href={refHref(id, "decision", d.id)} className="block px-5 py-3.5 hover:bg-muted/60">
                    <div className="flex flex-wrap items-center gap-2"><p className="text-[13px] font-semibold">{d.title}</p><Badge tone={DECISION_STATUS[d.status].tone}>{DECISION_STATUS[d.status].label}</Badge>{gap && <Badge tone="warning"><AlertTriangle className="h-3 w-3" />Knowledge gap</Badge>}</div>
                    <p className="mt-1 text-[13px] text-muted-foreground">{d.reasoning ? d.reasoning.slice(0, 220) + (d.reasoning.length > 220 ? "…" : "") : <span className="text-warning">No reasoning was recorded for this decision.</span>}</p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">{sub(d.subsystem_id) ?? "No subsystem"} · {alts} alternative{alts === 1 ? "" : "s"} rejected · {evCount(d.id)} evidence link{evCount(d.id) === 1 ? "" : "s"}</p>
                  </Link></li>);
              })}</ul>)}
          </Card>

          <Card>
            <CardHeader title="Research behind decisions" description="Saved sources connected to design decisions" action={<Link href={`/projects/${id}/research`} className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">All research <ArrowRight className="h-3 w-3" /></Link>} />
            {linkedResearch.length === 0 ? <p className="p-5 text-[13px] text-muted-foreground">No research is linked to a decision yet. Connect a source to a decision in Research to show it here.</p> : (
              <ul className="divide-y divide-border">{linkedResearch.map((source) => {
                const decisions = b.decisions.filter((d) => b.evidence.some((e) => e.research_id === source.id && e.decision_id === d.id));
                return <li key={source.id} className="space-y-2 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2"><Link href={refHref(id, "research", source.id)} className="text-[13px] font-semibold text-accent hover:underline">{source.title}</Link>{source.is_sample && <SampleBadge />}</div>
                  <p className="text-[13px] text-muted-foreground">{source.why_important || "The team has not recorded why this source matters."}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>Linked decisions:</span>{decisions.map((decision) => <Link key={decision.id} href={refHref(id, "decision", decision.id)} className="rounded-md border border-border bg-muted px-2 py-1 text-foreground hover:border-accent hover:text-accent">{decision.title}</Link>)}</div>
                </li>;
              })}</ul>)}
          </Card>

          <div id="notes" className="space-y-6">
            <Card><CardHeader title="Lessons learned" description="Mistakes, failed approaches and useful discoveries" /><div className="p-5"><NotesPanel notes={b.notes} kind="lesson" projectId={id} subsystems={b.subsystems} /></div></Card>
            <Card>
              <CardHeader title="Unresolved issues" description="Problems that still need attention" />
              <div className="space-y-3 p-5">
                <NotesPanel notes={b.notes} kind="issue" projectId={id} subsystems={b.subsystems} trackStatus />
                {(openComments.length > 0 || pendingReviews.length > 0 || undocumented.length > 0 || !hasQuant) && (
                  <div className="rounded-lg border border-warning/30 bg-warning-soft/60 p-3.5 text-[13px]">
                    <p className="mb-1.5 flex items-center gap-1.5 font-semibold text-warning"><AlertTriangle className="h-4 w-4" />Detected from the project record</p>
                    <ul className="list-disc space-y-1 pl-5 text-warning">
                      {undocumented.map((d) => <li key={d.id}><Link className="underline" href={refHref(id, "decision", d.id)}>{d.title}</Link>: no reasoning or evidence recorded.</li>)}
                      {noEvidence.map((d) => <li key={d.id}><Link className="underline" href={refHref(id, "decision", d.id)}>{d.title}</Link>: reasoning recorded but no linked evidence.</li>)}
                      {openComments.map((c) => <li key={c.id}>Open review comment from {c.author_name}: <Link className="underline" href={`/projects/${id}/reviews?open=${c.review_id}`}>“{c.body.slice(0, 70)}{c.body.length > 70 ? "…" : ""}”</Link></li>)}
                      {pendingReviews.filter((r) => r.status === "pending").map((r) => <li key={r.id}>Review not started: <Link className="underline" href={`/projects/${id}/reviews?open=${r.id}`}>{r.title}</Link></li>)}
                      {!hasQuant && <li>No simulation results are recorded for this project.</li>}
                    </ul>
                  </div>)}
              </div>
            </Card>
            <Card><CardHeader title="Recommended next steps" description="Actions the next engineer should consider" /><div className="p-5"><NotesPanel notes={b.notes} kind="next_step" projectId={id} subsystems={b.subsystems} trackStatus /></div></Card>
          </div>
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Lightbulb className="h-3.5 w-3.5" />Ask the project instead of the previous engineer.</div>
          <ChatPanel compact projectId={id} projectName={b.project.name} aiEnabled={openaiConfigured()} initialMessages={conv.messages} initialConversationId={conv.conversationId}
            suggestions={["Why did we change the suspension design?", "What should I work on next?", "What failed and what did we learn?", "Which decisions are missing documentation?"]} />
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Layers } from "lucide-react";
import { AddComponentButton } from "@/components/hub/add-component";
import { AssemblyViewer, type HubComponent } from "@/components/hub/assembly-viewer";
import { ProjectModel } from "@/components/hub/project-model";
import { EmptyModelViewer } from "@/components/hub/empty-model-viewer";
import { HubResearchPanel } from "@/components/hub/research-panel";
import { ComponentIcon } from "@/components/hub/icons";
import { LivingSummary, NeedsAttention, ReadinessPanel, reviewTone } from "@/components/hub/panels";
import { Badge } from "@/components/ui/badge";
import { TabBar } from "@/components/ui/tab-bar";
import { EmptyState } from "@/components/ui/misc";
import { HistoryView } from "@/components/views/history-view";
import type { ProjectBundle } from "@/lib/bundle";
import type { Part } from "@/lib/cad/types";
import { attentionItems, buildComponents, reviewStateLabel } from "@/lib/readiness";
import { scopeFromBundle } from "@/lib/scope";
import { modelPartEntries } from "@/lib/cad/part-markers";

const TABS = [["overview", "Overview"], ["components", "Components"], ["history", "Design History"]] as const;

export function HubView({ b, parts, placeholder, tab, modelLinks }: { b: ProjectBundle; parts: Part[]; placeholder: boolean; tab: string; modelLinks: { part_key: string; subsystem_id: string }[] }) {
  const id = b.project.id;
  const viewerModel = b.files.find((file) => file.id === b.project.viewer_model_file_id) ?? null;
  const comps = buildComponents(b);
  const hubComps: HubComponent[] = comps.map((c) => ({
    id: c.subsystem.id, name: c.subsystem.name, marker: c.subsystem.marker_position, done: c.done, total: c.total, statusLabel: c.status.label, statusTone: c.status.tone,
    latestDecision: c.latestDecision ? { id: c.latestDecision.id, title: c.latestDecision.title } : null, reviewLabel: reviewStateLabel(c.reviewState), reviewTone: reviewTone(c.reviewState),
    href: `/projects/${id}/components/${c.subsystem.id}`,
  }));
  const hubParts: HubComponent[] = placeholder ? [] : modelPartEntries(parts).map(({ part, name, marker }) => ({
    id: `part-${part.id}`, partId: part.id, name, marker, done: 0, total: 0,
    statusLabel: "Model part", statusTone: "neutral", reviewLabel: "Model part", reviewTone: "neutral",
    latestDecision: null, href: `/projects/${id}/parts/${part.id}`,
  }));
  const currentRev = [...b.revisions].filter((r) => ["initial", "design_change"].includes(r.kind)).sort((a, c) => c.occurred_on.localeCompare(a.occurred_on))[0];
  return (
    <div>
      <TabBar tabs={TABS.map(([k, label]) => ({ label, active: tab === k, href: k === "overview" ? `/projects/${id}` : `/projects/${id}?tab=${k}` }))} />

      {tab === "overview" && (
        <div key="overview" className="animate-fade-in grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="stagger min-w-0 space-y-5">
            <ProjectModel key={viewerModel?.id ?? "empty"} projectId={id} model={viewerModel} components={hubComps} modelLinks={modelLinks} />
            {!viewerModel && (parts.length > 0 ? <AssemblyViewer projectId={id} parts={parts} components={hubComps} individualParts={hubParts.length ? hubParts : undefined} revisionLabel={currentRev ? `Revision ${currentRev.rev_label}` : null} placeholder={placeholder} /> : <EmptyModelViewer />)}
            <HubResearchPanel bundle={b} />
            <LivingSummary b={b} comps={comps} />
          </div>
          <div className="stagger space-y-5">
            <ReadinessPanel projectId={id} comps={comps} />
            <NeedsAttention items={attentionItems(b, comps)} />
          </div>
        </div>
      )}

      {tab === "components" && (
        <div key="components" className="animate-fade-in">
          <div className="mb-4 flex items-center justify-between gap-3"><p className="text-[13px] text-muted-foreground">Each component is its own workspace for research, decisions, revisions and reviews.</p><AddComponentButton projectId={id} /></div>
          {comps.length === 0 ? <EmptyState icon={<Layers className="h-5 w-5" />} title="No components yet" description="Break the project into components such as Suspension, Steering, Chassis and Drivetrain." action={<AddComponentButton projectId={id} />} /> : (
            <div className="stagger grid gap-4 md:grid-cols-2">
              {comps.map((c) => (
                <Link key={c.subsystem.id} href={`/projects/${id}/components/${c.subsystem.id}`} className="card-hover group rounded-lg border border-border bg-surface bg-gradient-to-b from-white/[0.018] to-transparent p-5 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-soft text-accent ring-1 ring-accent/20 transition-transform duration-300 ease-[var(--ease-spring)] group-hover:scale-110 group-hover:-rotate-6"><ComponentIcon name={c.subsystem.name} className="h-[18px] w-[18px]" /></span><h3 className="text-[15px] font-semibold">{c.subsystem.name}</h3></div>
                    <Badge tone={c.status.tone}>{c.status.label}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-[13px] text-muted-foreground">{c.subsystem.description || "No description recorded."}</p>
                  <div className="mt-3 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="progress-fill h-full rounded-full bg-gradient-to-r from-[#2f7cf2] to-[#6aa8ff]" style={{ width: `${(c.done / c.total) * 100}%` }} /></div><span className="text-[11.5px] tabular-nums text-muted-foreground">{c.done} / {c.total}</span></div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{c.decisions.length} decisions</span><span>{c.research.length} sources</span><span>{c.revisions.length} revisions</span>
                    <Badge tone={reviewTone(c.reviewState)} className="ml-auto">{reviewStateLabel(c.reviewState)}</Badge>
                  </div>
                </Link>
              ))}
            </div>)}
        </div>
      )}

      {tab === "history" && <div key="history" className="animate-fade-in"><HistoryView scope={scopeFromBundle(b)} projectId={id} /></div>}
    </div>
  );
}

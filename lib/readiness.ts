import type { ProjectBundle } from "./bundle";
import type { Decision, ProjectNote, Research, Review, ReviewComment, Revision, Subsystem } from "./types";
import type { Tone } from "@/components/ui/badge";

// Documentation readiness answers one question: "is the reasoning for this component written down?"
// It is derived only from saved records. It says nothing about whether the engineering is correct and is NOT an approval.
export const CRITERIA = [
  { key: "described", label: "Design described", rule: "The component has a description of at least 20 characters." },
  { key: "choices", label: "Choices explained", rule: "At least one decision for this component records its reasoning." },
  { key: "alternatives", label: "Alternatives recorded", rule: "At least one decision for this component lists an alternative that was considered." },
  { key: "sources", label: "Sources attached", rule: "Research is tagged to this component, or linked as evidence to one of its decisions." },
  { key: "revision", label: "Latest revision explained", rule: "The most recent revision for this component records both what changed and why." },
  { key: "review", label: "Review completed", rule: "A review exists for this component, is Approved or Resolved, and has no open comments." },
] as const;
export type CriterionKey = (typeof CRITERIA)[number]["key"];

export interface ChecklistItem { key: CriterionKey; label: string; rule: string; ok: boolean; detail: string }
export type ReviewState = "none" | "pending" | "in_review" | "changes_requested" | "approved";

export interface ComponentModel {
  subsystem: Subsystem;
  decisions: Decision[];
  research: Research[];
  revisions: Revision[];
  reviews: Review[];
  openComments: ReviewComment[];
  issues: ProjectNote[];
  nextSteps: ProjectNote[];
  latestDecision: Decision | null;           // latest decision that actually records reasoning
  items: ChecklistItem[];
  done: number;
  total: number;
  status: { label: string; tone: Tone };     // documentation status (NOT engineering approval)
  reviewState: ReviewState;
  missing: ChecklistItem[];
}

const REVIEW_LABEL: Record<ReviewState, string> = { none: "No review", pending: "Review pending", in_review: "In review", changes_requested: "Changes requested", approved: "Review approved" };
export const reviewStateLabel = (s: ReviewState) => REVIEW_LABEL[s];

export function buildComponent(b: ProjectBundle, subsystem: Subsystem): ComponentModel {
  const id = subsystem.id;
  const decisions = b.decisions.filter((d) => d.subsystem_id === id);
  const decisionIds = new Set(decisions.map((d) => d.id));
  const evidenceResearch = new Set(b.evidence.filter((e) => decisionIds.has(e.decision_id) && e.research_id).map((e) => e.research_id!));
  const research = b.research.filter((r) => r.subsystem_id === id || evidenceResearch.has(r.id));
  const revisions = b.revisions.filter((r) => r.subsystem_id === id).sort((a, c) => c.occurred_on.localeCompare(a.occurred_on) || c.created_at.localeCompare(a.created_at));
  const reviews = b.reviews.filter((r) => r.subsystem_id === id);
  const reviewIds = new Set(reviews.map((r) => r.id));
  const openComments = b.comments.filter((c) => reviewIds.has(c.review_id) && !c.parent_id && !c.resolved);
  const issues = b.notes.filter((n) => n.subsystem_id === id && n.kind === "issue" && n.status === "open");
  const nextSteps = b.notes.filter((n) => n.subsystem_id === id && n.kind === "next_step" && n.status === "open");
  const documented = decisions.filter((d) => d.reasoning.trim());
  const latestDecision = [...documented].sort((a, c) => c.decided_on.localeCompare(a.decided_on))[0] ?? null;

  const latest = revisions[0];
  const reviewsDone = reviews.length > 0 && reviews.every((r) => r.status === "approved" || r.status === "resolved") && openComments.length === 0;
  const ok: Record<CriterionKey, [boolean, string]> = {
    described: [subsystem.description.trim().length >= 20, subsystem.description.trim().length >= 20 ? "Description recorded" : "No description (or fewer than 20 characters)"],
    choices: [documented.length > 0, documented.length ? `${documented.length} of ${decisions.length} decision${decisions.length === 1 ? "" : "s"} explain their reasoning` : decisions.length ? "Decisions exist but none record reasoning" : "No decisions recorded"],
    alternatives: [decisions.some((d) => d.alternatives.length > 0), decisions.some((d) => d.alternatives.length > 0) ? "Alternatives recorded" : decisions.length ? "No decision lists alternatives" : "No decisions recorded"],
    sources: [research.length > 0, research.length ? `${research.length} source${research.length === 1 ? "" : "s"} attached` : "No research tagged or linked"],
    revision: [Boolean(latest && latest.description.trim() && latest.reason.trim()), latest ? (latest.description.trim() && latest.reason.trim() ? `${latest.rev_label} explains what and why` : `${latest.rev_label} is missing ${latest.reason.trim() ? "what changed" : "why it changed"}`) : "No revisions recorded"],
    review: [reviewsDone, reviewsDone ? "All reviews approved or resolved" : reviews.length ? (openComments.length ? `${openComments.length} open review comment${openComments.length === 1 ? "" : "s"}` : "Review not yet approved or resolved") : "No review requested"],
  };
  const items: ChecklistItem[] = CRITERIA.map((c) => ({ key: c.key, label: c.label, rule: c.rule, ok: ok[c.key][0], detail: ok[c.key][1] }));
  const missing = items.filter((i) => !i.ok);

  // Review state is shown beside readiness, never merged into it.
  const reviewState: ReviewState = !reviews.length ? "none"
    : reviews.some((r) => r.status === "changes_requested") ? "changes_requested"
    : reviews.some((r) => r.status === "in_review") ? "in_review"
    : reviews.some((r) => r.status === "pending") ? "pending"
    : "approved";

  const first = missing[0]?.key;
  const status: ComponentModel["status"] = !missing.length ? { label: "Ready for handoff", tone: "success" }
    : first === "choices" ? { label: "Missing reasoning", tone: "warning" }
    : first === "alternatives" ? { label: "Missing alternatives", tone: "warning" }
    : first === "described" ? { label: "Needs description", tone: "warning" }
    : first === "sources" ? { label: "Needs sources", tone: "warning" }
    : first === "revision" ? { label: "Revision unexplained", tone: "warning" }
    : { label: "Review pending", tone: "accent" };

  return { subsystem, decisions, research, revisions, reviews, openComments, issues, nextSteps, latestDecision, items, done: items.length - missing.length, total: items.length, status, reviewState, missing };
}

export function buildComponents(b: ProjectBundle): ComponentModel[] { return b.subsystems.map((s) => buildComponent(b, s)); }

export interface AttentionItem { id: string; label: string; detail: string; href: string; severity: number }

/** "Needs attention" is derived from incomplete documentation, open review comments and open issues. */
export function attentionItems(b: ProjectBundle, comps: ComponentModel[]): AttentionItem[] {
  const base = `/projects/${b.project.id}`;
  const out: AttentionItem[] = [];
  for (const c of comps) {
    const name = c.subsystem.name;
    const at = (tab: string) => `${base}/components/${c.subsystem.id}?tab=${tab}`;
    for (const m of c.missing) {
      if (m.key === "choices") out.push({ id: `${c.subsystem.id}:choices`, label: `Explain ${name.toLowerCase()} reasoning`, detail: m.detail, href: at("decisions"), severity: 1 });
      else if (m.key === "revision") out.push({ id: `${c.subsystem.id}:revision`, label: `Explain ${name.toLowerCase()} revision`, detail: m.detail, href: at("revisions"), severity: 2 });
      else if (m.key === "alternatives") out.push({ id: `${c.subsystem.id}:alt`, label: `Add ${name.toLowerCase()} alternatives`, detail: m.detail, href: at("decisions"), severity: 3 });
      else if (m.key === "sources") out.push({ id: `${c.subsystem.id}:src`, label: `Attach sources for ${name.toLowerCase()}`, detail: m.detail, href: at("research"), severity: 4 });
      else if (m.key === "described") out.push({ id: `${c.subsystem.id}:desc`, label: `Describe ${name.toLowerCase()}`, detail: m.detail, href: at("summary"), severity: 4 });
      else if (m.key === "review") {
        const open = c.reviews.find((r) => r.status !== "approved" && r.status !== "resolved");
        out.push(open
          ? { id: `${c.subsystem.id}:review`, label: `Resolve ${name.toLowerCase()} review`, detail: m.detail, href: `${base}/reviews?open=${open.id}`, severity: 2 }
          : { id: `${c.subsystem.id}:review`, label: `Request ${name.toLowerCase()} review`, detail: m.detail, href: at("reviews"), severity: 5 });
      }
    }
  }
  for (const n of b.notes.filter((x) => x.kind === "issue" && x.status === "open" && !x.subsystem_id)) out.push({ id: `note:${n.id}`, label: n.title, detail: "Open issue", href: `${base}/handoff#notes`, severity: 3 });
  return out.sort((a, c) => a.severity - c.severity).slice(0, 8);
}

export const componentsNeedingAttention = (comps: ComponentModel[]) => comps.filter((c) => c.done < c.total).length;

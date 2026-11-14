import type { Tone } from "@/components/ui/badge";
import type { DecisionStatus, ResearchType, ReviewStatus, RevisionKind } from "@/lib/types";

export const DECISION_STATUS: Record<DecisionStatus, { label: string; tone: Tone }> = {
  proposed: { label: "Proposed", tone: "neutral" }, accepted: { label: "Accepted", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" }, superseded: { label: "Superseded", tone: "warning" },
};
export const REVIEW_STATUS: Record<ReviewStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "neutral" }, in_review: { label: "In review", tone: "accent" },
  changes_requested: { label: "Changes requested", tone: "warning" }, approved: { label: "Approved", tone: "success" }, resolved: { label: "Resolved", tone: "success" },
};
export const RESEARCH_TYPE: Record<ResearchType, string> = { url: "Website", pdf: "PDF", paper: "Research paper", article: "Technical article", image: "Image", note: "Personal note" };
export const REVISION_KIND: Record<RevisionKind, { label: string; tone: Tone; color: string }> = {
  initial: { label: "Initial design", tone: "neutral", color: "#667085" },
  research: { label: "Research discovery", tone: "accent", color: "#2563ff" },
  design_change: { label: "Design change", tone: "accent", color: "#0e1b33" },
  simulation: { label: "Simulation", tone: "warning", color: "#b7791f" },
  feedback: { label: "Peer feedback", tone: "warning", color: "#b7791f" },
  final: { label: "Final revision", tone: "success", color: "#2f855a" },
};

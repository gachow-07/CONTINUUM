import type { Tone } from "@/components/ui/badge";

/** One colour per component, in project order, shared by the readiness card and the 3D viewer list. Never amber, which means "needs attention". */
const COMPONENT_COLORS = ["#22d3ee", "#4ade80", "#a78bfa", "#f472b6", "#60a5fa", "#2dd4bf", "#e879f9", "#c9d46a"];
export const componentColor = (index: number) => COMPONENT_COLORS[index % COMPONENT_COLORS.length];

/** Soft text colours for documentation status, matching the badge tones. */
export const toneText: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  accent: "text-[#8be9f7]",
  success: "text-success",
  warning: "text-[#f5b74f]",
  danger: "text-danger",
};

import type { Tone } from "@/components/ui/badge";

/** One colour per component, in project order, shared by the readiness card and the 3D viewer list. */
const COMPONENT_COLORS = ["#4d94ff", "#5fd3a0", "#e8b866", "#b79cff", "#ff8a7a", "#5fd0e0", "#f2a3d6", "#c9d46a"];
export const componentColor = (index: number) => COMPONENT_COLORS[index % COMPONENT_COLORS.length];

/** Soft text colours for documentation status, matching the badge tones. */
export const toneText: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  accent: "text-[#8fc3ff]",
  success: "text-success",
  warning: "text-[#e8b866]",
  danger: "text-danger",
};

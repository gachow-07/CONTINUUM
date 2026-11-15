import type { ReactNode } from "react";

const tips: Record<string, string> = {
  Orbit: "Drag to rotate the view around the model.",
  Pan: "Drag to move the view without rotating it.",
  Isolate: "Show only the selected part or component.",
  Fit: "Fit the model in the viewer.",
  Grid: "Show or hide the ground grid.",
  Markers: "Show or hide the current component or part markers.",
  List: "Show or hide the parts and components list.",
  "Show parts": "Switch markers and selection to individual parts.",
  "Parts on": "Switch markers and selection back to components.",
};

export function ViewerTip({ label, children }: { label: string; children: ReactNode }) {
  return <span className="group relative inline-flex" title={tips[label]}>{children}<span role="tooltip" className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 hidden w-max max-w-48 -translate-x-1/2 whitespace-normal rounded-md border border-border bg-surface px-2 py-1.5 text-center text-xs text-foreground shadow-lg group-hover:block group-focus-within:block">{tips[label]}</span></span>;
}

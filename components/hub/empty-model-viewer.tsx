"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Grid3x3, Info } from "lucide-react";

const EmptyGridScene = dynamic(() => import("./empty-grid-scene"), { ssr: false });

export function EmptyModelViewer() {
  const [grid, setGrid] = useState(true);
  return <section aria-label="Empty model viewer" className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
    <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
      <h2 className="text-sm font-semibold">Current assembly</h2>
      <button type="button" aria-pressed={grid} onClick={() => setGrid((value) => !value)} className={`flex min-h-10 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium ${grid ? "bg-accent-soft text-accent" : "text-muted-foreground hover:bg-muted"}`}><Grid3x3 className="h-3.5 w-3.5" />Grid</button>
    </div>
    <div className="relative flex h-[340px] items-center justify-center overflow-hidden bg-[#101113] sm:h-[460px]">
      <div aria-label="3D grid" className="absolute inset-0"><EmptyGridScene showGrid={grid} /></div>
      <div role="status" className="pointer-events-none relative mx-4 flex max-w-sm items-start gap-2 rounded-lg border border-border-strong bg-surface/95 px-4 py-3 text-sm shadow-card"><Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><p><span className="font-semibold">No model yet.</span> <span className="text-muted-foreground">Upload a GLB model above to see it here.</span></p></div>
    </div>
  </section>;
}

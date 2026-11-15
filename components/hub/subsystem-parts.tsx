"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { loadModelParts, type ModelPart } from "@/lib/cad/model-parts-cache";
import { cn } from "@/lib/utils";

/**
 * Every model part linked to this subsystem. Clicking a part opens its details (description and the subsystem's design
 * choices) on the Summary tab; clicking the selected part again closes them.
 */
export function SubsystemParts({ base, sid, modelPath, partKeys, selectedKey, loadError }: { base: string; sid: string; modelPath: string | null; partKeys: string[]; selectedKey?: string; loadError: boolean }) {
  const [parts, setParts] = useState<ModelPart[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const keys = partKeys.join("|");
  useEffect(() => {
    if (!modelPath || !keys) return;
    let live = true;
    const allowed = new Set(keys.split("|"));
    loadModelParts(modelPath).then((all) => { if (live) setParts(all.filter((part) => allowed.has(part.key))); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [modelPath, keys]);
  const shown = (parts ?? []).filter((part) => part.name.toLowerCase().includes(query.trim().toLowerCase()));
  const href = (key?: string) => `${base}/components/${sid}?tab=summary${key ? `&part=${encodeURIComponent(key)}` : ""}`;
  return (
    <Card className="mt-4">
      <CardHeader title="Parts" action={<span className="font-mono text-[11px] tabular-nums text-muted-foreground">{partKeys.length}</span>} />
      <div className="p-1.5">
        {!modelPath ? <p className="px-2.5 py-2 text-xs text-muted-foreground">No 3D model uploaded yet.</p>
          : loadError ? <p role="alert" className="px-2.5 py-2 text-xs text-warning">Part assignments could not be loaded.</p>
          : partKeys.length === 0 ? <p className="px-2.5 py-2 text-xs text-muted-foreground">No model parts in this subsystem yet. Select a part on the Overview and use + to link it.</p>
          : failed ? <p role="alert" className="px-2.5 py-2 text-xs text-warning">Model parts could not be loaded.</p>
          : parts === null ? <p className="px-2.5 py-2 text-xs text-muted-foreground">Loading {partKeys.length} parts…</p>
          : <>
            {parts.length > 8 && <label className="relative mb-1 block"><Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search parts in this subsystem" placeholder="Search parts"
                className="h-[30px] w-full rounded-md border border-border bg-background pl-8 pr-2 text-xs outline-none focus:border-accent" /></label>}
            <ul className="scroll-thin max-h-[420px] overflow-y-auto">
              {shown.map((part) => { const on = part.key === selectedKey; return <li key={part.key}>
                <Link href={href(on ? undefined : part.key)} scroll={false} aria-current={on ? "true" : undefined}
                  className={cn("flex items-center gap-2 truncate rounded-md px-2.5 py-1.5 font-mono text-[11.5px] transition-colors", on ? "bg-accent-soft text-[#8be9f7] ring-1 ring-accent/40" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                  <span className="h-1 w-1 shrink-0 rounded-full bg-current opacity-60" /><span className="truncate">{part.name}</span>
                </Link></li>; })}
              {shown.length === 0 && <li className="px-2.5 py-2 text-xs text-muted-foreground">No parts match “{query}”.</li>}
            </ul>
          </>}
      </div>
    </Card>
  );
}

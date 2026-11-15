"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CircleHelp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fileUrl } from "@/lib/client";
import { glbPartCount } from "@/lib/cad/glb-part-count";

/**
 * "Undefined" on the Components tab: the model parts that are not in any subsystem yet, so they don't get lost.
 * The total comes from the model file itself; the linked count comes from the saved links.
 */
export function UndefinedPartsCard({ projectId, modelPath, modelName, linkedCount }: { projectId: string; modelPath: string; modelName: string; linkedCount: number }) {
  const [total, setTotal] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    glbPartCount(fileUrl(modelPath), controller.signal).then(setTotal).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [modelPath]);
  const unlinked = total === null ? null : Math.max(0, total - linkedCount);
  const linkedShare = total ? Math.min(1, linkedCount / total) : 0;
  return (
    <Link href={`/projects/${projectId}`} className="group rounded-lg border border-dashed border-border-strong bg-surface/60 p-5 transition-colors hover:border-[#6c7178]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground"><CircleHelp className="h-[18px] w-[18px]" /></span><h3 className="text-[15px] font-semibold">Undefined</h3></div>
        {unlinked !== null && <Badge tone={unlinked ? "warning" : "success"}>{unlinked ? `${unlinked} part${unlinked === 1 ? "" : "s"} not in a subsystem` : "Every part is in a subsystem"}</Badge>}
      </div>
      <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-[13px] text-muted-foreground">
        {failed ? "Couldn't read the model's parts. Open the Overview to see them." : <>Parts of <span className="font-mono text-[12px]">{modelName.replace(/\.glb$/i, "")}</span> that don&apos;t belong to a subsystem yet. Select one on the Overview and use + to link it.</>}
      </p>
      <div className="mt-3 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[#6c7178]" style={{ width: `${linkedShare * 100}%` }} /></div>
        <span className="text-[11.5px] tabular-nums text-muted-foreground">{total === null ? (failed ? "—" : "Counting…") : `${linkedCount} / ${total} linked`}</span></div>
      <div className="mt-3 flex items-center text-xs text-muted-foreground">
        <span className="ml-auto inline-flex items-center gap-1 font-medium text-[#8be9f7] group-hover:underline">Link parts on the Overview <ArrowRight className="h-3 w-3" /></span>
      </div>
    </Link>
  );
}

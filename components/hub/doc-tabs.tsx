"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Sub-navigation for the Documentation section of a project. */
export function DocTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const tabs = [["/handoff", "Handoff summary"], ["/docs", "Generate documents"], ["/files", "Files"], ["/assistant", "Ask AI"]] as const;
  return (
    <div className="mb-5 flex gap-1 border-b border-border" role="tablist">
      {tabs.map(([s, l]) => <Link key={s} role="tab" aria-selected={pathname.startsWith(base + s)} href={base + s} className={cn("-mb-px border-b-2 px-3.5 py-2.5 text-[13px] font-medium", pathname.startsWith(base + s) ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{s === "/assistant" ? <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-[#7dd3fc]" /><span className="ai-text font-semibold">{l}</span></span> : l}</Link>)}
    </div>
  );
}

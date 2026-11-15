"use client";
import { usePathname } from "next/navigation";
import { TabBar } from "@/components/ui/tab-bar";

/** Sub-navigation for the Documentation section of a project. */
export function DocTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const tabs = [["/handoff", "Handoff summary"], ["/docs", "Generate documents"], ["/files", "Files"], ["/assistant", "Ask AI"]] as const;
  return <TabBar size="sm" tabs={tabs.map(([s, l]) => ({ label: l, href: base + s, active: pathname.startsWith(base + s) }))} />;
}

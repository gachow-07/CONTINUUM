"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  ["/workspace", "3D Model"], ["", "Overview"], ["/subsystems", "Subsystems"], ["/research", "Research"], ["/history", "Design History"], ["/files", "Files"],
  ["/decisions", "Design Decisions"], ["/reviews", "Reviews"], ["/docs", "Documentation"], ["/handoff", "Handoff"], ["/assistant", "Ask AI"],
] as const;

export function ProjectTabs({ id }: { id: string }) {
  const pathname = usePathname();
  const base = `/projects/${id}`;
  return (
    <nav className="scroll-thin -mx-4 mb-6 flex gap-0.5 overflow-x-auto border-b border-border px-4 sm:-mx-8 sm:px-8" aria-label="Project sections">
      {TABS.map(([suffix, label]) => {
        const href = base + suffix;
        const active = suffix === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link key={label} href={href} className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors",
            active ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

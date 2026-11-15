"use client";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type TabItem = { href: string; label: React.ReactNode; active: boolean };

/** Link-based tabs whose underline slides to the active tab. */
export function TabBar({ tabs, className, size = "md" }: { tabs: TabItem[]; className?: string; size?: "sm" | "md" }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);
  const [ready, setReady] = useState(false);
  // Highlight the clicked tab immediately; the server render then confirms it.
  const [pending, setPending] = useState<{ href: string; from: string } | null>(null);
  const confirmed = tabs.find((t) => t.active)?.href ?? "";
  const current = pending && pending.from === confirmed ? pending.href : confirmed;
  const activeIndex = tabs.findIndex((t) => t.href === current);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      const a = el.querySelector<HTMLElement>('[aria-selected="true"]');
      setBar(a ? { left: a.offsetLeft, width: a.offsetWidth } : null);
    };
    measure();
    // Enable the slide only after the first position is set, so it doesn't sweep in from 0 on load.
    const raf = requestAnimationFrame(() => setReady(true));
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [activeIndex]);

  return (
    <div ref={wrap} role="tablist" className={cn("relative mb-5 flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none]", className)}>
      {tabs.map((t) => (
        <Link key={t.href} role="tab" aria-selected={t.href === current} href={t.href} scroll={false} onClick={() => setPending({ href: t.href, from: confirmed })}
          className={cn("relative whitespace-nowrap rounded-t-md font-medium transition-colors duration-200",
            size === "sm" ? "px-3 py-2 text-[13px]" : "px-4 py-2.5 text-[13.5px]",
            t.href === current ? "text-foreground" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground")}>
          {t.label}
        </Link>
      ))}
      {bar && (
        <span aria-hidden className={cn("pointer-events-none absolute bottom-0 h-0.5 rounded-full bg-accent shadow-[0_0_12px_rgb(61_139_255/0.8)]", ready && "transition-[left,width] duration-[400ms] ease-[var(--ease-spring)]")}
          style={{ left: bar.left, width: bar.width }} />
      )}
    </div>
  );
}

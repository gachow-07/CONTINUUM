"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChevronRight, CircleCheck, CircleDashed, CircleHelp } from "lucide-react";
import type { Tone } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { componentColor, toneText } from "./palette";

export interface ReadinessRow {
  id: string; name: string; href: string; done: number; total: number;
  status: { label: string; tone: Tone };
  items: { key: string; label: string; ok: boolean; detail: string }[];
}

const RING_R = 29;
const RING_C = 2 * Math.PI * RING_R;

/** Documentation readiness: an overall ring plus one expandable row per component. */
export function ReadinessCard({ rows, criteria, className }: { rows: ReadinessRow[]; criteria: { key: string; label: string; rule: string }[]; className?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const done = rows.reduce((sum, r) => sum + r.done, 0);
  const total = rows.reduce((sum, r) => sum + r.total, 0);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const need = rows.filter((r) => r.done < r.total).length;

  return (
    <section aria-labelledby="readiness-title" className={cn("overflow-hidden rounded-2xl text-[#f2f4f5]", className ?? "surface-premium")}>
      <div className="flex items-center gap-4 px-5 pb-3 pt-5">
        <div className="min-w-0">
          <p className="eyebrow">Documentation</p>
          <h2 id="readiness-title" className="mt-0.5 text-base font-semibold tracking-[-0.02em]">Readiness</h2>
          <p className="text-xs text-[#6c7178]">How much of the reasoning is written down</p>
        </div>
        {rows.length > 0 && (
          <div className="relative ml-auto h-[70px] w-[70px] shrink-0" role="img" aria-label={`${done} of ${total} criteria complete, ${pct} percent`}>
            <svg width="70" height="70" viewBox="0 0 70 70" className="absolute inset-0 -rotate-90 overflow-visible" aria-hidden>
              <defs><linearGradient id="readiness-ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0891b2" /><stop offset="1" stopColor="#a5f3fc" /></linearGradient></defs>
              <circle cx="35" cy="35" r={RING_R} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="5" />
              <circle cx="35" cy="35" r={RING_R} fill="none" stroke="url(#readiness-ring)" strokeWidth="5" strokeLinecap="round" className="animate-ring-draw drop-shadow-[0_0_6px_rgba(34,211,238,0.45)]"
                style={{ "--ring-c": RING_C, "--ring-to": RING_C * (1 - (total ? done / total : 0)), strokeDashoffset: RING_C * (1 - (total ? done / total : 0)) } as React.CSSProperties} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[17px] font-semibold tracking-[-0.03em] tabular-nums">{pct}%</span>
              <span className="-mt-0.5 text-[10px] tabular-nums text-[#6c7178]">{done} / {total}</span>
            </div>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="px-5 pb-5 text-[13px] text-[#a9adb3]">No components yet. Add components to track how well each one is documented.</p>
      ) : (
        <>
          <div className={cn("mx-5 mb-1 flex items-center gap-2.5 rounded-xl border px-3 py-2 text-xs", need ? "border-[#f5b74f]/15 bg-linear-to-r from-[#f5b74f]/12 to-[#f5b74f]/3 text-[#fbd99a]" : "border-success/20 bg-success-soft text-success")}>
            <span className="relative h-[7px] w-[7px] shrink-0 rounded-full bg-current">{need > 0 && <span className="animate-soft-pulse absolute -inset-1 rounded-full border border-current" />}</span>
            {need ? `${need} of ${rows.length} components need attention` : "All components are fully documented"}
          </div>

          <ul className="px-2 pb-1 pt-0.5">
            {rows.map((r, i) => {
              const isOpen = open === r.id;
              return (
                <li key={r.id} className={cn("ease-premium rounded-xl transition-colors duration-300", isOpen ? "bg-white/[0.045]" : "hover:bg-white/[0.03]")}>
                  <button type="button" aria-expanded={isOpen} aria-controls={`readiness-${r.id}`} onClick={() => setOpen(isOpen ? null : r.id)} className="block w-full rounded-xl px-2.5 py-2.5 text-left">
                    <span className="flex items-center gap-2.5">
                      <span className="h-[7px] w-[7px] shrink-0 rounded-full shadow-[0_0_0_3px_rgba(255,255,255,0.03)]" style={{ background: componentColor(i) }} />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium tracking-[-0.01em]">{r.name}</span>
                      <span className="text-[11.5px] tabular-nums text-[#6c7178]">{r.done}/{r.total}</span>
                      <ChevronRight className={cn("ease-premium h-3.5 w-3.5 text-[#6c7178] transition-transform duration-500", isOpen && "rotate-90 text-[#a9adb3]")} aria-hidden />
                    </span>
                    <span className={cn("ml-[17px] mt-0.5 flex items-center gap-1.5 text-[11px]", toneText[r.status.tone])}><span className="h-[5px] w-[5px] rounded-full bg-current" />{r.status.label}</span>
                    <span className="relative ml-[17px] mt-2 block h-1 overflow-hidden rounded-full bg-white/[0.07]" aria-hidden>
                      <span className="animate-bar-fill absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-[#0891b2] to-[#8be9f7] shadow-[0_0_12px_rgba(34,211,238,0.55)]"
                        style={{ width: `${(r.done / r.total) * 100}%`, "--bar-w": `${(r.done / r.total) * 100}%`, animationDelay: `${0.35 + i * 0.12}s` } as React.CSSProperties} />
                      <span className="absolute inset-0 flex">{r.items.map((item) => <span key={item.key} className="flex-1 border-r-2 border-[#101113] last:border-r-0" />)}</span>
                    </span>
                  </button>
                  <div id={`readiness-${r.id}`} className="expand" data-open={isOpen}>
                    <div>
                      <ul className={cn("ease-premium grid gap-x-3 gap-y-1.5 pb-1 pl-[27px] pr-2.5 transition-[opacity,transform] duration-400 sm:grid-cols-2", isOpen ? "translate-y-0 opacity-100 delay-100" : "-translate-y-1 opacity-0")}>
                        {r.items.map((item) => (
                          <li key={item.key} title={item.detail} className={cn("flex items-center gap-1.5 text-[11.5px]", item.ok ? "text-[#a9adb3]" : "text-[#f5b74f]")}>
                            {item.ok ? <CircleCheck className="h-3.5 w-3.5 shrink-0 text-[#22d3ee]" aria-hidden /> : <CircleDashed className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                            <span>{item.label}<span className="sr-only">: {item.ok ? "done" : "missing"}. {item.detail}</span></span>
                          </li>
                        ))}
                      </ul>
                      <Link href={r.href} tabIndex={isOpen ? 0 : -1} className="ease-premium mb-3 ml-[27px] mt-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#8be9f7] transition-[gap] duration-300 hover:gap-2.5">
                        Open {r.name} <ArrowRight className="h-3 w-3" aria-hidden />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mx-5 grid gap-2 border-t border-white/[0.06] pb-4 pt-3 text-[11.5px] text-[#6c7178]">
            <p>Readiness measures whether reasoning is written down. Engineering approval is tracked separately, in Reviews.</p>
            <details className="group">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[#a9adb3] hover:text-[#f2f4f5]"><CircleHelp className="h-3.5 w-3.5" aria-hidden />How readiness is calculated</summary>
              <ul className="mt-2 grid gap-1 pl-4">{criteria.map((c) => <li key={c.key} className="list-disc"><span className="text-[#a9adb3]">{c.label}.</span> {c.rule}</li>)}</ul>
            </details>
          </div>
        </>
      )}
    </section>
  );
}

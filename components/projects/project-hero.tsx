import Link from "next/link";
import { ArrowRight, BookOpen, Box, FileText, Scale } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { initials } from "@/lib/utils";
import type { ProjectSummary } from "./project-summary";

/** "Continue where you left off": the most recently updated project, with its model on a 3D stage. */
export function ProjectHero({ summary: p, preview }: { summary: ProjectSummary; preview: React.ReactNode }) {
  const href = `/projects/${p.id}`;
  const subtitle = [p.modelName, p.components ? `${p.components} component${p.components === 1 ? "" : "s"}` : null].filter(Boolean).join(" · ") || p.description || "No components yet";
  return (
    <section aria-labelledby="hero-title" className="animate-rise-in relative mb-7 h-[296px] overflow-hidden rounded-[22px] border border-white/[0.07] bg-[radial-gradient(900px_420px_at_72%_70%,#16213a_0%,#0d131d_55%,#0a0e15_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_30px_70px_-30px_rgba(0,0,0,0.9)] [--rise-delay:80ms]">
      {/* The model: a link, so hovering spins the preview and clicking opens the project. */}
      <Link href={href} aria-label={`Open ${p.name}`} tabIndex={-1} className="absolute inset-y-0 right-0 w-[58%] [mask-image:linear-gradient(90deg,transparent,#000_30%)]">
        <span className="pointer-events-none absolute left-1/2 top-[62%] h-[60%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(77,148,255,0.18),transparent)]" />
        <span className="absolute inset-0">{preview}</span>
      </Link>
      <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-[#090c12]/90 via-[#090c12]/50 via-45% to-transparent to-65%" />

      <div className="relative flex h-full max-w-[520px] flex-col px-8 py-6">
        <p className="eyebrow">Continue where you left off</p>
        <h2 id="hero-title" className="mt-2 truncate bg-linear-to-b from-white to-[#b9c6da] bg-clip-text text-[30px] font-semibold leading-[1.1] tracking-[-0.035em] text-transparent">{p.name}</h2>
        <p className="mt-1 truncate text-[13px] text-[#a6b0c0]">{subtitle}</p>
        <div className="mt-4 flex items-center gap-4">
          {p.readiness.total > 0 && <ProgressRing value={p.readiness.pct} size={64} stroke={5} label={`Documentation readiness ${p.readiness.pct} percent (${p.readiness.done} of ${p.readiness.total} criteria)`} />}
          <div className="grid gap-2">
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#a6b0c0]">
              <span className="inline-flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-[#6b7689]" /><b className="font-semibold text-[#eef2f8]">{p.research}</b> research</span>
              <span className="inline-flex items-center gap-1.5"><Scale className="h-3.5 w-3.5 text-[#6b7689]" /><b className="font-semibold text-[#eef2f8]">{p.decisions}</b> decisions</span>
              <span className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-[#6b7689]" /><b className="font-semibold text-[#eef2f8]">{p.files}</b> files</span>
            </p>
            <AttentionPill count={p.needAttention} components={p.components} long />
          </div>
        </div>
        {p.lastActivity && (
          <p className="mt-auto flex min-w-0 items-center gap-2 text-xs text-[#6b7689]">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#1d2a44] text-[8.5px] font-semibold text-[#9db8ff]">{initials(p.lastActivity.actor)}</span>
            <span className="truncate"><b className="font-medium text-[#a6b0c0]">{p.lastActivity.actor}</b> · {p.lastActivity.summary} · {p.lastActivity.ago}</span>
          </p>
        )}
        <div className={`${p.lastActivity ? "mt-3" : "mt-auto"} flex gap-2`}>
          <Link href={href} className="ease-premium inline-flex h-[34px] items-center gap-2 rounded-[10px] bg-linear-to-b from-[#5b9dff] to-[#3d82f0] px-4 text-[13px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_28px_-10px_rgba(61,139,255,0.8)] transition-transform duration-300 hover:-translate-y-px">Open project <ArrowRight className="h-3.5 w-3.5" /></Link>
          <Link href={`${href}/workspace`} className="ease-premium inline-flex h-[34px] items-center gap-2 rounded-[10px] border border-white/10 bg-linear-to-b from-white/10 to-white/4 px-3.5 text-[12.5px] font-medium text-[#eef2f8] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-[transform,border-color] duration-300 hover:-translate-y-px hover:border-white/20"><Box className="h-3.5 w-3.5" />3D editor</Link>
        </div>
      </div>
    </section>
  );
}

/** Amber "needs attention" pill, or a quiet all-clear. */
export function AttentionPill({ count, components, long = false }: { count: number; components: number; long?: boolean }) {
  if (!components) return <span className="text-[11.5px] text-[#6b7689]">No components yet</span>;
  if (!count) return <span className="inline-flex items-center gap-1.5 text-[11.5px] text-success"><span className="h-1.5 w-1.5 rounded-full bg-current" />All documented</span>;
  return (
    <span className="inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-full border border-[#e8b866]/20 bg-linear-to-r from-[#e8b866]/14 to-[#e8b866]/4 py-0.5 pl-2 pr-2.5 text-[11.5px] text-[#f1d7a6]">
      <span className="relative h-1.5 w-1.5 rounded-full bg-[#e8b866]"><span className="animate-soft-pulse absolute -inset-1 rounded-full border border-[#e8b866]" /></span>
      {long ? `${count} component${count === 1 ? "" : "s"} need${count === 1 ? "s" : ""} attention` : `${count} need${count === 1 ? "s" : ""} attention`}
    </span>
  );
}

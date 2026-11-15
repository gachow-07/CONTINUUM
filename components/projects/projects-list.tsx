"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDownWideNarrow, ChevronRight, Search } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { AttentionPill } from "./project-hero";
import { NewProjectRow } from "./project-dialogs";
import type { ProjectSummary } from "./project-summary";

export type ProjectRow = ProjectSummary & { preview: React.ReactNode };
type Sort = "updated" | "name" | "readiness" | "attention";
const SORTS: { key: Sort; label: string }[] = [{ key: "updated", label: "Recently updated" }, { key: "name", label: "Name" }, { key: "readiness", label: "Readiness" }, { key: "attention", label: "Needs attention" }];
const COLS = "grid-cols-[minmax(0,3fr)_1.5fr_1.15fr_0.9fr_0.55fr_1.2fr_28px]";

/** All projects as a scannable list, with search, sort and an Active/Archived switch. */
export function ProjectsList({ rows, recentId, archived, counts }: { rows: ProjectRow[]; recentId: string | null; archived: boolean; counts: { active: number; archived: number } }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("updated");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? rows.filter((r) => `${r.name} ${r.description} ${r.modelName ?? ""}`.toLowerCase().includes(q)) : [...rows];
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "readiness") list.sort((a, b) => b.readiness.pct - a.readiness.pct);
    if (sort === "attention") list.sort((a, b) => b.needAttention - a.needAttention);
    return list;
  }, [rows, query, sort]);
  const totals = rows.reduce((t, r) => ({ decisions: t.decisions + r.decisions, research: t.research + r.research, need: t.need + r.needAttention }), { decisions: 0, research: 0, need: 0 });

  return (
    <section aria-labelledby="all-projects" className="animate-rise-in [--rise-delay:180ms]">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-3">
        <h2 id="all-projects" className="text-sm font-semibold">All projects</h2>
        {rows.length > 0 && <p className="text-xs text-[#6c7178]">{rows.length} {archived ? "archived" : "active"} · {totals.decisions} decisions · {totals.research} sources{totals.need > 0 && <> · <span className="text-[#fbd99a]">{totals.need} need attention</span></>}</p>}
        <span className="flex-1" />
        <nav aria-label="Project status" className="relative flex rounded-[11px] border border-white/[0.07] bg-white/[0.035] p-[3px]">
          {[{ label: "Active", href: "/projects", on: !archived, n: counts.active }, { label: "Archived", href: "/projects?archived=1", on: archived, n: counts.archived }].map((t) => (
            <Link key={t.label} href={t.href} aria-current={t.on ? "page" : undefined} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-300", t.on ? "bg-linear-to-b from-white/12 to-white/5 text-[#f2f4f5] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" : "text-[#6c7178] hover:text-[#a9adb3]")}>
              {t.label}<span className="rounded-full bg-white/[0.06] px-1.5 text-[11px] tabular-nums text-[#6c7178]">{t.n}</span>
            </Link>
          ))}
        </nav>
        <label className="flex h-[34px] w-[240px] items-center gap-2 rounded-[10px] border border-white/[0.07] bg-black/25 px-2.5 text-[#6c7178] focus-within:border-[#22d3ee]/45 focus-within:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects" aria-label="Search projects" className="min-w-0 flex-1 bg-transparent text-[12.5px] text-[#f2f4f5] outline-none placeholder:text-[#6c7178]" />
        </label>
        <label className="flex h-[34px] items-center gap-1.5 rounded-[10px] border border-white/[0.07] bg-white/[0.02] pl-2.5 pr-1 text-[#6c7178]">
          <ArrowDownWideNarrow className="h-3.5 w-3.5" />
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort projects" className="h-full cursor-pointer bg-transparent pr-1 text-[12.5px] text-[#a9adb3] outline-none">
            {SORTS.map((s) => <option key={s.key} value={s.key} className="bg-[#101113]">{s.label}</option>)}
          </select>
        </label>
      </div>

      <div className="glass overflow-x-auto rounded-[18px]">
        <div className="min-w-[860px]">
          <div className={cn("grid h-[38px] items-center gap-3.5 border-b border-white/[0.07] px-[18px] font-mono text-[10px] uppercase tracking-[0.08em] text-[#6c7178]", COLS)}>
            <span>Project</span><span>Readiness</span><span>Attention</span><span>Decisions</span><span>Team</span><span>Last activity</span><span />
          </div>
          {shown.length === 0 && <p className="px-[18px] py-6 text-[13px] text-[#a9adb3]">{query ? `No projects match “${query}”.` : archived ? "Projects you archive appear here." : "No projects yet."}</p>}
          {shown.map((r) => (
            <Link key={r.id} href={`/projects/${r.id}`} className={cn("group grid min-h-[76px] items-center gap-3.5 border-b border-white/[0.07] px-[18px] py-2.5 transition-colors duration-300 hover:bg-white/[0.03]", COLS, r.id === recentId && "bg-linear-to-r from-[#22d3ee]/7 to-transparent to-60%")}>
              <span className="flex min-w-0 items-center gap-3">
                <span className="relative h-[54px] w-[84px] shrink-0 overflow-hidden rounded-[10px] border border-white/[0.07]">{r.preview}</span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[13.5px] font-semibold">{r.name}</span>
                    {r.id === recentId && <Tag tone="blue">Recent</Tag>}
                    {r.isSample && <Tag tone="amber">Sample</Tag>}
                  </span>
                  <span className="block truncate text-[11.5px] text-[#6c7178]">{r.modelName || r.components ? <>{r.modelName && <span className="font-mono text-[10.5px]">{r.modelName}</span>}{r.modelName && r.components ? " · " : null}{r.components ? `${r.components} components` : null}</> : r.description || "No description yet"}</span>
                </span>
              </span>
              <span className="flex items-center gap-2.5 text-xs tabular-nums text-[#a9adb3]">
                {r.readiness.total ? <><Segments pct={r.readiness.pct} />{r.readiness.pct}%</> : <span className="text-[#6c7178]">—</span>}
              </span>
              <span><AttentionPill count={r.needAttention} components={r.components} /></span>
              <span className="text-xs tabular-nums text-[#a9adb3]">{r.decisions}<span className="block text-[11px] text-[#6c7178]">{r.hasDecisions ? `${r.documentedPct}% documented` : "none yet"}</span></span>
              <span className="flex">{r.members.slice(0, 4).map((m, i) => <span key={m.id} title={m.name} className={cn("grid h-6 w-6 place-items-center rounded-full border-2 border-[#101113] bg-[#1d2a2f] text-[9.5px] font-semibold text-[#8be9f7]", i > 0 && "-ml-1.5")}>{initials(m.name)}</span>)}{r.members.length > 4 && <span className="-ml-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-[#101113] bg-white/10 text-[9.5px] text-[#a9adb3]">+{r.members.length - 4}</span>}</span>
              <span className="min-w-0 text-xs text-[#a9adb3]">
                <span className="block truncate">{r.lastActivity?.summary ?? `Updated ${r.updatedLabel}`}</span>
                <span className="block text-[11px] text-[#6c7178]">{r.lastActivity ? `${r.lastActivity.actor} · ${r.lastActivity.ago}` : " "}</span>
              </span>
              <ChevronRight className="ease-premium h-4 w-4 text-[#6c7178] transition-[transform,color] duration-300 group-hover:translate-x-0.5 group-hover:text-[#f2f4f5]" />
            </Link>
          ))}
          {!archived && <NewProjectRow className="group flex min-h-[60px] w-full items-center gap-3 px-[18px] py-2.5 text-[#6c7178] transition-colors duration-300 hover:bg-white/[0.02] hover:text-[#8be9f7]" />}
        </div>
      </div>
    </section>
  );
}

function Segments({ pct }: { pct: number }) {
  const on = Math.round((pct / 100) * 6);
  return <span className="flex h-[5px] w-[130px] gap-0.5" aria-hidden>{Array.from({ length: 6 }, (_, i) => <span key={i} className={cn("flex-1 rounded-[2px]", i < on ? "bg-linear-to-r from-[#0891b2] to-[#8be9f7] shadow-[0_0_8px_rgba(34,211,238,0.4)]" : "bg-white/[0.08]")} />)}</span>;
}

function Tag({ tone, children }: { tone: "blue" | "amber"; children: React.ReactNode }) {
  return <span className={cn("shrink-0 rounded-md border px-1.5 py-px font-mono text-[9.5px] font-semibold uppercase tracking-[0.06em]", tone === "blue" ? "border-[#22d3ee]/25 bg-[#22d3ee]/12 text-[#8be9f7]" : "border-[#f5b74f]/25 bg-[#f5b74f]/14 text-[#fbd99a]")}>{children}</span>;
}

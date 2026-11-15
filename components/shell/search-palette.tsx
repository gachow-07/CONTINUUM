"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as D from "@radix-ui/react-dialog";
import { Loader2, Search } from "lucide-react";
import { searchRecords, type SearchHit } from "@/app/actions/search";
import { cn } from "@/lib/utils";

export function SearchPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const projectId = pathname.match(/^\/projects\/([0-9a-f-]{36})/)?.[1] ?? null;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [idx, setIdx] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  useEffect(() => {
    const my = ++seq.current;
    if (q.trim().length < 2) return;
    const t = setTimeout(async () => {
      setBusy(true);
      try { const r = await searchRecords(q, projectId); if (my === seq.current) { setHits(r); setIdx(0); } } finally { if (my === seq.current) setBusy(false); }
    }, 180);
    return () => clearTimeout(t);
  }, [q, projectId]);

  const go = (h: SearchHit) => { setOpen(false); router.push(h.href); };
  const shown = q.trim().length < 2 ? [] : hits;

  return (
    <D.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setQ(""); setHits([]); } }}>
      <button type="button" onClick={() => setOpen(true)} className="group flex h-8 w-full max-w-md items-center gap-2 rounded-md border border-border bg-surface/70 px-3 text-[13px] text-muted-foreground transition-[border-color,background-color,box-shadow] duration-200 hover:border-accent/40 hover:bg-surface hover:shadow-[0_0_0_4px_rgb(61_139_255/0.08)]">
        <Search className="h-4 w-4 transition-colors group-hover:text-accent" /><span className="flex-1 text-left">Search project memory…</span><kbd className="rounded border border-border bg-muted/60 px-1.5 text-[10px] transition-colors group-hover:border-border-strong">⌘K</kbd>
      </button>
      <D.Portal>
        <D.Overlay className="overlay-anim fixed inset-0 z-50 bg-[#05080f]/60 backdrop-blur-[3px]" />
        <D.Content className="palette-anim fixed left-1/2 top-[14vh] z-50 w-[calc(100vw-24px)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border-strong bg-surface/95 shadow-[var(--shadow-pop),0_0_60px_-20px_rgb(61_139_255/0.35)] backdrop-blur-xl">
          <D.Title className="sr-only">Search project memory</D.Title><D.Description className="sr-only">Search decisions, research, revisions, reviews and notes</D.Description>
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" placeholder={projectId ? "Search this project…" : "Search all projects…"}
              onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, shown.length - 1)); } else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); } else if (e.key === "Enter" && shown[idx]) go(shown[idx]); }}
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground focus-visible:outline-none" />
            {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <ul className="scroll-thin max-h-[50vh] overflow-y-auto p-1.5" role="listbox">
            {q.trim().length < 2 ? <li className="px-3 py-6 text-center text-[13px] text-muted-foreground">Type at least 2 characters to search decisions, research, revisions, reviews and notes.</li>
              : shown.length === 0 && !busy ? <li className="px-3 py-6 text-center text-[13px] text-muted-foreground">No saved records match “{q}”.</li>
              : shown.map((h, i) => (
                <li key={`${h.kind}${h.id}`} role="option" aria-selected={i === idx} className="animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 25}ms` }}>
                  <button type="button" onClick={() => go(h)} onMouseEnter={() => setIdx(i)} className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors duration-150", i === idx && "bg-accent-soft shadow-[inset_2px_0_0_var(--accent)]")}>
                    <span className="w-[70px] shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{h.kind}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[13px]">{h.title}</span><span className="block truncate text-[11.5px] text-muted-foreground">{h.subtitle}</span></span>
                  </button>
                </li>))}
          </ul>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

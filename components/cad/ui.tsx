"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function IconBtn({ tip, active, onClick, disabled, children, className, tipDir }: { tip: string; active?: boolean; onClick?: () => void; disabled?: boolean; children: React.ReactNode; className?: string; tipDir?: "up" | "right" }) {
  return (
    <button type="button" data-tip={tip} aria-label={tip} aria-pressed={active} disabled={disabled} onClick={onClick}
      className={cn("tip flex h-7 min-w-7 items-center justify-center gap-1 rounded-md px-1.5 text-[var(--c-muted)] transition-colors hover:bg-[var(--c-panel2)] hover:text-[var(--c-text)] disabled:pointer-events-none disabled:opacity-35 [&_svg]:h-4 [&_svg]:w-4",
        tipDir === "up" && "tip-up", tipDir === "right" && "tip-right", active && "bg-[var(--c-accent-soft)] text-[var(--c-accent)] hover:bg-[var(--c-accent-soft)] hover:text-[var(--c-accent)]", className)}>
      {children}
    </button>
  );
}

export function Sep() { return <span className="mx-1 h-4 w-px bg-[var(--c-line2)]" aria-hidden />; }

export function NumField({ label, value, onChange, step = 1, min, suffix, className }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; suffix?: string; className?: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(Number(value.toFixed(3)));
  const commit = (raw: string) => {
    setDraft(null);
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return;
    onChange(min !== undefined ? Math.max(min, n) : n);
  };
  return (
    <label className={cn("flex min-w-0 items-center gap-1.5 rounded-md border border-[var(--c-line)] bg-[var(--c-bg)] px-2 focus-within:border-[var(--c-accent)]", className)}>
      <span className="w-3 shrink-0 text-[10px] font-medium uppercase text-[var(--c-muted)]">{label}</span>
      <input inputMode="decimal" value={shown} aria-label={label}
        onChange={(e) => setDraft(e.target.value)} onFocus={(e) => e.target.select()} onBlur={(e) => draft !== null && commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") { setDraft(null); (e.target as HTMLInputElement).blur(); }
          if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); const n = parseFloat(shown); if (Number.isFinite(n)) { const nv = n + (e.key === "ArrowUp" ? 1 : -1) * step * (e.shiftKey ? 10 : 1); onChange(min !== undefined ? Math.max(min, nv) : nv); setDraft(null); } }
        }}
        className="h-7 w-full min-w-0 bg-transparent text-right text-[12px] tabular-nums outline-none" />
      {suffix && <span className="shrink-0 text-[10px] text-[var(--c-muted)]">{suffix}</span>}
    </label>
  );
}

export function Group({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="border-b border-[var(--c-line)] px-3.5 py-3">
      <div className="mb-2 flex items-center justify-between"><h4 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--c-muted)]">{title}</h4>{action}</div>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

export function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex rounded-md border border-[var(--c-line)] bg-[var(--c-bg)] p-0.5" role="group">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}
          className={cn("h-6 flex-1 rounded px-2 text-[11.5px] font-medium transition-colors", value === o.value ? "bg-[var(--c-accent-soft)] text-[var(--c-accent)]" : "text-[var(--c-muted)] hover:text-[var(--c-text)]")}>{o.label}</button>
      ))}
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-0.5 text-[12px]">
      <span>{label}</span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
        className={cn("relative h-4 w-7 rounded-full transition-colors", checked ? "bg-[var(--c-accent)]" : "bg-[var(--c-line2)]")}>
        <span className={cn("absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all", checked ? "left-3.5" : "left-0.5")} />
      </button>
    </label>
  );
}

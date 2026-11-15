import { useId } from "react";

/** Circular progress with a soft glow; draws itself in on mount (see .animate-ring-draw). */
export function ProgressRing({ value, size = 40, stroke = 4, label, className }: { value: number; size?: number; stroke?: number; label?: string; className?: string }) {
  const id = useId();
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c * (1 - pct / 100);
  return (
    <span className={`relative inline-block shrink-0 ${className ?? ""}`} style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(pct)} percent`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90 overflow-visible" aria-hidden>
        <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0891b2" /><stop offset="1" stopColor="#a5f3fc" /></linearGradient></defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round" className="animate-ring-draw drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]"
          style={{ "--ring-c": c, "--ring-to": offset, strokeDashoffset: offset } as React.CSSProperties} />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-semibold tracking-[-0.03em] tabular-nums text-[#f2f4f5]" style={{ fontSize: Math.max(10, Math.round(size * 0.24)) }}>{Math.round(pct)}%</span>
    </span>
  );
}

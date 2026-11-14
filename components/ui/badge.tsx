import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-muted text-[#475467] border-border",
  accent: "bg-accent-soft text-[#1a4fd6] border-[#d3e0ff]",
  success: "bg-success-soft text-success border-[#cfe9da]",
  warning: "bg-warning-soft text-warning border-[#f3e2b3]",
  danger: "bg-danger-soft text-danger border-[#f6cfca]",
} as const;
export type Tone = keyof typeof tones;

export function Badge({ tone = "neutral", className, children, dot }: { tone?: Tone; className?: string; children: React.ReactNode; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-4", tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

export function SampleBadge() {
  return <Badge tone="warning" className="uppercase tracking-wide">Sample data</Badge>;
}

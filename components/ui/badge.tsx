import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-muted text-muted-foreground border-border",
  accent: "bg-accent-soft text-accent border-transparent",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
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
  return <Badge tone="warning" className="font-mono text-[10px] uppercase tracking-[0.04em]">Sample data</Badge>;
}

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** The primary "Ask AI" button: the project's component colours drifting behind dark text, so the assistant stands out everywhere it appears. */
export function AskAiLink({ href, size = "md", className }: { href: string; size?: "sm" | "md"; className?: string }) {
  return (
    <Link href={href} className={cn("ai-gradient ai-glow ease-premium inline-flex shrink-0 items-center font-semibold transition-transform duration-300 hover:-translate-y-px",
      size === "md" ? "h-10 gap-2 rounded-[10px] px-5 text-[14px]" : "h-8 gap-1.5 rounded-md px-3.5 text-[13px]", className)}>
      <Sparkles className={size === "md" ? "h-[18px] w-[18px]" : "h-3.5 w-3.5"} />Ask AI
    </Link>
  );
}

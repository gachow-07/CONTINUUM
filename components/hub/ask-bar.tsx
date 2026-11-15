"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Send, Sparkles } from "lucide-react";

/** Entry point to the project assistant. Without an AI key it says so instead of pretending to answer. */
export function AskBar({ projectId, componentName, aiEnabled }: { projectId: string; componentName: string; aiEnabled: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form className="ai-ring flex items-center gap-2.5 rounded-xl py-2 pl-3.5 pr-2 shadow-[0_10px_30px_-18px_rgba(139,92,246,0.7)]" onSubmit={(e) => {
      e.preventDefault(); if (!q.trim() || !aiEnabled) return;
      router.push(`/projects/${projectId}/assistant?q=${encodeURIComponent(`About the ${componentName} component: ${q.trim()}`)}`);
    }}>
      <Sparkles className="h-[18px] w-[18px] shrink-0 text-[#a5b4fc]" />
      <input value={q} onChange={(e) => setQ(e.target.value)} disabled={!aiEnabled} aria-label={`Ask about ${componentName}`} placeholder={aiEnabled ? `Ask this component… e.g. “Why did we choose this ${componentName.toLowerCase()} design?”` : "Ask this component… (AI assistant not configured)"}
        className="h-9 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed" />
      {!aiEnabled && <Link href="/setup" className="shrink-0 text-xs text-warning underline">Set up OpenAI key</Link>}
      <button type="submit" disabled={!aiEnabled || !q.trim()} aria-label="Ask" className="ai-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-lg disabled:opacity-40"><Send className="h-4 w-4" /></button>
    </form>
  );
}

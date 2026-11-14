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
    <form className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 shadow-card focus-within:border-accent" onSubmit={(e) => {
      e.preventDefault(); if (!q.trim() || !aiEnabled) return;
      router.push(`/projects/${projectId}/assistant?q=${encodeURIComponent(`About the ${componentName} component: ${q.trim()}`)}`);
    }}>
      <Sparkles className="h-4 w-4 shrink-0 text-accent" />
      <input value={q} onChange={(e) => setQ(e.target.value)} disabled={!aiEnabled} aria-label={`Ask about ${componentName}`} placeholder={aiEnabled ? `Ask this component… e.g. “Why did we choose this ${componentName.toLowerCase()} design?”` : "Ask this component… (AI assistant not configured)"}
        className="h-8 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed" />
      {!aiEnabled && <Link href="/setup" className="shrink-0 text-xs text-warning underline">Set up OpenAI key</Link>}
      <button type="submit" disabled={!aiEnabled || !q.trim()} aria-label="Ask" className="flex h-8 w-8 items-center justify-center rounded-md text-accent hover:bg-accent-soft disabled:opacity-40"><Send className="h-4 w-4" /></button>
    </form>
  );
}

"use client";
import Link from "next/link";
import { useState } from "react";
import { ChevronUp, Send, Sparkles } from "lucide-react";
import { ChatPanel } from "@/components/ai/chat-panel";

/**
 * "Ask this component…": the answer opens right here, under the bar, so the person stays on the component.
 * Without an AI key it says so instead of pretending to answer.
 */
export function AskBar({ projectId, projectName, componentName, aiEnabled }: { projectId: string; projectName: string; componentName: string; aiEnabled: boolean }) {
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState<string | null>(null);

  if (asked) return (
    <div className="ai-ring overflow-hidden rounded-xl shadow-[0_10px_30px_-18px_rgba(59,130,246,0.7)]">
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 text-[12.5px]">
        <span className="flex min-w-0 items-center gap-2"><Sparkles className="h-4 w-4 shrink-0 text-[#7dd3fc]" /><span className="ai-text truncate font-semibold">Asking about {componentName}</span></span>
        <button type="button" onClick={() => { setAsked(null); setQ(""); }} className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"><ChevronUp className="h-3.5 w-3.5" />Close</button>
      </div>
      <ChatPanel projectId={projectId} projectName={projectName} aiEnabled={aiEnabled} initialMessages={[]} initialConversationId={null}
        initialQuestion={asked} height="h-[460px] rounded-none border-x-0 border-b-0 shadow-none" />
    </div>
  );

  return (
    <form className="ai-ring flex items-center gap-2.5 rounded-xl py-2 pl-3.5 pr-2 shadow-[0_10px_30px_-18px_rgba(59,130,246,0.7)]" onSubmit={(e) => {
      e.preventDefault(); if (!q.trim() || !aiEnabled) return;
      setAsked(`About the ${componentName} component: ${q.trim().slice(0, 450)}`);
    }}>
      <Sparkles className="h-[18px] w-[18px] shrink-0 text-[#7dd3fc]" />
      <input value={q} onChange={(e) => setQ(e.target.value)} disabled={!aiEnabled} aria-label={`Ask about ${componentName}`} placeholder={aiEnabled ? `Ask this component… e.g. “Why did we choose this ${componentName.toLowerCase()} design?”` : "Ask this component… (AI assistant not configured)"}
        className="h-9 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed" />
      {!aiEnabled && <Link href="/setup" className="shrink-0 text-xs text-warning underline">Set up OpenAI key</Link>}
      <button type="submit" disabled={!aiEnabled || !q.trim()} aria-label="Ask" className="ai-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-lg disabled:opacity-40"><Send className="h-4 w-4" /></button>
    </form>
  );
}

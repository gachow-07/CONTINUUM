"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowUp, FileSearch, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SetupNotice } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import type { AnswerSegment, ChatMessage, Citation } from "@/lib/types";

const DEFAULT_SUGGESTIONS = [
  "Why did we choose this suspension geometry?",
  "What alternatives did we consider?",
  "What problems did the original design have?",
  "Which research sources support this decision?",
  "What changed between revision A and revision B?",
  "What are the biggest unresolved engineering problems?",
  "What should the next engineer work on?",
];

function AssistantMessage({ m, onNavigate }: { m: ChatMessage; onNavigate?: () => void }) {
  const cites = m.citations ?? [];
  const num = (id: string) => cites.findIndex((c) => c.id === id) + 1;
  const segs: AnswerSegment[] = m.segments?.length ? m.segments : [{ kind: "fact", text: m.content, citations: [] }];
  const hasInterp = segs.some((s) => s.kind === "interpretation");
  return (
    <div className="space-y-2.5">
      {segs.map((s, i) => s.kind === "gap" ? (
        <div key={i} className="flex gap-2.5 rounded-lg border border-warning/30 bg-warning-soft p-3 text-[13px] text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide">Not documented</p>{s.text}{s.citations.map((c) => <CiteNum key={c} n={num(c)} cite={cites.find((x) => x.id === c)} onNavigate={onNavigate} />)}</div>
        </div>
      ) : (
        <p key={i} className={cn("text-[13px] leading-relaxed", s.kind === "interpretation" && "border-l-2 border-border-strong pl-3 italic text-muted-foreground")}>
          {s.kind === "interpretation" && <span className="mr-1.5 rounded bg-muted px-1 py-0.5 text-[10px] font-semibold not-italic uppercase tracking-wide">Interpretation</span>}
          {s.text}{s.citations.map((c) => <CiteNum key={c} n={num(c)} cite={cites.find((x) => x.id === c)} onNavigate={onNavigate} />)}
        </p>
      ))}
      {cites.length > 0 && (
        <div className="border-t border-border pt-2.5">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sources</p>
          <ul className="space-y-1">{cites.map((c, i) => (
            <li key={c.id}><Link href={c.href} onClick={onNavigate} className="group flex items-start gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-muted">
              <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded bg-accent-soft text-[10px] font-semibold text-accent">{i + 1}</span>
              <span className="min-w-0"><span className="font-medium text-foreground group-hover:text-accent">{c.title}</span><span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">{c.type}</span></span>
            </Link></li>))}
          </ul>
        </div>)}
      {hasInterp && <p className="text-[11px] text-muted-foreground">Plain statements come directly from project records; “Interpretation” is the assistant&apos;s inference from them.</p>}
    </div>
  );
}

function CiteNum({ n, cite, onNavigate }: { n: number; cite?: Citation; onNavigate?: () => void }) {
  if (!cite || n < 1) return null;
  return <Link href={cite.href} onClick={onNavigate} title={cite.title} className="ml-0.5 inline-flex h-4 min-w-4 -translate-y-px items-center justify-center rounded bg-accent-soft px-1 align-baseline text-[10px] font-semibold text-accent no-underline hover:bg-accent hover:text-[#031317]">{n}</Link>;
}

export function ChatPanel({ projectId, projectName, aiEnabled, initialMessages, initialConversationId, suggestions = DEFAULT_SUGGESTIONS, compact, height, initialQuestion }: {
  projectId: string; projectName: string; aiEnabled: boolean; initialMessages: ChatMessage[]; initialConversationId: string | null; suggestions?: string[]; compact?: boolean; height?: string; initialQuestion?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [conv, setConv] = useState<string | null>(initialConversationId);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; setup?: boolean } | null>(null);
  const [followups, setFollowups] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const asked = useRef(false);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, busy]);

  // A question handed over from another screen (for example "Ask this component…") is sent once.
  useEffect(() => { if (initialQuestion && aiEnabled && !asked.current && messages.length === 0) { asked.current = true; void send(initialQuestion); } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setError(null); setFollowups([]); setInput("");
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: "user", content: q, segments: null, citations: [], created_at: new Date().toISOString() }]);
    setBusy(true);
    try {
      const res = await fetch("/api/ai/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId, conversationId: conv, message: q }) });
      const j = await res.json();
      if (!res.ok) { setError({ text: j.error ?? "The assistant couldn't answer.", setup: j.code === "not_configured" }); return; }
      setConv(j.conversationId);
      setMessages((m) => [...m, j.message]);
      setFollowups(j.followups ?? []);
    } catch { setError({ text: "Couldn't reach the assistant. Check your connection and try again." }); } finally { setBusy(false); }
  }

  return (
    <div className={cn("flex flex-col rounded-xl border border-border bg-surface shadow-card", height ?? (compact ? "h-[560px]" : "h-[calc(100vh-15rem)] min-h-[520px]"))}>
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-[13px]"><Sparkles className="h-4 w-4 shrink-0 text-accent" /><span className="shrink-0 whitespace-nowrap font-semibold">Ask this project</span><span className="truncate rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground" title={projectName}>{projectName}</span></div>
        {messages.length > 0 && <Button variant="ghost" size="sm" className="shrink-0" onClick={() => { setMessages([]); setConv(null); setFollowups([]); setError(null); }}><Plus className="h-3.5 w-3.5" />New chat</Button>}
      </div>
      <div className="scroll-thin flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="mx-auto max-w-xl pt-4 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><FileSearch className="h-5 w-5" /></div>
            <h3 className="text-sm font-semibold">Ask anything about {projectName}</h3>
            <p className="mt-1 text-[13px] text-muted-foreground">Answers come only from what&apos;s documented in this project — research, decisions, revisions, reviews and notes — with sources. If something isn&apos;t documented, it will say so.</p>
            {!aiEnabled && <div className="mt-4 text-left"><SetupNotice title="AI assistant not configured">Add <code className="rounded bg-white/60 px-1">OPENAI_API_KEY</code> to your environment and restart to enable answers.</SetupNotice></div>}
            <div className="mt-5 flex flex-wrap justify-center gap-2">{suggestions.map((s) => <button key={s} onClick={() => send(s)} disabled={!aiEnabled} className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-foreground transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent disabled:opacity-50">{s}</button>)}</div>
          </div>
        )}
        {messages.map((m) => m.role === "user" ? (
          <div key={m.id} className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-[13px] text-white">{m.content}</div></div>
        ) : (
          <div key={m.id} className="flex gap-3"><div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><Sparkles className="h-3.5 w-3.5" /></div><div className="min-w-0 flex-1"><AssistantMessage m={m} /></div></div>
        ))}
        {busy && <div className="flex gap-3"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent"><Sparkles className="h-3.5 w-3.5 animate-pulse" /></div><div className="flex items-center gap-1 pt-2"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" /><span className="ml-2 text-xs text-muted-foreground">Searching the project record…</span></div></div>}
        {error && (error.setup ? <SetupNotice title="AI assistant not configured">{error.text}</SetupNotice> : <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">{error.text}</p>)}
        {followups.length > 0 && !busy && <div className="flex flex-wrap gap-2 pl-10">{followups.map((f) => <button key={f} onClick={() => send(f)} className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:border-accent hover:text-accent">{f}</button>)}</div>}
        <div ref={endRef} />
      </div>
      {messages.length > 0 && !busy && messages.length < 3 && <div className="flex flex-wrap gap-1.5 px-4 pb-2">{suggestions.slice(0, 3).map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-accent hover:text-accent">{s}</button>)}</div>}
      <form className="flex items-end gap-2 border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} disabled={!aiEnabled} aria-label="Ask a question about this project"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder={aiEnabled ? "Ask about decisions, research, reviews…" : "AI isn't configured"} className="max-h-32 min-h-9 flex-1 resize-none rounded-md border border-border-strong bg-surface px-3 py-2 text-[13px] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:bg-muted" />
        <Button type="submit" variant="accent" size="icon" className="h-9 w-9" disabled={!input.trim() || busy || !aiEnabled} aria-label="Send"><ArrowUp className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}

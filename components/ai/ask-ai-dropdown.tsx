"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Sparkles, X } from "lucide-react";
import { ChatPanel } from "@/components/ai/chat-panel";
import { cn } from "@/lib/utils";

type ProjectOption = { id: string; name: string };

/** Starter questions that fit the page the person is on, so the dropdown feels like part of that tab. */
function suggestionsFor(pathname: string): string[] | undefined {
  if (pathname.includes("/research")) return ["What research supports our main design choices?", "Which sources are not linked to a decision yet?", "Summarize the research on the suspension"];
  if (pathname.includes("/decisions")) return ["Which decisions are missing reasoning?", "What alternatives did we reject, and why?", "Why did we change the suspension design?"];
  if (pathname.includes("/reviews")) return ["What review comments are still open?", "What did the last review change?", "Which decisions still need a review?"];
  if (pathname.includes("/history")) return ["What changed in the latest revision, and why?", "Which revisions are unexplained?", "How has the design evolved?"];
  if (pathname.includes("/handoff")) return ["What should I work on next?", "What failed and what did we learn?", "Which decisions are missing documentation?"];
  if (pathname.includes("/components/") || pathname.includes("/subsystems/")) return ["What is still undocumented for this component?", "Why was this component designed this way?", "What should I work on next?"];
  return undefined;
}

/**
 * Ask AI as a dropdown: the assistant opens in place under the button, so answers appear on the page you are on
 * instead of sending you to the assistant section. Outside a project it shows a project picker first.
 */
export function AskAiDropdown({ project, projects, aiEnabled, size = "md" }: { project?: ProjectOption; projects?: ProjectOption[]; aiEnabled: boolean; size?: "sm" | "md" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false); // keep the chat once opened, so closing doesn't lose the conversation
  const [picked, setPicked] = useState(project?.id ?? projects?.[0]?.id ?? "");
  const root = useRef<HTMLDivElement>(null);
  const current = project ?? projects?.find((p) => p.id === picked);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: PointerEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown); };
  }, [open]);

  return (
    <div ref={root} className="relative shrink-0">
      <button type="button" aria-expanded={open} aria-haspopup="dialog" onClick={() => { setOpen((o) => !o); setMounted(true); }}
        className={cn("ai-gradient ai-glow ease-premium inline-flex items-center font-semibold transition-transform duration-300 hover:-translate-y-px",
          size === "md" ? "h-10 gap-2 rounded-[10px] pl-5 pr-3.5 text-[14px]" : "h-8 gap-1.5 rounded-md pl-3.5 pr-2.5 text-[13px]")}>
        <Sparkles className={size === "md" ? "h-[18px] w-[18px]" : "h-3.5 w-3.5"} />Ask AI
        <ChevronDown className={cn("ease-premium transition-transform duration-300", size === "md" ? "h-4 w-4" : "h-3.5 w-3.5", open && "rotate-180")} />
      </button>
      {mounted && (
        <div role="dialog" aria-label="Ask AI" hidden={!open}
          className="animate-fade-in absolute right-0 top-full z-40 mt-2 w-[min(440px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border-strong bg-background shadow-[var(--shadow-pop)]">
          <div className="ai-gradient h-1" />
          {projects && !project && (
            <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5 text-[12.5px]">
              <span className="text-muted-foreground">Project</span>
              {projects.length > 0 ? (
                <select aria-label="Project to ask about" value={picked} onChange={(e) => setPicked(e.target.value)}
                  className="h-8 min-w-0 flex-1 rounded-md border border-border-strong bg-surface px-2 text-[13px] text-foreground">
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              ) : <span className="text-muted-foreground">No projects yet</span>}
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
          )}
          {current ? (
            <ChatPanel key={current.id} projectId={current.id} projectName={current.name} aiEnabled={aiEnabled} initialMessages={[]} initialConversationId={null}
              suggestions={suggestionsFor(pathname)} height="h-[min(520px,65vh)] rounded-none border-0 shadow-none" />
          ) : (
            <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">Create a project first. The assistant answers from a project&apos;s documented history.</p>
          )}
          {current && (
            <Link href={`/projects/${current.id}/assistant`} onClick={() => setOpen(false)} className="flex items-center justify-end gap-1 border-t border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground">
              Open full assistant <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

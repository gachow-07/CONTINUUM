import { notFound } from "next/navigation";
import { ChatPanel } from "@/components/ai/chat-panel";
import { loadBundle } from "@/lib/bundle";
import { loadLatestConversation } from "@/lib/conversation";
import { anthropicConfigured } from "@/lib/env";
import { DocTabs } from "@/components/hub/doc-tabs";
import { requireSession } from "@/lib/session";

export const metadata = { title: "AI Assistant" };

export default async function ProjectAssistant({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string }> }) {
  const { id } = await params;
  const { q } = await searchParams;
  const { supabase, user } = await requireSession();
  const b = await loadBundle(supabase, id);
  if (!b) notFound();
  const conv = await loadLatestConversation(supabase, id, user.id);
  return (
    <div>
    <DocTabs projectId={id} />
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <ChatPanel projectId={id} projectName={b.project.name} aiEnabled={anthropicConfigured()} initialMessages={conv.messages} initialConversationId={conv.conversationId} initialQuestion={q?.slice(0, 500)} />
      <aside className="space-y-3 text-[13px]">
        <div className="rounded-lg border border-border bg-surface p-4 shadow-card">
          <h3 className="text-sm font-semibold">What the assistant can read</h3>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>{b.research.length} research sources</li><li>{b.decisions.length} design decisions</li><li>{b.revisions.length} revisions</li><li>{b.files.length} files <span className="text-[11px]">(descriptions + extracted text)</span></li>
            <li>{b.reviews.length} reviews · {b.comments.length} comments</li><li>{b.notes.length} lessons, issues &amp; next steps</li><li>{b.docs.length} saved documents</li>
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4 text-xs leading-relaxed text-muted-foreground shadow-card">
          The assistant only uses documented project information. It can&apos;t interpret CAD geometry, images or simulation output, and it will say when something isn&apos;t recorded.
        </div>
      </aside>
    </div>
    </div>
  );
}

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ChatPanel } from "@/components/ai/chat-panel";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { LoadSampleButton, CreateProjectButton } from "@/components/projects/project-dialogs";
import { loadLatestConversation } from "@/lib/conversation";
import { openaiConfigured } from "@/lib/env";
import { requireSession } from "@/lib/session";
import type { Project } from "@/lib/types";

export const metadata = { title: "AI Assistant" };

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const { project } = await searchParams;
  const { supabase, user } = await requireSession();
  const { data } = await supabase.from("projects").select("*").eq("archived", false).order("updated_at", { ascending: false });
  const projects = (data ?? []) as Project[];
  if (projects.length === 0) {
    return <div><PageHeader title="AI Assistant" /><EmptyState icon={Sparkles} title="Create a project first" description="The assistant answers from a project's documented history, so it needs a project to read." action={<div className="flex flex-wrap justify-center gap-2"><CreateProjectButton /><LoadSampleButton /></div>} /></div>;
  }
  const current = projects.find((p) => p.id === project) ?? projects[0];
  const conv = await loadLatestConversation(supabase, current.id, user.id);
  return (
    <div className="animate-fade-in">
      <PageHeader title="AI Assistant" description="Ask questions about a project. Answers are grounded in its research, decisions, revisions and reviews." />
      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Project context">
        {projects.map((p) => <Link key={p.id} role="tab" aria-selected={p.id === current.id} href={`/assistant?project=${p.id}`} className={`rounded-md border px-3 py-1.5 text-[13px] font-medium ${p.id === current.id ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-foreground hover:bg-muted"}`}>{p.name}</Link>)}
      </div>
      <ChatPanel key={current.id} projectId={current.id} projectName={current.name} aiEnabled={openaiConfigured()} initialMessages={conv.messages} initialConversationId={conv.conversationId} />
    </div>
  );
}

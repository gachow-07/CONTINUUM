import { notFound } from "next/navigation";
import { Workspace } from "@/components/cad/workspace";
import type { Knowledge } from "@/components/cad/panels";
import { loadBundle } from "@/lib/bundle";
import { loadModel } from "@/lib/cad/load";
import { loadLatestConversation } from "@/lib/conversation";
import { openaiConfigured } from "@/lib/env";
import { requireSession } from "@/lib/session";

export const metadata = { title: "3D Workspace" };

export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase, user } = await requireSession();
  const b = await loadBundle(supabase, id);
  if (!b) notFound();
  const [parts, conv] = await Promise.all([loadModel(supabase, id), loadLatestConversation(supabase, id, user.id)]);

  const knowledge: Knowledge = {
    projectId: id,
    subsystems: b.subsystems.map((s) => ({ id: s.id, name: s.name, marker: s.marker_position })),
    research: b.research.map((r) => ({ id: r.id, title: r.title, subsystemId: r.subsystem_id })),
    decisions: b.decisions.map((d) => ({ id: d.id, title: d.title, subsystemId: d.subsystem_id, status: d.status, documented: Boolean(d.reasoning.trim()) || b.evidence.some((e) => e.decision_id === d.id) })),
    revisions: b.revisions.map((r) => ({ id: r.id, label: r.rev_label, title: r.title, subsystemId: r.subsystem_id })),
    reviews: b.reviews.map((r) => ({ id: r.id, title: r.title, status: r.status, subsystemId: r.subsystem_id })),
    files: b.files.map((f) => ({ id: f.id, name: f.name, subsystemId: f.subsystem_id })),
    openIssues: b.notes.filter((n) => n.kind === "issue" && n.status === "open").length,
    docs: b.docs.length,
  };

  return (
    <Workspace
      project={{ id, name: b.project.name, description: b.project.description, isSample: b.project.is_sample }}
      initialParts={parts.length || !b.project.is_sample ? parts : null}
      knowledge={knowledge}
      aiEnabled={openaiConfigured()}
      chat={{ messages: conv.messages, conversationId: conv.conversationId }}
    />
  );
}

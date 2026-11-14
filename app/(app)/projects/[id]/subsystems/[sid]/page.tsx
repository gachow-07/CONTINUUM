import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { DecisionsView } from "@/components/views/decisions-view";
import { FilesView } from "@/components/views/files-view";
import { HistoryView } from "@/components/views/history-view";
import { ResearchView } from "@/components/views/research-view";
import { SubsystemActions } from "@/components/views/subsystems-view";
import { loadBundle } from "@/lib/bundle";
import { openaiConfigured } from "@/lib/env";
import { requireSession } from "@/lib/session";
import { scopeFromBundle } from "@/lib/scope";

export default async function SubsystemPage({ params }: { params: Promise<{ id: string; sid: string }> }) {
  const { id, sid } = await params;
  const { supabase } = await requireSession();
  const b = await loadBundle(supabase, id);
  const sub = b?.subsystems.find((s) => s.id === sid);
  if (!b || !sub) notFound();
  const scope = scopeFromBundle(b);
  const ai = openaiConfigured();
  return (
    <div className="space-y-8">
      <div>
        <Link href={`/projects/${id}/subsystems`} className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ChevronLeft className="h-3.5 w-3.5" />All subsystems</Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-semibold tracking-tight">{sub.name}</h2><p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">{sub.description || "No description yet."}</p></div>
          <div className="flex gap-2"><SubsystemActions subsystem={sub} redirectTo={`/projects/${id}/subsystems`} /></div>
        </div>
      </div>
      <Card><CardHeader title="Research" description={`Sources attached to ${sub.name}`} /><div className="p-5"><ResearchView scope={scope} projectId={id} subsystemId={sid} aiEnabled={ai} /></div></Card>
      <Card><CardHeader title="Design decisions" /><div className="p-5"><DecisionsView scope={scope} projectId={id} subsystemId={sid} aiEnabled={ai} /></div></Card>
      <Card><CardHeader title="Revision history" /><div className="p-5"><HistoryView scope={scope} projectId={id} subsystemId={sid} /></div></Card>
      <Card><CardHeader title="Files" /><div className="p-5"><FilesView scope={scope} projectId={id} subsystemId={sid} /></div></Card>
    </div>
  );
}

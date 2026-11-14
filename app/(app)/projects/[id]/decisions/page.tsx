import { notFound } from "next/navigation";
import { DecisionsView } from "@/components/views/decisions-view";
import { loadBundle } from "@/lib/bundle";
import { openaiConfigured } from "@/lib/env";
import { requireSession } from "@/lib/session";
import { scopeFromBundle } from "@/lib/scope";

export const metadata = { title: "Design Decisions" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireSession();
  const b = await loadBundle(supabase, id);
  if (!b) notFound();
  return <DecisionsView scope={scopeFromBundle(b)} projectId={id} aiEnabled={openaiConfigured()} />;
}

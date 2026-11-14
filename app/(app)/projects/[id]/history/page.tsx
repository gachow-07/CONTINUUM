import { notFound } from "next/navigation";
import { HistoryView } from "@/components/views/history-view";
import { loadBundle } from "@/lib/bundle";
import { requireSession } from "@/lib/session";
import { scopeFromBundle } from "@/lib/scope";

export const metadata = { title: "Design History" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireSession();
  const b = await loadBundle(supabase, id);
  if (!b) notFound();
  return <HistoryView scope={scopeFromBundle(b)} projectId={id} />;
}

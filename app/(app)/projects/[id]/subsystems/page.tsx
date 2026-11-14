import { notFound } from "next/navigation";
import { SubsystemsView } from "@/components/views/subsystems-view";
import { loadBundle } from "@/lib/bundle";
import { requireSession } from "@/lib/session";
import { scopeFromBundle } from "@/lib/scope";

export const metadata = { title: "Subsystems" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireSession();
  const b = await loadBundle(supabase, id);
  if (!b) notFound();
  return <SubsystemsView scope={scopeFromBundle(b)} projectId={id} />;
}

import { notFound } from "next/navigation";
import { DocsView } from "@/components/views/docs-view";
import { loadBundle } from "@/lib/bundle";
import { anthropicConfigured } from "@/lib/env";
import { DocTabs } from "@/components/hub/doc-tabs";
import { requireSession } from "@/lib/session";
import { scopeFromBundle } from "@/lib/scope";

export const metadata = { title: "Documentation" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireSession();
  const b = await loadBundle(supabase, id);
  if (!b) notFound();
  return <><DocTabs projectId={id} /><DocsView scope={scopeFromBundle(b)} projectId={id} aiEnabled={anthropicConfigured()} /></>;
}

import { notFound } from "next/navigation";
import { FilesView } from "@/components/views/files-view";
import { loadBundle } from "@/lib/bundle";
import { requireSession } from "@/lib/session";
import { scopeFromBundle } from "@/lib/scope";

export const metadata = { title: "Files" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireSession();
  const b = await loadBundle(supabase, id);
  if (!b) notFound();
  return <FilesView scope={scopeFromBundle(b)} projectId={id} />;
}

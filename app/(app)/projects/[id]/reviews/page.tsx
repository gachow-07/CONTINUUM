import { notFound } from "next/navigation";
import { ReviewsView } from "@/components/views/reviews-view";
import { loadBundle } from "@/lib/bundle";
import { requireSession } from "@/lib/session";
import { scopeFromBundle } from "@/lib/scope";

export const metadata = { title: "Reviews" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireSession();
  const b = await loadBundle(supabase, id);
  if (!b) notFound();
  return <ReviewsView scope={scopeFromBundle(b)} projectId={id} />;
}

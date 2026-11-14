import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { getBundle } from "@/lib/bundle-cache";
import { loadModel } from "@/lib/cad/load";
import { modelPartEntries } from "@/lib/cad/part-markers";
import { subsystemOf } from "@/lib/cad/ops";
import { requireSession } from "@/lib/session";

export default async function PartPage({ params }: { params: Promise<{ id: string; partId: string }> }) {
  const { id, partId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id) || !/^[0-9a-f-]{36}$/.test(partId)) notFound();
  const { supabase } = await requireSession();
  const project = await getBundle(id);
  if (!project) notFound();
  const parts = await loadModel(supabase, id);
  const entry = modelPartEntries(parts).find((item) => item.part.id === partId);
  if (!entry) notFound();
  const subsystemId = subsystemOf(parts, partId);
  const component = project.subsystems.find((s) => s.id === subsystemId);
  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <div><Link href={`/projects/${id}`} className="text-sm text-accent hover:underline">← Back to project hub</Link><h2 className="mt-4 text-2xl font-semibold">{entry.part.name}</h2><p className="mt-1 text-sm text-muted-foreground">{entry.name}</p></div>
      <Card><CardHeader title="Part information" /><div className="space-y-3 p-5 text-sm"><p><strong>Model shape:</strong> {entry.part.kind}</p><p><strong>Model dimensions:</strong> {Object.entries(entry.part.params).map(([key, value]) => `${key.toUpperCase()}: ${value} mm`).join(" · ") || "Not recorded"}</p>{component ? <p>Related component: <Link className="text-accent hover:underline" href={`/projects/${id}/components/${component.id}`}>{component.name}</Link></p> : <p className="text-muted-foreground">No related component recorded.</p>}<p className="text-muted-foreground">Descriptions, decisions and sources are recorded at the component level.</p></div></Card>
    </div>
  );
}

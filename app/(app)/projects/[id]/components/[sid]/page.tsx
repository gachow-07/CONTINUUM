import { notFound } from "next/navigation";
import { ComponentView } from "@/components/hub/component-view";
import { getBundle } from "@/lib/bundle-cache";
import { openaiConfigured } from "@/lib/env";

export default async function ComponentWorkspace({ params, searchParams }: { params: Promise<{ id: string; sid: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id, sid } = await params;
  const tab = (await searchParams).tab ?? "summary";
  const b = await getBundle(id);
  if (!b || !b.subsystems.some((s) => s.id === sid)) notFound();
  return <ComponentView b={b} sid={sid} tab={tab} ai={openaiConfigured()} />;
}

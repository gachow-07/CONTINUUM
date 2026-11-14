import { PageHeader } from "@/components/ui/misc";
import { ResearchView } from "@/components/views/research-view";
import { loadAll } from "@/lib/bundle";
import { openaiConfigured } from "@/lib/env";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Research Library" };
export default async function Page() {
  const { supabase } = await requireSession();
  const scope = await loadAll(supabase);
  return <div className="animate-fade-in"><PageHeader title="Research Library" description="Every source your teams have saved — with where it came from, why it matters, and which decisions it influenced." /><ResearchView scope={scope} aiEnabled={openaiConfigured()} /></div>;
}

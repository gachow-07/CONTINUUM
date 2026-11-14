import { PageHeader } from "@/components/ui/misc";
import { DecisionsView } from "@/components/views/decisions-view";
import { loadAll } from "@/lib/bundle";
import { openaiConfigured } from "@/lib/env";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Design Decisions" };
export default async function Page() {
  const { supabase } = await requireSession();
  const scope = await loadAll(supabase);
  return <div className="animate-fade-in"><PageHeader title="Design Decisions" description="What was decided, what was rejected, and the evidence behind it." /><DecisionsView scope={scope} aiEnabled={openaiConfigured()} /></div>;
}

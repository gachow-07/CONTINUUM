import { PageHeader } from "@/components/ui/misc";
import { ReviewsView } from "@/components/views/reviews-view";
import { loadAll } from "@/lib/bundle";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Reviews" };
export default async function Page() {
  const { supabase } = await requireSession();
  const scope = await loadAll(supabase);
  return <div className="animate-fade-in"><PageHeader title="Reviews" description="Peer review of decisions and revisions, with feedback that stays on the record." /><ReviewsView scope={scope} /></div>;
}

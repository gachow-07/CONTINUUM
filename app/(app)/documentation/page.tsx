import { EmptyState, PageHeader } from "@/components/ui/misc";
import { CreateProjectButton, LoadSampleButton } from "@/components/projects/project-dialogs";
import { DocsView } from "@/components/views/docs-view";
import { loadAll } from "@/lib/bundle";
import { anthropicConfigured } from "@/lib/env";
import { requireSession } from "@/lib/session";
import { FileText } from "lucide-react";

export const metadata = { title: "Documentation" };
export default async function Page() {
  const { supabase } = await requireSession();
  const scope = await loadAll(supabase);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Documentation" description="Turn accumulated project knowledge into summaries, reports, handoffs and portfolio write-ups." />
      {scope.projects.length === 0 ? <EmptyState icon={<FileText className="h-5 w-5" />} title="No projects to document" description="Create a project or load the sample to generate documentation." action={<div className="flex flex-wrap justify-center gap-2"><CreateProjectButton /><LoadSampleButton /></div>} /> : <DocsView scope={scope} aiEnabled={anthropicConfigured()} />}
    </div>
  );
}

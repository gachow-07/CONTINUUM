import { Plus } from "lucide-react";
import { CreateProjectButton } from "@/components/projects/project-dialogs";

/** Entry point to the existing project creation flow. */
export function NewProjectCard({ preview = false }: { preview?: boolean }) {
  return (
    <div className="flex min-h-52 flex-col items-start rounded-lg border border-border bg-surface p-5 shadow-card">
      <Plus className="h-5 w-5 text-accent" aria-hidden />
      <h3 className="mt-5 text-[15px] font-semibold">Start a new project</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Bring your team’s work together in one place.</p>
      <div className="mt-5">{preview ? <span className="text-xs text-muted-foreground">Available when the app is connected.</span> : <CreateProjectButton label="Create project" size="sm" variant="outline" />}</div>
    </div>
  );
}

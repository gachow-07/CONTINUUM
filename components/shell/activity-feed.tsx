import Link from "next/link";
import { BookOpen, ClipboardCheck, FileText, FileUp, FolderKanban, GitCommitHorizontal, Layers, Scale, StickyNote } from "lucide-react";
import { refHref } from "@/lib/links";
import { timeAgo } from "@/lib/utils";
import type { Activity } from "@/lib/types";

const ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  research: BookOpen, file: FileUp, decision: Scale, review: ClipboardCheck, document: FileText, revision: GitCommitHorizontal, project: FolderKanban, subsystem: Layers, note: StickyNote,
};

export function ActivityFeed({ items, projectNames }: { items: Activity[]; projectNames?: Map<string, string> }) {
  if (!items.length) return <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">No activity yet. Add research, upload a revision or record a decision and it will show up here.</p>;
  return (
    <ul className="stagger divide-y divide-border">
      {items.map((a) => {
        const Icon = ICON[a.kind] ?? FolderKanban;
        const href = a.ref_type && a.ref_id ? refHref(a.project_id, a.ref_type, a.ref_id) : `/projects/${a.project_id}`;
        return (
          <li key={a.id}>
            <Link href={href} className="group flex items-start gap-3 px-5 py-3 transition-colors duration-200 hover:bg-muted/60">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-[background-color,color,transform] duration-300 ease-[var(--ease-spring)] group-hover:scale-110 group-hover:bg-accent-soft group-hover:text-accent"><Icon className="h-3.5 w-3.5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-snug"><span className="font-medium">{a.actor_name}</span> <span className="text-foreground">{a.summary.charAt(0).toLowerCase() + a.summary.slice(1)}</span></p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{projectNames?.get(a.project_id) && <>{projectNames.get(a.project_id)} · </>}{timeAgo(a.created_at)}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

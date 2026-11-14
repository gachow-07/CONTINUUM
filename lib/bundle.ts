import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Activity, Decision, Evidence, FileRow, GeneratedDoc, Member, Project, ProjectNote, Research, Review, ReviewComment, Revision, Subsystem,
} from "./types";

export interface ProjectBundle {
  project: Project;
  members: Member[];
  subsystems: Subsystem[];
  research: Research[];
  revisions: Revision[];
  files: FileRow[];
  decisions: Decision[];
  evidence: Evidence[];
  notes: ProjectNote[];
  reviews: Review[];
  comments: ReviewComment[];
  activity: Activity[];
  docs: GeneratedDoc[];
}

/** Loads everything known about a project. Runs under the caller's RLS, so it only returns what they may see. */
export async function loadBundle(supabase: SupabaseClient, projectId: string): Promise<ProjectBundle | null> {
  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle();
  if (!project) return null;
  const q = <T,>(table: string, order = "created_at", asc = false, limit?: number) => {
    let query = supabase.from(table).select("*").eq("project_id", projectId).order(order, { ascending: asc });
    if (limit) query = query.limit(limit);
    return query.then((r) => (r.data ?? []) as T[]);
  };
  const [members, subsystems, research, revisions, files, decisions, evidence, notes, reviews, comments, activity, docs] = await Promise.all([
    q<Member>("project_members", "created_at", true),
    q<Subsystem>("subsystems", "position", true),
    q<Research>("research_sources"),
    q<Revision>("design_revisions", "occurred_on"),
    q<FileRow>("files"),
    q<Decision>("design_decisions", "decided_on"),
    q<Evidence>("decision_evidence", "created_at", true),
    q<ProjectNote>("project_notes"),
    q<Review>("reviews"),
    q<ReviewComment>("review_comments", "created_at", true),
    q<Activity>("project_activity", "created_at", false, 60),
    q<GeneratedDoc>("generated_documents", "updated_at"),
  ]);
  return { project: project as Project, members, subsystems, research, revisions, files, decisions, evidence, notes, reviews, comments, activity, docs };
}

/** Same as loadBundle but merged across every project the user can access (for the global pages). */
export async function loadAll(supabase: SupabaseClient, includeArchived = false) {
  let pq = supabase.from("projects").select("*").order("updated_at", { ascending: false });
  if (!includeArchived) pq = pq.eq("archived", false);
  const { data: projects } = await pq;
  const ids = ((projects ?? []) as Project[]).map((p) => p.id);
  if (ids.length === 0) {
    return { projects: [] as Project[], subsystems: [] as Subsystem[], research: [] as Research[], revisions: [] as Revision[], files: [] as FileRow[],
      decisions: [] as Decision[], evidence: [] as Evidence[], notes: [] as ProjectNote[], reviews: [] as Review[], comments: [] as ReviewComment[],
      activity: [] as Activity[], docs: [] as GeneratedDoc[], members: [] as Member[] };
  }
  const q = <T,>(table: string, order = "created_at", limit?: number) => {
    let query = supabase.from(table).select("*").in("project_id", ids).order(order, { ascending: false });
    if (limit) query = query.limit(limit);
    return query.then((r) => (r.data ?? []) as T[]);
  };
  const [subsystems, research, revisions, files, decisions, evidence, notes, reviews, comments, activity, docs, members] = await Promise.all([
    q<Subsystem>("subsystems", "position"), q<Research>("research_sources"), q<Revision>("design_revisions", "occurred_on"), q<FileRow>("files"),
    q<Decision>("design_decisions", "decided_on"), q<Evidence>("decision_evidence"), q<ProjectNote>("project_notes"), q<Review>("reviews"),
    q<ReviewComment>("review_comments"), q<Activity>("project_activity", "created_at", 40), q<GeneratedDoc>("generated_documents", "updated_at"),
    q<Member>("project_members"),
  ]);
  return { projects: projects as Project[], subsystems, research, revisions, files, decisions, evidence, notes, reviews, comments, activity, docs, members };
}

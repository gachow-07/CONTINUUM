"use server";
import { ctx } from "./helpers";

export interface SearchHit { id: string; kind: string; title: string; subtitle: string; href: string }

const esc = (q: string) => q.replace(/[%_,()]/g, " ").trim();

/** Searches the saved records the user can access (row-level security applies). Optionally limited to one project. */
export async function searchRecords(query: string, projectId: string | null): Promise<SearchHit[]> {
  const q = esc(query);
  if (q.length < 2) return [];
  const c = await ctx();
  const like = `%${q}%`;
  const scope = <T extends { eq: (c: string, v: string) => T }>(b: T) => (projectId ? b.eq("project_id", projectId) : b);
  const [projects, subs, decisions, research, revisions, notes, reviews] = await Promise.all([
    projectId ? Promise.resolve({ data: [] as { id: string; name: string }[] }) : c.supabase.from("projects").select("id,name").ilike("name", like).limit(4),
    scope(c.supabase.from("subsystems").select("id,name,project_id").ilike("name", like).limit(4)),
    scope(c.supabase.from("design_decisions").select("id,title,project_id,selected_solution").or(`title.ilike.${like},problem.ilike.${like},selected_solution.ilike.${like},reasoning.ilike.${like}`).limit(5)),
    scope(c.supabase.from("research_sources").select("id,title,project_id,site_name").or(`title.ilike.${like},description.ilike.${like},why_important.ilike.${like}`).limit(5)),
    scope(c.supabase.from("design_revisions").select("id,title,rev_label,project_id").or(`title.ilike.${like},description.ilike.${like},reason.ilike.${like}`).limit(5)),
    scope(c.supabase.from("project_notes").select("id,title,kind,project_id").or(`title.ilike.${like},body.ilike.${like}`).limit(4)),
    scope(c.supabase.from("reviews").select("id,title,project_id,status").ilike("title", like).limit(4)),
  ]);
  const hits: SearchHit[] = [];
  for (const p of projects.data ?? []) hits.push({ id: p.id, kind: "Project", title: p.name, subtitle: "Project", href: `/projects/${p.id}` });
  for (const s of (subs.data ?? []) as { id: string; name: string; project_id: string }[]) hits.push({ id: s.id, kind: "Component", title: s.name, subtitle: "Component", href: `/projects/${s.project_id}/components/${s.id}` });
  for (const d of (decisions.data ?? []) as { id: string; title: string; project_id: string; selected_solution: string }[]) hits.push({ id: d.id, kind: "Decision", title: d.title, subtitle: d.selected_solution.slice(0, 80), href: `/projects/${d.project_id}/decisions?open=${d.id}` });
  for (const r of (research.data ?? []) as { id: string; title: string; project_id: string; site_name: string | null }[]) hits.push({ id: r.id, kind: "Research", title: r.title, subtitle: r.site_name ?? "Research", href: `/projects/${r.project_id}/research?open=${r.id}` });
  for (const r of (revisions.data ?? []) as { id: string; title: string; rev_label: string; project_id: string }[]) hits.push({ id: r.id, kind: "Revision", title: `${r.rev_label} — ${r.title}`, subtitle: "Design history", href: `/projects/${r.project_id}/history?open=${r.id}` });
  for (const n of (notes.data ?? []) as { id: string; title: string; kind: string; project_id: string }[]) hits.push({ id: n.id, kind: "Note", title: n.title, subtitle: n.kind.replace("_", " "), href: `/projects/${n.project_id}/handoff#notes` });
  for (const r of (reviews.data ?? []) as { id: string; title: string; project_id: string; status: string }[]) hits.push({ id: r.id, kind: "Review", title: r.title, subtitle: r.status.replace("_", " "), href: `/projects/${r.project_id}/reviews?open=${r.id}` });
  return hits;
}

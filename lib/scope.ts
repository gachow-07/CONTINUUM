import type { ProjectBundle } from "./bundle";
import type { loadAll } from "./bundle";

/** The data shape every view component consumes — either one project or all of the user's projects. */
export type Scope = Awaited<ReturnType<typeof loadAll>>;

export const scopeFromBundle = (b: ProjectBundle): Scope => ({
  projects: [b.project], subsystems: b.subsystems, components: b.components, research: b.research, revisions: b.revisions, files: b.files, decisions: b.decisions,
  evidence: b.evidence, notes: b.notes, reviews: b.reviews, comments: b.comments, activity: b.activity, docs: b.docs, members: b.members,
});

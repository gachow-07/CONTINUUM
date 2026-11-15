export type ProjectStatus = "planning" | "active" | "on_hold" | "completed";
export type MemberRole = "owner" | "editor" | "viewer";

export interface Profile { id: string; email: string | null; full_name: string | null; role_title: string | null; org_id: string | null }
export interface Project {
  id: string; org_id: string | null; owner_id: string; name: string; description: string; category: string;
  status: ProjectStatus; cover_path: string | null; archived: boolean; is_sample: boolean; created_at: string; updated_at: string;
  viewer_model_file_id: string | null;
}
export interface Member { id: string; project_id: string; user_id: string | null; display_name: string; email: string | null; role: MemberRole; is_sample: boolean }
export interface Subsystem { id: string; project_id: string; name: string; description: string; position: number; marker_position: [number, number, number] | null; is_sample: boolean; created_at: string; updated_at: string }

export interface ProjectComponent { id: string; project_id: string; subsystem_id: string; name: string; created_at: string }

export type ResearchType = "url" | "pdf" | "paper" | "article" | "image" | "note";
export interface Research {
  id: string; project_id: string; subsystem_id: string | null; type: ResearchType; title: string; url: string | null;
  site_name: string | null; description: string; content_text: string | null; file_path: string | null; tags: string[];
  why_important: string; ai_summary: string | null; is_sample: boolean; created_by: string | null; created_at: string;
}

export type RevisionKind = "initial" | "research" | "design_change" | "simulation" | "feedback" | "final";
export interface Revision {
  id: string; project_id: string; subsystem_id: string | null; rev_label: string; title: string; kind: RevisionKind;
  description: string; reason: string; author_name: string; author_id: string | null; occurred_on: string; is_sample: boolean; created_at: string;
}

export type FileCategory = "cad" | "cad_screenshot" | "calculation" | "fea" | "cfd" | "document" | "image" | "other";
export interface FileRow {
  id: string; project_id: string; subsystem_id: string | null; revision_id: string | null; name: string; storage_path: string;
  mime: string | null; size: number; category: FileCategory; description: string; extracted_text: string | null;
  is_sample: boolean; uploaded_by: string | null; created_at: string;
}

export type DecisionStatus = "proposed" | "accepted" | "rejected" | "superseded";
export interface Alternative { name: string; reason_rejected: string }
export interface Decision {
  id: string; project_id: string; subsystem_id: string | null; title: string; problem: string; selected_solution: string;
  alternatives: Alternative[]; reasoning: string; status: DecisionStatus; author_name: string; author_id: string | null;
  decided_on: string; ai_summary: string | null; is_sample: boolean; created_at: string; updated_at: string;
}
export interface Evidence {
  id: string; project_id: string; decision_id: string; kind: "research" | "revision" | "file" | "simulation";
  research_id: string | null; revision_id: string | null; file_id: string | null; note: string; created_at: string;
}

export type NoteKind = "background" | "lesson" | "issue" | "next_step";
export interface ProjectNote {
  id: string; project_id: string; subsystem_id: string | null; kind: NoteKind; title: string; body: string;
  status: "open" | "resolved"; author_name: string; is_sample: boolean; created_at: string;
}

export type ReviewStatus = "pending" | "in_review" | "changes_requested" | "approved" | "resolved";
export interface Review {
  id: string; project_id: string; subsystem_id: string | null; decision_id: string | null; revision_id: string | null; file_id: string | null;
  component_id?: string | null; model_part_id?: string | null; glb_link_id?: string | null; component_name?: string | null;
  title: string; description: string; status: ReviewStatus; reviewer_member_id: string | null; reviewer_name: string | null;
  requested_by: string | null; requester_name: string; is_sample: boolean; created_at: string; updated_at: string;
}
export interface ReviewComment {
  id: string; project_id: string; review_id: string; parent_id: string | null; kind: "comment" | "question" | "response";
  body: string; author_id: string | null; author_name: string; file_id: string | null; decision_id: string | null;
  influenced_revision_id: string | null; resolved: boolean; resolved_by: string | null; resolved_at: string | null;
  is_sample: boolean; created_at: string;
}

export interface Activity {
  id: string; project_id: string; actor_name: string; kind: string; summary: string; ref_type: string | null; ref_id: string | null; created_at: string;
}

export type DocType = "one_pager" | "design_report" | "handoff" | "internship" | "portfolio" | "review_deck";
export interface DocSection { key: string; title: string; content: string; status: "confirmed" | "partial" | "missing"; sources: string[] }
export interface GeneratedDoc {
  id: string; project_id: string; doc_type: DocType; title: string; sections: DocSection[]; params: Record<string, unknown>;
  author_name: string | null; created_at: string; updated_at: string;
}

export interface Citation { id: string; type: string; title: string; href: string; excerpt?: string }
export interface AnswerSegment { text: string; kind: "fact" | "interpretation" | "gap"; citations: string[] }
export interface ChatMessage {
  id: string; role: "user" | "assistant"; content: string; segments: AnswerSegment[] | null; citations: Citation[]; created_at: string;
}

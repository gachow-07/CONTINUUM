# CONTINUUM / Project Memory — Backend requirements and teammate handoff

Working draft · 14 November 2026

## Purpose and scope
Build a usable engineering knowledge workspace that links project components to decisions, research, revisions, reviews and files, and makes project handoffs easy. This brief is a starting point for the backend teammate, not a finalized specification. Product and company naming remain open.

Repository: https://github.com/gachow-07/CONTINUUM  
Reviewed default-branch commit: 2e957515f4f73785094e7f38c5f6b2e5cd622d94  
Figma concepts: https://www.figma.com/design/Ti5JKelG61EeFJHxsX17jr  
Handoff concept: https://www.figma.com/design/Ti5JKelG61EeFJHxsX17jr?node-id=11-14

## What exists and confidence level
The repo contains a Next.js/TypeScript application, Supabase SQL migrations, auth/session handling, project and knowledge server actions, RLS policies, private file storage, AI routes, a primitive-based 3D model editor, and a project handoff page. The handoff page already derives information from project records; the Figma screen and outgoing-team editor described below are proposed changes, not evidence they are implemented.

The repository's hackathon plan reports that the UI was exercised with sample data and schema tested on local Postgres with stand-ins, but auth, storage and RLS had not been run against real Supabase, and AI had not been called against OpenAI when that plan was written. This may be outdated; verify current deployment and test history with the team. The Figma screens use example data and are static mockups.

Current stack: Next.js App Router / React / TypeScript; Supabase Auth, Postgres and Storage; OpenAI for optional AI; Vercel as documented deployment target. Do not assume a new backend or rewrite is required.

## P0 — Make the existing foundation work end to end

### Setup and baseline
- Provision a development Supabase project. Apply migrations 0001_schema.sql, 0002_model.sql and 0003_markers.sql in order on a fresh project; configure local environment from .env.example. Do not edit a migration already applied to a shared database; add a new migration.
- Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. OPENAI_API_KEY is server-only and optional for non-AI flows. Share secrets through an agreed secure channel, never Git.
- Install dependencies, run the app, type-check, lint and build. Record the environment and failures. Confirm deployment and current test status with the team.
- Acceptance: a fresh user can sign up, sign in, create a project, add a component, reload and see persisted data; sign out and back in successfully. Test both email-confirmation behavior and redirect configuration appropriate to the actual environment.

### Authentication and permissions
- Use Supabase Auth and the existing cookie-backed session clients; validate user identity server-side. Preserve the session across browser and server requests.
- Project members have owner, editor or viewer roles. Confirm permitted actions with product owner, then enforce them in RLS and storage policies—not only in the UI. Existing policies allow all members to participate in some collaboration tables; do not assume viewer means no writes anywhere.
- Verify project and object isolation with two real accounts, including direct API/storage access and role changes. Test revoked access. Validate cross-project foreign-key references, membership changes, and storage path authorization.
- Acceptance: user B cannot read or mutate user A's private project or files without membership; each role can perform its agreed actions and receives appropriate failures otherwise.

### Projects and application home
- Provide a user-scoped list of projects and recent activity for application home, distinct from each project’s hub. Support create, update and archive as currently scoped. Return empty, loading and failure states to the UI.
- Project hub needs project metadata, members, components, recent activity and access-controlled project records. Existing loadBundle/loadAll are starting points; check query failures, ordering, and scale.
- Acceptance: each user sees only accessible projects; opening one loads its correct hub and data after refresh.

## P0 — Project knowledge and handoff

### Core records and links
- Support project-scoped components (called subsystems in the schema), research sources, design decisions, alternatives, evidence, revisions, files, notes, reviews and comments. Connect them to the appropriate project and component; store creator, timestamps and status where available.
- Decisions should expose the problem, selected approach, reasoning, alternatives, status and links to evidence. Reviews need an assignee, status and comment/resolution history. Research needs a source type, title, description and why it matters. Validate input and enforce project consistency.
- Existing actions in app/actions/knowledge.ts cover much of this; audit and test rather than duplicate. Ensure failed multi-step writes do not leave misleading partial state.
- Acceptance: an editor can create a decision linked to a component and research source, reload it, and another authorized member can follow the links. An unauthorized user cannot access it.

### Dedicated handoff section
- Provide a project-scoped handoff view for an incoming engineer: project overview, key decisions and supporting evidence, team/contacts, open issues and review comments, documented next steps, and component documentation readiness. Links should lead back to source records. Information must reflect access rights and be explicit when missing.
- Reuse existing project notes (background, lessons, issues, next steps), reviews, decisions, member records and readiness calculations where they meet the need. The existing app/(app)/projects/[id]/handoff/page.tsx and lib/readiness.ts are starting points.
- Proposed outgoing-team editor: allow authorized teammates to record a handoff overview, priorities, contacts and advice, with author and update time. Decide with the team whether existing notes are sufficient or a dedicated handoff record is needed. Decide draft/publish, version/snapshot, ownership and historical handoff requirements before committing a schema.
- Export: provide a readable handoff document using authorized project content; existing document generation/PDF export are starting points. Decide whether exports are live views or immutable snapshots and how they are shared. Avoid inventing missing context.
- Acceptance: with sample or real data, an incoming project member can open handoff, find a key decision and evidence, an unresolved item and a next step, navigate to each source, and see clear empty/missing states. A nonmember cannot read the handoff or exported private material. Documentation readiness is not engineering approval.

## P1 — Files, 3D and component context
- Store uploads in the private project-files bucket under project-scoped paths; allow reads/writes according to the agreed role policy. Validate uploads and manage metadata and object deletion consistently. Existing signed URL route issues URLs for 300 seconds; test expiry and unauthorized requests.
- Persist component associations, model parts, transforms and manually positioned component markers. Existing model_parts, marker migration and replace_model RPC are starting points. Verify concurrent edits and permissions.
- Component page should be able to request the relevant model parts or asset and show an isolated component with a route back to the assembly. The current model uses boxes, cylinders and spheres; realistic model assets/import, format, licensing and storage are not yet decided. A Figma placeholder is not a working 3D viewer.
- Acceptance: save a model and marker, reload and see the same association and position; a permitted member can access the associated component while a nonmember cannot access model data or files.

## P1 — Search and AI
- Search accessible project records by text and return navigable, permission-filtered results. Decide which record types and query behavior matter first.
- AI is optional: chat should use only accessible project content, provide source links, distinguish documented facts from interpretation and gaps, and handle unavailable AI configuration clearly. Test off-topic queries and records with missing reasoning. Do not imply the AI interprets CAD geometry or simulation results.
- Existing corpus/retrieval, chat, summarize, decision-assist and document-generation routes are starting points. Keep API keys on the server. Decide retention, cost limits, privacy and acceptable source content before production use.
- Acceptance: a member can ask a question and navigate valid citations; a question unsupported by records receives a clear gap; a nonmember cannot use the assistant to retrieve another project's records.

## P1 — Team workflow and usability
- Existing code adds registered users by email and named non-account teammates; there is no email invite flow documented. Decide whether real invitations, notifications and ownership transfer are required for the first release.
- Return clear actionable errors for validation, permission, missing data, storage and external-service failures. Keep audit/activity entries aligned with successful changes; don't expose secrets or raw sensitive errors.
- Test empty projects, missing models, missing AI configuration, failed uploads, expired sessions and offline/network failures.

## Suggested order of work
1. Establish the dev environment; run current code and record what works.
2. Verify auth, membership, RLS and storage with two accounts; fix blockers.
3. Prove create-project → component → research/decision → review → handoff flow with persistence.
4. Agree on handoff data model and export behavior, then implement the dedicated workflow.
5. Connect redesigned UI to existing services; add model/component view and AI after the foundation is reliable.
6. Deploy a test environment and repeat the end-to-end flow with another teammate.

## Open product decisions
- Who is the first audience and what is the minimum demo/release scope?
- What can a viewer contribute to reviews and handoffs? Who can export, publish or change membership?
- Are handoffs living views, versioned snapshots, or both? Who owns them and when are they published?
- What must an outgoing engineer explicitly provide versus what is derived from project records?
- What 3D formats and model sizes are required, and is CAD import in scope?
- What are the AI privacy, retention, budget and usage requirements?
- How should invitations, notifications, account recovery and organization ownership work?

## Code map
- Auth/session: proxy.ts, lib/session.ts, lib/supabase/, components/shell/auth-form.tsx
- Data model/security: supabase/migrations/0001_schema.sql, 0002_model.sql, 0003_markers.sql
- Project and knowledge writes: app/actions/projects.ts, knowledge.ts, model.ts, helpers.ts
- Loading/readiness: lib/bundle.ts, lib/readiness.ts
- Current handoff: app/(app)/projects/[id]/handoff/page.tsx
- 3D: lib/cad/, components/cad/, app/actions/model.ts
- AI: lib/ai/, app/api/ai/; storage: app/api/storage/route.ts
- Setup/status: README.md, docs/HACKATHON_PLAN.md, .env.example

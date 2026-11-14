# Project Memory

An AI-powered engineering workspace that preserves the knowledge behind engineering projects — not just *what* was built, but **why**.

Research, design revisions, decisions, peer reviews and documentation live in one project workspace and stay connected to each other. An assistant answers questions strictly from what the team documented, cites its sources, and says so when something was never written down. When an engineer graduates or changes teams, the next one opens the **handoff dashboard** instead of starting from scratch.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Radix primitives, Lucide icons (shadcn-style components in `components/ui`) |
| Backend | Supabase — PostgreSQL, Auth, Storage, **row-level security** on every table and on the storage bucket |
| AI | OpenAI Chat Completions with strict JSON-schema outputs; retrieval over the project's own records (see below) |
| Deploy | Vercel |

## Setup

1. **Supabase**
   - Create a project at [supabase.com](https://supabase.com).
   - In the SQL editor, run [`supabase/migrations/0001_schema.sql`](supabase/migrations/0001_schema.sql) then [`0002_model.sql`](supabase/migrations/0002_model.sql) and [`0003_markers.sql`](supabase/migrations/0003_markers.sql). The first creates the tables, RLS policies, triggers, and the private `project-files` storage bucket with membership-based policies; the second adds the 3D model table and an atomic `replace_model` save function; the third adds the manually placed component markers.
   - Run [`0004_ai_rate_limits.sql`](supabase/migrations/0004_ai_rate_limits.sql) before enabling paid AI. It caps paid requests at 4 per user per minute, 20 per user per day, and 60 total per day across the deployment.
   - For quick demos, disable *Authentication → Providers → Email → Confirm email* (otherwise new users must click an email link first).
2. **Environment** — copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe in the browser — RLS protects the data) and `OPENAI_API_KEY` (server-side only; never prefixed `NEXT_PUBLIC_`). `OPENAI_MODEL` is optional (default `gpt-4o`; it must support structured outputs).
3. **Run**
   ```bash
   npm install
   npm run dev
   ```
4. Open `http://localhost:3000`: with no account (or no backend configured) it opens the **3D demo workspace** at `/demo`. Then sign up and click **Load sample project (RC Car Design)** on the dashboard.

If Supabase isn't configured the app redirects to a `/setup` page that says exactly what's missing. If only OpenAI is missing, everything else works and each AI feature shows a clear "not configured" message — nothing is faked.

**Deploying to Vercel:** import the repo, set the same three environment variables, deploy. No other configuration is needed.

**AI cost and prompt safety:** keep OpenAI project auto-recharge disabled (or configure a billing limit you are comfortable with) as the account-level backstop. The app also requires authentication and project access, enforces shared database request limits before contacting OpenAI, limits output tokens, redacts common credential formats from prompts, and treats project records and user text as untrusted data. The model is never given the repository, server environment, or API key. Do not store secrets inside project records.

The current team deployment, verified behavior, remaining checks, and secret-safe collaboration instructions are recorded in [`docs/DEPLOYMENT_STATUS.md`](docs/DEPLOYMENT_STATUS.md).

## Project hub (the main screen)

Opening a project lands on its hub: persistent left navigation (Home, Research, Decisions, Reviews, Documentation), search (`Ctrl/⌘+K`, real queries over saved records), and three tabs.

- **Overview:** the current assembly in a 3D viewer (orbit, pan, fit, isolate, markers on/off, plus a list that mirrors the markers for keyboard and screen-reader use), a *living design summary* built only from saved decisions, *documentation readiness* per component, and *needs attention* derived from incomplete documentation, open review comments and open issues.
- **Components:** each component with its readiness, review state and record counts. Opening one shows its workspace (Summary, Research, Decisions, Revisions, Reviews), the readiness checklist, open issues and next step, and an *Ask this component* entry point to the AI assistant (disabled with a setup message when no OpenAI key is configured; no canned answers).
- **Design History:** chronological revisions with what changed, why, author, date, files and linked decisions.

**Documentation readiness** is a six-item checklist computed in `lib/readiness.ts` from saved records only: design described (≥20 characters), choices explained (a decision records reasoning), alternatives recorded, sources attached (research tagged to the component or linked as decision evidence), latest revision explained (what *and* why), review completed (approved or resolved, no open comments). Uploading a file never satisfies a criterion. Readiness measures whether reasoning is written down; it is **not** engineering approval, which is tracked separately in Reviews.

**Component markers** are positions a person chose (select a part in the 3D editor, then *Place component marker*); they are stored per component in model space, follow the model as the camera moves, hide when the model is in front of them, and open a card with progress, the latest documented decision, review status and *Open component*. Nothing is detected automatically and there is no arbitrary CAD import. The sample project uses a placeholder assembly built from simple shapes; to use a real model you would replace the primitives with a prepared GLB loader and keep the same marker data.

## 3D workspace (editor)

The *3D editor* (`/projects/[id]/workspace`, linked from the hub) is a CAD-style workspace with the model as the centrepiece: a large viewport (about 65-70% of the width, more when panels are collapsed), a collapsible parts hierarchy on the left, an inspector on the right (Properties / Knowledge / Ask AI) and a status bar. The knowledge features (research, decisions, revisions, reviews, files, the AI assistant, documentation, handoff) are reachable from the inspector and the *Project* menu without losing the model. `/demo` is a public, data-free version of the same screen.

- **Rendering:** three.js through React Three Fiber. PBR materials, image-based + directional lighting, shadows, orbit / pan / zoom, view cube, Front / Side / Top / Iso views, fit and reset, solid / solid-with-edges / wireframe, click selection that stays in sync with the hierarchy and inspector.
- **What the model is (and isn't):** an assembly of parametric **primitives** (box, cylinder, sphere) in groups, with transform, material and visibility. three.js is a *rendering* library, not a CAD kernel, so there are **no** booleans, fillets, sketches, STEP/IGES import or exact solid properties. The operations offered are the ones primitives support: edit dimensions, position, rotation, material and visibility, move/rotate gizmos, add, duplicate, delete, undo/redo, and JSON import/export. Volumes are analytic per primitive and summed (overlaps are double-counted). Precise solid modelling would need a B-rep engine such as OpenCascade.
- **Persistence:** *Save* writes the whole assembly atomically (`replace_model`, RLS-protected). A project with no saved model shows the built-in sample assembly, clearly labelled, until you save.
- **Shortcuts:** V/G/R tools, 1-4 views, F fit, H hide, Del delete, Ctrl+Z / Ctrl+Shift+Z, Ctrl+D duplicate, Ctrl+S save.

## The demo (RC Car Design)

The sample project is created *in your own account* with your credentials (so RLS applies to it like any other project). Every row is flagged `is_sample`, shown with a "Sample data" badge, and the images are labelled illustrations — **none of it is verified engineering data**.

1. **Research** — project → *Research*: sources organised by subsystem, tags, and *why each matters*.
2. **Design history** — *Design History*: the timeline; open **Rev A** and **Rev B**, or use *Compare revisions*.
3. **Decision** — *Design Decisions* → "Switch from single-arm to … double-wishbone": problem, rejected alternatives, reasoning, linked research, revisions and a simulation note (which honestly says *no simulation was run*).
4. **Peer review** — *Reviews* → Rev B review: Marcus's clearance question, Priya's answer, the resolved comment, and the revision (Rev B.1) it led to. One comment is intentionally still open.
5. **AI documentation** — *Documentation* → generate a one-page summary → edit / regenerate a section → save → **Export PDF**.
6. **Knowledge transfer** — *Handoff*: ask **"Why did we change the suspension design?"** then **"What should I work on next?"**. The drivetrain gearing decision is deliberately undocumented: ask why it was chosen and the assistant answers *"I couldn't find a documented explanation for this decision in the project history."*

## How the AI stays honest

- **Retrieval (RAG over the project record).** Every decision, research source, revision, file description/extracted text, review thread, lesson/issue/next-step and saved document is turned into a citable chunk (`lib/ai/corpus.ts`). Questions are matched with BM25 plus intent rules — e.g. "next / unresolved" pulls in all open issues, open review comments and undocumented decisions (`lib/ai/retrieve.ts`). Project sizes are small enough that lexical retrieval is accurate and needs no vector store; swapping in pgvector later only means replacing `retrieve()`.
- **Grounded prompts with enforced structure.** The model must return segments labelled `fact`, `interpretation` or `gap`, each with source IDs. The server drops citations that weren't in the retrieved set, downgrades uncited "facts" to "interpretation", and renders gaps in a distinct "Not documented" style.
- **Deterministic guards.** If nothing in the project matches a question the model isn't called at all. If an answer relies on a decision with no recorded reasoning or evidence, the exact required sentence is guaranteed to appear.
- **Documents** are generated per section with a `confirmed / partial / missing` status; missing information is stated as "Not documented: …" rather than filled in.
- **Decision assistant** reorganises only what the engineer wrote, lists missing information as questions, and *suggests* related records for the engineer to confirm.
- **No CAD/simulation understanding is claimed.** Images, CAD and FEA/CFD files are stored and shown, but only their descriptions (and extracted text for PDFs/text files) are used by the AI.

## Project layout

```
app/
  (app)/…            authenticated pages (dashboard, projects/[id]/…, research, decisions, reviews, assistant, documentation, team, settings)
  actions/           server actions — all writes (validated with zod, logged to project_activity)
  api/ai/…           chat (RAG), decision-assist, generate-doc, summarize
  api/research/metadata   URL metadata fetch (SSRF-guarded)
  api/storage        signed-URL redirect — only succeeds if storage RLS lets the user read the object
components/          cad/ (3D workspace), ui/ primitives, shell/, projects/, views/ (one per feature), ai/chat-panel
lib/                 supabase clients, data loading, ai/ (corpus, retrieval, prompts, OpenAI), sample/ (demo seed), pdf-export
supabase/migrations  schema + RLS + storage policies
proxy.ts             session refresh + auth gate (Next 16 "proxy", formerly middleware)
```

## Data model

`organizations`, `profiles`, `projects`, `project_members`, `subsystems`, `research_sources`, `files`, `design_revisions`, `design_decisions`, `decision_evidence` (links decisions to research / revisions / files / simulation notes), `reviews`, `review_comments`, `ai_conversations`, `ai_messages`, `generated_documents`, `project_activity`, plus `project_notes` (lessons learned, unresolved issues, next steps and background — the raw material of the handoff).

Every record carries a `project_id`; policies key off `project_members` (`owner` / `editor` / `viewer`). Storage objects live under `<project_id>/…` so file access follows project membership.

## Known limitations

- Registered users can be added to a project by email; people without an account can be added **by name** only (they can't sign in). There is no email invitation flow yet.
- Scanned (image-only) PDFs yield no text; there is no OCR.
- PDF export is a clean text document (headings, bullets, status labels, sources) — not a styled layout.
- Retrieval is lexical (BM25); very paraphrased questions may need rewording.
- Presentation output is a slide *outline* in text form, not a `.pptx`.
- There is no local-storage demo mode: data lives in Supabase. `/demo` is a public copy of the 3D editor with the placeholder assembly; it is editable but nothing is saved.
- The 3D model is primitive-based (see above). There is no import of CAD files such as STEP or STL and no simulation.

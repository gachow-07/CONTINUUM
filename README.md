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
   - In the SQL editor, run [`supabase/migrations/0001_schema.sql`](supabase/migrations/0001_schema.sql). It creates the tables, RLS policies, triggers, and the private `project-files` storage bucket with membership-based policies.
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
4. Sign up, then click **Load sample project (RC Car Design)** on the dashboard.

If Supabase isn't configured the app redirects to a `/setup` page that says exactly what's missing. If only OpenAI is missing, everything else works and each AI feature shows a clear "not configured" message — nothing is faked.

**Deploying to Vercel:** import the repo, set the same three environment variables, deploy. No other configuration is needed.

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
components/          ui/ primitives, shell/, projects/, views/ (one per feature), ai/chat-panel
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

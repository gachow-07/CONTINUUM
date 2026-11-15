# Project Memory: 3-person hackathon plan

Goal for the demo: **a new engineer opens the RC Car Design project, sees the 3D assembly, picks a component, reads why it was designed that way, sees what is missing, and asks the project a question.**

## Where the code stands (be honest about this)

| Area | State |
|---|---|
| UI, hub, component workspace, 3D viewer, markers, readiness logic, 3D editor | Built. Rendered and clicked through in a browser using sample data. |
| Database schema, RLS, atomic model save | Written. Tested on a local Postgres with stand-ins for Supabase auth and storage. **Never run on a real Supabase project.** |
| Sign up / sign in, creating projects, uploads, PDF text extraction, search | Written. **Never run against real Supabase.** |
| AI: assistant, decision help, document generation | Written. **Never called against Anthropic Claude.** Retrieval logic is tested on sample data. |
| PDF export, JSON import/export, Vercel deploy | Written or configured. **Untested.** |

So the first hour is about finding out what breaks, together. Then you split.

## Hour 0 to 1: everyone, one laptop on a call (Setup Sprint)

1. One person creates the Supabase project and the Anthropic API key. Share them in a password manager, never in git.
2. Run the three files in `supabase/migrations/` in order in the Supabase SQL editor. Turn off "Confirm email".
3. Create `.env.local` from `.env.example`. Run `npm install && npm run dev`.
4. Smoke test as a group, writing down every failure in the issue list (GitHub Issues, label `smoke`):
   - Sign up, sign in, sign out
   - Dashboard, **Load sample project**, hub renders with markers
   - Open a component, resolve a review comment, reload: readiness updated
   - Upload a file; upload a PDF in Research (text extracted?)
   - Ask the assistant "Why did we change the suspension design?"
   - Generate a one-page summary, export the PDF
   - 3D editor: change a dimension, Save, reload, still there
5. Triage the issues into the three tracks below. Nothing else starts before this is done.

## The three tracks

Each track owns specific folders. Stay inside yours and merge conflicts mostly disappear.

### Person A: Platform & data (backend, auth, deploy)
**Owns:** `supabase/`, `app/actions/`, `lib/supabase/`, `proxy.ts`, `app/login`, `app/signup`, `app/setup`, `lib/session.ts`, `lib/bundle*.ts`, `lib/sample/seed.ts`

| # | Task | Done when |
|---|---|---|
| A1 | Fix whatever the smoke test finds in auth, RLS, storage, server actions | Full sign-up to sample-project flow works on real Supabase |
| A2 | Deploy to Vercel with the three env vars | A public URL works for a second person who signs up fresh |
| A3 | RLS check with two real accounts | User B cannot read or write User A's project, files or model |
| A4 | Team features: invite flow messaging, role changes | Adding an existing user by email works; errors are readable |
| A5 | Make a fresh project useful: starter subsystems, an obvious "add your first decision" path | A new non-sample project is not a dead end |
| A6 | Seed script is idempotent and re-runnable | Re-seeding does not duplicate or crash |
| A7 (stretch) | Local demo mode (localStorage) for when the backend is down | Hub works with no env vars; clearly labelled |

### Person B: 3D & hub (front-end experience)
**Owns:** `components/cad/`, `components/hub/`, `lib/cad/`, `app/(workspace)/`, `app/demo/`, `app/(app)/projects/[id]/page.tsx`, `components/shell/`, `app/globals.css`

| # | Task | Done when |
|---|---|---|
| B1 | Fix 3D, marker and layout issues from the smoke test | No console errors on hub, component page or editor |
| B2 | Replace the primitive car with a real prepared GLB (licensed or self-made) | Model loads, is fitted, markers still sit correctly. Keep the primitives as the fallback |
| B3 | Marker polish: overlapping markers, label collision, mobile/tablet layout | Two markers close together stay usable |
| B4 | Place-marker flow works end to end on real data | Place, reload, marker is on the hub |
| B5 | Responsive pass at 1280, 1024 and tablet widths; keyboard and focus pass | Navigation never disappears; markers reachable by keyboard |
| B6 | Loading, empty and error states look finished | Kill the network, nothing shows a blank box |
| B7 (stretch) | Selecting a part in the hub highlights its component's records | Click a part, see its component card |

### Person C: AI, knowledge features & the demo story
**Owns:** `lib/ai/`, `app/api/ai/`, `lib/readiness.ts`, `components/views/`, `components/ai/`, `lib/pdf-export.ts`, `README.md`, `docs/`

| # | Task | Done when |
|---|---|---|
| C1 | Get every AI route working against real Anthropic Claude (chat, decision-assist, generate-doc, summarize). Check `ANTHROPIC_MODEL` supports structured outputs | All four return valid output; failures show a clear message |
| C2 | Grounding tests: run the 7 demo questions plus 3 off-topic ones | Cites real records; drivetrain gearing question returns the exact "couldn't find a documented explanation" sentence; off-topic says nothing is documented |
| C3 | Document generation: all 6 types, regenerate a section, save, export a readable PDF | PDF opens and shows documented / partial / not-documented labels |
| C4 | Decision assistant in the decision form | Rough sentence in, organised fields and missing-info questions out; never invents numbers |
| C5 | Readiness criteria review with the team: are the six rules right for your story? Adjust text and thresholds in `lib/readiness.ts` | Team agrees; the "How readiness is calculated" text matches the code |
| C6 | Write the 3-minute demo script and 5 slides (see below) | Rehearsed twice |
| C7 (stretch) | Assistant context from the hub: "Ask this component" preloads component records | Answers stay scoped to that component |

## Shared contracts (agree on these, change only with a heads-up)

- `lib/cad/types.ts` (Part, Material, Tool): B owns, A and C read.
- `lib/types.ts` and `supabase/migrations/*`: A owns. **Never edit a migration that has been run. Add a new numbered file.**
- `lib/readiness.ts` output shape (`ComponentModel`): C owns, B's hub reads it.
- `lib/bundle.ts` (`ProjectBundle`): A owns, everyone reads it.

## Git workflow

```bash
git checkout -b track-a/<topic>      # track-b/..., track-c/...
# small commits, then
git pull --rebase origin claude/focused-keller-vaxrr2
git push -u origin track-a/<topic>
```

- Open a PR into `claude/focused-keller-vaxrr2` for each task, 10 to 40 lines of explanation, one reviewer from another track.
- Merge at least every 2 hours. Never let a branch live past one work block.
- Before merging: `npx tsc --noEmit && npx eslint . && npx next build`.
- Secrets live only in `.env.local` and Vercel. `.env.local` is already ignored.

## Timeline (two days)

| Block | A | B | C |
|---|---|---|---|
| **Day 1 morning** | Setup Sprint together, then A1 | Setup Sprint, then B1 | Setup Sprint, then C1 |
| **Day 1 afternoon** | A2 deploy, A3 RLS | B2 model, B4 | C2 grounding tests, C3 |
| **Checkpoint (end Day 1)** | Full demo path works on the deployed URL, even if ugly. Everyone runs it once. | | |
| **Day 2 morning** | A5, A6, A4 | B3, B5, B6 | C4, C5, C6 |
| **Day 2 afternoon** | Bug triage for everyone | B7 | Rehearse, README final |
| **Freeze (3 hours before judging)** | No new features. Only bug fixes. Tag the build. | | |

## Demo script (3 minutes)

1. **Problem (20s):** engineers leave, and the *why* behind the design leaves with them.
2. **Hub (40s):** the 3D car, click the Suspension marker, show progress and the latest decision.
3. **Why (40s):** open the component, show the decision, rejected alternatives, linked research, and the honest "no simulation was run" note.
4. **Gaps (30s):** back on the hub, "3 of 4 components need attention"; open Drivetrain and show the undocumented gearing decision.
5. **Ask (30s):** "Why did we change the suspension design?" with cited sources, then the gearing question that returns the "couldn't find a documented explanation" sentence.
6. **Close (20s):** generate a handoff summary, export the PDF. "The next engineer never starts from scratch."

Rule for the room: **say out loud that the sample project is demonstration data and that readiness is not engineering approval.** Judges notice honesty.

## Cut list, in order, if time runs out

1. Local demo mode (A7), then stretch items B7 and C7
2. GLB model (B2): keep the primitive car, it is labelled as a placeholder
3. Team invites polish (A4)
4. Extra document types: ship one-page summary and handoff only
5. Decision assistant (C4): the manual form works without it

**Never cut:** sign-in, sample project, hub with markers, readiness, the assistant's cited and "not documented" behaviour, deploy.

## Known gaps to mention if asked

- Overlapping markers are not specially handled yet.
- Scanned PDFs yield no text (no OCR).
- The 3D model is primitive-based, not a CAD kernel; there is no CAD file import.
- No email invitations, and people without accounts can be added by name only.
- Retrieval is keyword-based rather than vector search.

## Daily 10-minute stand-up

Each person answers: what merged, what is blocked, what is the next smallest thing that makes the demo path better. If two people need the same file, decide who goes first right then.

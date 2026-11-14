# CONTINUUM / Project Memory — brand identity

**Working draft for team discussion · 14 November 2026**
Names and visual choices are provisional. This document records a direction to test, not an approved brand system.

## The idea

Engineering work is easier to carry forward when people can find not only what changed, but why. CONTINUUM / Project Memory connects components and 3D views with the research, decisions, revisions, reviews, and handoff information behind them.

**Working promise:** Understand why decisions were made, so the next engineer can continue the work.

**Positioning:** For student and professional engineering teams working on shared physical projects, CONTINUUM / Project Memory is an engineering workspace that connects project knowledge to the components it concerns. It helps teammates understand decisions in context and pick up the work with a clearer view of what is known, what changed, and what remains open.

**Short description:** An engineering workspace for understanding the reasoning behind the work.

**Presentation headline to test:** Understand the decision. Continue the work.

**Supporting copy:** Explore an assembly, follow the decisions behind its components, and see what the next engineer needs to know.

These are proposed words, not claims of verified outcomes. The product's value depends on teams recording and maintaining the context.

## Audience and use

The intended audience includes both **student engineering teams** and **professional hardware engineering teams** from the start. This is a strategic choice to test, not evidence that the two groups have identical needs.

- **Incoming engineer or student:** needs orientation, the rationale for current choices, and open questions.
- **Current contributor or component owner:** needs a practical way to connect decisions and evidence to their work.
- **Team lead, reviewer, or handoff owner:** needs visibility into documented context, unresolved reviews, and what the next person should examine.

A useful shared moment: an engineer selects a component, sees the design choice, follows its sources and revision history, and identifies what still needs attention. Interview both audiences about how they record decisions, where handoffs fail, what they consider trustworthy, and what would make recording context worthwhile. Check whether permissions, formal review, and integration needs diverge before assuming a single workflow serves both equally.

## Brand character

| Quality | In practice | Avoid |
|---|---|---|
| Clear | Give the answer a place, name the source, and expose the next step. | Dense labels, vague status, unexplained shorthand. |
| Capable | Respect engineering detail and show relationships precisely. | Decorative technical complexity or inflated claims. |
| Trustworthy | Show provenance, dates, uncertainty, gaps, and separate states. | Implying an unrecorded reason or treating completeness as approval. |
| Approachable | Orient new teammates in plain language without simplifying away the work. | Talking down to experienced engineers. |
| Forward-looking | Connect the history to an actionable next step. | Framing the product as an archive alone. |

The desired impression is a thoughtful engineering teammate: composed, specific, and helpful under uncertainty.

## Voice

Write directly and use familiar engineering language. Lead with the useful fact, then give context or an action. Use active verbs, short labels, and neutral language when information is missing. Make authorship and evidence visible when available. Be confident about what the product shows and candid about what it does not know.

| Situation | Try | Avoid |
|---|---|---|
| Missing context | “No reasoning has been recorded for this decision yet.” | “Decision invalid.” |
| Next step | “Add why the steering revision changed.” | “Fix your incomplete project.” |
| Handoff | “Three open questions need attention.” | “Your project is ready to ship.” |
| Documentation | “Documentation complete. Engineering approval is tracked separately.” | “Approved” or “Engineering ready” for a documentation checklist. |
| Generated summary | “Review this summary against the linked project records.” | “All project details verified.” |

Use **decision**, **reasoning**, **source**, **revision**, **review**, and **handoff** consistently. Define a term in context when its meaning is specific to the product. Prefer “documented” or “ready for handoff” with a clear definition over an unqualified “ready.” A documentation checklist can report recorded information; it cannot establish engineering approval.

## Visual direction: working principles

The current concept points toward a focused engineering workspace: charcoal surfaces, restrained borders, blue highlights, a modern sans serif, and a prominent assembly. Use these as starting conditions for exploration, not final specifications.

1. **Make the work the visual anchor.** Let a component or assembly lead the composition when it helps explain a decision. Show the path from part to evidence.
2. **Create calm hierarchy.** Use space, readable type, and restrained surface changes to organize complex material. Reserve emphasis for the current task, selection, and important state.
3. **Make trust visible.** Present sources, timestamps, revision identifiers, open questions, and review state where they help interpretation. Do not rely on color alone.
4. **Balance precision with welcome.** Use technical imagery and structured layouts without turning every surface into a schematic or a wall of data.
5. **Design for actual reading.** Test text and control contrast, focus states, small sizes, keyboard navigation, and legibility of the 3D markers. Final values need accessibility testing in context.

### Three routes to explore

These are moodboard directions, not finalized palettes, logos, or type selections. Each can support a dark app and mostly dark presentation.

| Route | Character | Visual cues | Question to test |
|---|---|---|---|
| **01 / Focused workspace** | Quiet, capable, contemporary | Layered charcoal surfaces, fine borders, selective blue, generous headline space; the assembly provides visual interest. | Does it feel distinctive enough while staying clear in a dense workspace? |
| **02 / Connected evidence** | Analytical, transparent, traceable | Component details connected to source snippets, revision trails, and sparse linework; restrained accent used to trace a relationship. | Can the relationships be understood without creating visual clutter? |
| **03 / Continuity in motion** | Human, purposeful, progressive | A sequence from component to decision to next action; deliberate cropping, editorial scale, subtle transitions in digital presentations. | Does it feel active and welcoming without suggesting the product automatically guarantees continuity? |

Explore routes with the same sample content and compare readability, distinctiveness, and fit for both audiences. They can inform one another; the team does not need to choose one wholesale.

### Type, color, and mark

- **Typography:** The Deloitte Engineering reference is about the lighter large heading and stronger hierarchy; its exact typeface is unknown. Inter is a mockup placeholder. Compare a small set of modern sans serifs at headline, body, dense table, and small-label sizes; evaluate weights, numerals, availability, and licensing before choosing.
- **Color:** Charcoal and blue are the current direction, not a locked palette. Explore alternative hues and contrast levels through real interface states and slides. Define semantic roles only after testing; never make color the sole signal for status.
- **Logo and naming:** The team prefers the original third concept: three repeated, open, angled modular forms suggesting continuity and work carried forward. Preserve the shape of that original concept when developing or using the symbol; subsequent redrawn variations did not match the preferred original. The selected direction is provisional, not a finalized logo. Transparent raster exports have been prepared for presentations and app exploration; verify small-size legibility and develop faithful vector artwork before finalizing. The diamond in the Figma concepts is not the chosen logo. Names and wordmarks remain open; test pronunciation, meaning, distinctiveness, and practical availability before selection. No trademark or domain clearance has been performed.
- **Imagery:** Prefer real project assemblies, component detail, and evidence relationships where permission and fidelity allow. Use illustrative sample data clearly labeled as such. The Figma 3D assembly is a placeholder, not a finished product asset.

### Provisional logo files

The selected original concept is available as transparent raster images: [white for dark backgrounds](brand-assets/original-symbol-white-transparent.png) and [dark for light backgrounds](brand-assets/original-symbol-dark-transparent.png). The [app icon package](brand-assets/continuum-app-icons.zip) contains both versions in 32, 48, 64, 128, 256, and 512 px sizes; individual files are in [app-icons](brand-assets/app-icons/). These are extracted and resized from the original image, not vector artwork. Background removal and resizing change pixels at the edges; test legibility in context.

## Application expression

- **Project hub:** Make the assembly a meaningful entry point to project knowledge. Pair selections or markers with component names and accessible list navigation; a 3D view should not be the only way to find information.
- **Component workspace:** Put “why this design?” near the selected component, with links to decisions, sources, revisions, and open reviews. Differentiate recorded fact from interpretation and missing information.
- **Status and handoff:** Label documentation readiness explicitly and show engineering review or approval separately. Present open questions and next steps with their owners or sources when available.
- **Interface hierarchy:** Keep navigation predictable; distinguish primary actions, selections, and warnings in text and shape as well as color. Maintain readable density and visible focus states.
- **Empty and generated states:** State what is missing and how to add it. When summaries are generated, identify them as such and link back to underlying records for review.

These are proposed experience principles; the current Figma screens are static concepts, not evidence of implemented behavior.

## Presentation expression

**Preference: mostly dark**, with the same focused atmosphere as the product. Use light text and restrained accents, but leave exact colors and typography open. Allow occasional lighter diagrams or panels where they make a complex idea easier to read.

A concise narrative to prototype:

1. **The problem:** The design survives; the reasons can be scattered across people, files, and conversations.
2. **The promise:** Understand why decisions were made. Continue the work.
3. **The product:** Show a labeled sample assembly leading to a component and its decision, source, and revision.
4. **The handoff:** Show what is known, what is missing, and the next action. Distinguish documentation from approval.
5. **The audience:** Show both student and professional team contexts as intended audiences, without presenting unvalidated adoption as fact.
6. **The ask or next step:** Invite feedback on the workflow, identity, and open decisions.

Use one clear message per slide, strong reading hierarchy, and product imagery large enough to see. Keep small UI screenshots from becoming the only evidence of the story. Label mockups and sample content; avoid invented metrics or claims.

## What exists and what we learned

- The [working brand brief](https://github.com/gachow-07/CONTINUUM/blob/frontend/app-home-project-hub/docs/BRAND_IDENTITY.md) already establishes the purpose, provisional naming, initial student-team hypothesis, careful voice, and separation of documentation readiness from approval.
- The [Figma concepts](https://www.figma.com/design/Ti5JKelG61EeFJHxsX17jr) include a project hub, component workspace, research, decisions, reviews, documentation, application home, and handoff. The hub's assembly placeholder connects markers to project knowledge; the component view asks “Why this design?”; the handoff surfaces next steps and explicitly distinguishes documentation readiness from engineering approval.
- For this draft, the intended audience was broadened to student and professional teams equally; the central promise was prioritized around understanding why decisions were made; and the presentation preference was set to mostly dark.
- The Deloitte screenshot has not yet been reviewed directly, so its typography is described as reported.

## Open decisions and reference log

**Still open:** product and company naming; final logo artwork, typeface, palette, imagery, accessibility specifications, and whether one visual route or a combination best expresses the brand. Validate audience needs, core workflow, and language with both groups before treating these hypotheses as settled.

| Reference | What resonates | What to avoid or adapt | Application |
|---|---|---|---|
| Deloitte Engineering screenshot (user-described; image not yet reviewed) | Lightweight heading and stronger text hierarchy | Exact font unknown; green graphic and palette not selected | Type exploration |
| Project Memory Figma concepts | Assembly-to-knowledge structure; explicit handoff and status language | Static mockups and placeholder assembly | Product and presentation |
| Add future reference | | | |

**Next discussion:** Collect references and note the specific traits that work. Compare the three routes with a shared component-to-decision example, then test type and color in real app and presentation contexts before making final selections.

## Remaining handoff work

Develop a moodboard from additional references, compare the visual directions, test a final typeface and accessible palette, and prepare faithful vector logo artwork and reusable design assets. Define and validate UI foundations and tokens in representative screens. Review the most important workflow and responsive, empty, loading, and error states with the team. Confirm timeline, budget, accessibility requirements, and whether the dark direction extends to a website.

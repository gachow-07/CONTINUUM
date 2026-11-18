# Product design direction: engineering knowledge and handoff

Use this guide when planning and designing CONTINUUM features. The goal is to help an incoming engineer understand a component: what it does, what was decided and why, what evidence supports it, what remains uncertain, and what to do next. Design for both the person recording knowledge and the person taking it over.

This is product direction, not a claim that every capability below is implemented. Check the README and current code before describing a feature as available. Prioritize a usable end-to-end workflow over a collection of disconnected screens.

## Product capabilities to design for

- **Guided component handoff:** Bring together component purpose, current design, decisions, supporting evidence, revisions, unresolved issues and next steps. Allow the departing engineer to review the handoff and the incoming engineer to ask questions, flag unclear information and acknowledge it.
- **Structured decisions:** Capture the problem, chosen solution, alternatives and rationale, with links to the relevant component, revision, research, analysis and review. Make the reasons behind rejected alternatives discoverable.
- **Research library:** Save papers, articles, standards and other sources with a link or attachment, description, relevance, limitations and links to components and decisions. Preserve a path back to the original source.
- **FEA and CFD evidence:** Design a structured analysis record with its purpose, component and design revision, analysis type, files, inputs and assumptions (including loads, constraints, material and units when relevant), results, limitations, author, date and engineer's conclusion or review. Support incomplete and explicitly unknown fields.
- **Connected evidence:** Let users navigate from a component or decision to supporting research, analysis, revisions and reviews, and back. Explain how each item supports or challenges a decision.
- **Revision awareness:** Show which revision evidence refers to. When a component changes, flag older linked evidence for an engineer to review; do not automatically declare it invalid or a design safe. Where a link is missing, show that the revision is unknown.
- **Documentation readiness:** Surface missing descriptions, reasoning, alternatives, sources, revision explanations and review status at component level. Explain each criterion and link to the action that addresses it. Readiness measures recorded information, not engineering correctness, validation or approval.
- **Grounded assistant:** Answer using accessible project records, cite supporting sources, distinguish documented facts from interpretations and identify missing information. Do not invent values or claim to have analyzed a file. Clearly explain what the system can and cannot read; retain human review of engineering conclusions.
- **Low-friction capture:** Allow a review comment, research note or revision to seed a decision draft. Present AI suggestions for a person to check and confirm before saving; preserve the original source.
- **Real CAD context:** Design for links to real CAD projects or models and their specific revisions, with component-to-record associations. The current primitive editor is not a full CAD system; do not depict import, geometry analysis or integration as implemented until they exist.
- **Team transition overview:** Show outgoing and incoming owners, components without successors, open issues, incomplete handoffs and relevant dates. Support recurring transitions such as a student team's new season.

## Design review checklist

For each relevant new or changed flow, check:

1. Can an incoming engineer find the current component, its owner, decisions, supporting evidence and unresolved work?
2. Can the author record the reason and source without duplicating information? Can users navigate both directions between linked records?
3. Are revision, author, date, assumptions, units, limitations and unknowns visible where they matter?
4. Does the design distinguish documentation completeness from engineering approval? Are stale or missing links framed as prompts for human review?
5. Can a user inspect the source behind an AI answer or draft, and correct it before relying on or saving it?
6. Are unimplemented capabilities, sample data, loading, empty, error, permission and accessibility states represented honestly?
7. Does the flow work for both the person handing off and the person taking over?

## Suggested sequencing

1. Build a guided handoff using the existing component, decision, research, review and readiness records.
2. Extend research and FEA/CFD evidence with structured context and links to decisions and revisions.
3. Flag evidence associated with earlier revisions for human review.
4. Reduce capture effort and connect real CAD based on needs observed with pilot teams.
5. Add transition management and measure whether incoming engineers can answer key questions and identify next steps.

Sequence is a proposal, not a delivery commitment. Validate with teams during an actual handoff and measure both incoming understanding and the effort required to prepare it.

## Current foundation and limits

The app already has research sources, decision evidence links, FEA/CFD file categories, revision and review records, component documentation readiness, and a source-aware assistant. Simulation notes and files can be stored, but the app does not run FEA/CFD or interpret native simulation output or images. Its 3D editor uses primitives and does not import STEP or STL. Existing readiness checks establish whether specified records exist; they do not establish their quality or engineering validity.

See the [README](../README.md), [Figma design handoff](FIGMA_DESIGN_HANDOFF.md), and [backend requirements](BACKEND_REQUIREMENTS.md) for current implementation and technical constraints.

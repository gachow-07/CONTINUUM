# Figma design handoff

This is a working design reference for CONTINUUM / Project Memory. The Figma screens are editable static concepts with illustrative RC car data; they are not yet connected to the running app or a clickable prototype. Figma access is managed separately from GitHub: request access from the file owner if the links do not open.

## Design file and screens

- [Full Figma file](https://www.figma.com/design/Ti5JKelG61EeFJHxsX17jr)
- [Application home](https://www.figma.com/design/Ti5JKelG61EeFJHxsX17jr?node-id=9-6)
- [Project hub](https://www.figma.com/design/Ti5JKelG61EeFJHxsX17jr?node-id=1-2)
- [Component workspace](https://www.figma.com/design/Ti5JKelG61EeFJHxsX17jr?node-id=5-2)
- [Research](https://www.figma.com/design/Ti5JKelG61EeFJHxsX17jr?node-id=5-82)
- [Decisions](https://www.figma.com/design/Ti5JKelG61EeFJHxsX17jr?node-id=5-144)
- [Reviews](https://www.figma.com/design/Ti5JKelG61EeFJHxsX17jr?node-id=5-206)
- [Documentation](https://www.figma.com/design/Ti5JKelG61EeFJHxsX17jr?node-id=5-268)
- [Handoff](https://www.figma.com/design/Ti5JKelG61EeFJHxsX17jr?node-id=11-14)

## Product intent

Application home lists projects and is separate from a specific project's hub. Project navigation identifies the project (for example, RC Car Design) and provides Research, Decisions, Reviews, Documentation and Handoff. A component workspace brings the 3D context, decisions, research, revisions and review status together. Handoff is a first-class destination for orientation, outstanding issues, next steps and documentation readiness.

Future screens and flows should follow the [engineering knowledge and handoff product direction](ENGINEERING_HANDOFF_PRODUCT_DIRECTION.md), including the design review checklist.

## Integration guidance

- Treat the designs as direction, not a complete specification. Confirm responsive behavior, empty/loading/error states, permissions and interaction details with the team.
- The 3D areas are placeholders; the existing app uses primitive-based models. Do not assume a realistic car asset or component-isolation behavior exists.
- Existing Next.js pages and components already implement parts of the workflows. Inspect and reuse them before building new ones; coordinate changes to Supabase schema and shared data contracts with the backend teammate.
- Inter is a provisional font and the dark/blue palette is a working direction, not a finalized brand system.
- Implement a small end-to-end slice first: project selection, a project hub, and one component/decision or handoff flow. Connect real data when the development Supabase project is ready; clearly label sample data until then.
- Documentation readiness describes completeness of recorded information; it is not engineering approval. AI and exports require separate validation.

See [backend requirements](BACKEND_REQUIREMENTS.md), [README](../README.md), and [hackathon plan](HACKATHON_PLAN.md) for code, setup, and known validation gaps.

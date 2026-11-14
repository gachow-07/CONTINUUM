import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSampleAssembly } from "@/lib/cad/sample";
import { calcNote, chassisPlate, coverImage, suspensionRevA, suspensionRevB } from "./svg";

const BUCKET = "project-files";
const day = (offsetFromToday: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetFromToday);
  return d.toISOString().slice(0, 10);
};
const ts = (offsetFromToday: number, hour = 14) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetFromToday);
  d.setHours(hour, 12, 0, 0);
  return d.toISOString();
};

async function ins<T = { id: string }>(supabase: SupabaseClient, table: string, rows: object | object[], select = "id") {
  const { data, error } = await supabase.from(table).insert(rows).select(select);
  if (error) throw new Error(`Seeding ${table} failed: ${error.message}`);
  return (data ?? []) as T[];
}

/**
 * Creates the "RC Car Design" demonstration project. Everything is flagged is_sample=true so the UI labels it
 * as demonstration data — none of it is verified engineering information.
 */
export async function buildSampleProject(supabase: SupabaseClient, user: { id: string; name: string; orgId: string | null }): Promise<string> {
  const [project] = await ins(supabase, "projects", {
    owner_id: user.id, org_id: user.orgId, name: "RC Car Design", category: "Mechanical / Vehicle", status: "active", is_sample: true,
    description:
      "A student team's 1/10-scale 4WD off-road RC buggy, built over one semester. Sample project: it demonstrates how Project Memory preserves research, design revisions, decisions and reviews so the next team can pick up where this one stopped.",
  });
  const pid = project.id;

  // ── Storage assets (SVG placeholders) ──
  const up = async (path: string, body: string, contentType: string) => {
    const { error } = await supabase.storage.from(BUCKET).upload(`${pid}/${path}`, Buffer.from(body), { contentType, upsert: true });
    if (error) throw new Error(`Seed upload failed (${path}): ${error.message}. Did you run the storage part of the SQL migration?`);
    return `${pid}/${path}`;
  };
  const coverPath = await up("sample/cover.svg", coverImage(), "image/svg+xml");
  const pathA = await up("sample/suspension-rev-a.svg", suspensionRevA(), "image/svg+xml");
  const pathB = await up("sample/suspension-rev-b.svg", suspensionRevB(), "image/svg+xml");
  const pathPlate = await up("sample/chassis-plate-fea-placeholder.svg", chassisPlate(), "image/svg+xml");
  const pathCalc = await up("sample/roll-stiffness-worksheet.txt", calcNote, "text/plain");
  await supabase.from("projects").update({ cover_path: coverPath }).eq("id", pid);

  // ── Team ──
  const me = user.name;
  const members = await ins<{ id: string; display_name: string }>(supabase, "project_members", [
    { project_id: pid, display_name: "Priya Raman", email: "priya@sample.example", role: "editor", is_sample: true },
    { project_id: pid, display_name: "Marcus Lee", email: "marcus@sample.example", role: "editor", is_sample: true },
    { project_id: pid, display_name: "Elena Voss", email: "elena@sample.example", role: "editor", is_sample: true },
  ], "id,display_name");
  const mem = (n: string) => members.find((m) => m.display_name.startsWith(n))!;

  // ── Subsystems ──
  const subs = await ins<{ id: string; name: string }>(supabase, "subsystems", [
    { project_id: pid, name: "Suspension", position: 0, is_sample: true, description: "Front and rear suspension: arms, shocks, springs, and the geometry that sets handling." },
    { project_id: pid, name: "Steering", position: 1, is_sample: true, description: "Servo, steering linkage and Ackermann geometry." },
    { project_id: pid, name: "Chassis", position: 2, is_sample: true, description: "Main chassis plate, mounting points and layout of electronics." },
    { project_id: pid, name: "Drivetrain", position: 3, is_sample: true, description: "Motor, pinion/spur gearing, differentials and driveshafts." },
  ], "id,name");
  const sub = (n: string) => subs.find((s) => s.name === n)!.id;

  // ── 3D model (parametric primitives; illustrative, flagged by the project\'s sample banner) ──
  const model = createSampleAssembly();
  await ins(supabase, "model_parts", model.map((m, i) => ({
    id: m.id, project_id: pid, parent_id: m.parentId, subsystem_id: m.subsystemName ? sub(m.subsystemName) : null, name: m.name, kind: m.kind,
    params: m.params, position: m.position, rotation: m.rotation, material: m.material, visible: m.visible, sort: i,
  })));

  // ── Research ──
  const R = (r: object) => ({ project_id: pid, is_sample: true, created_by: user.id, ...r });
  const research = await ins<{ id: string; title: string }>(supabase, "research_sources", [
    R({ subsystem_id: sub("Suspension"), type: "paper", title: "Suspension Geometry Optimization", url: "https://example.com/sample/suspension-geometry-optimization", site_name: "Sample Engineering Journal",
      description: "Sample abstract: compares equal- and unequal-length wishbone layouts and how camber gain in roll affects outer-tire contact.", tags: ["suspension", "geometry", "roll", "camber"],
      why_important: "Explains why an unequal-length double wishbone keeps the outside tire flatter during cornering, which is the mechanism we needed to fix Rev A's roll behaviour.",
      content_text: "SAMPLE TEXT written for the demo (not from a real paper). Unequal-length wishbones introduce camber change as the body rolls. With a shorter upper arm, the outside wheel gains negative camber in roll, improving tire contact. Lowering the roll center relative to the center of gravity changes the roll moment arm and therefore body roll for a given lateral acceleration." }),
    R({ subsystem_id: sub("Suspension"), type: "article", title: "Roll Center and Weight Transfer Basics", url: "https://example.com/sample/roll-center-basics", site_name: "Sample Vehicle Dynamics Notes",
      description: "Sample article introducing roll centers, roll moment arms and load transfer in small vehicles.", tags: ["suspension", "roll-center", "weight-transfer"],
      why_important: "Gave the team the vocabulary and the reasoning to connect body roll to roll-center height and spring rate.",
      content_text: "SAMPLE TEXT for the demo. Body roll depends on the distance between the center of gravity and the roll axis, and on the roll stiffness of the springs. Reducing that distance or increasing roll stiffness reduces roll, at the cost of ride compliance." }),
    R({ subsystem_id: sub("Suspension"), type: "note", title: "Track test #1 observations", site_name: null,
      description: "Team notes from the first outdoor track session.", tags: ["testing", "suspension", "observation"],
      why_important: "This is the only first-hand evidence of the problem with Rev A. It is qualitative — no data was logged.",
      content_text: "SAMPLE NOTE. In fast sweepers the car leaned noticeably and the inside rear wheel lifted. The 3D-printed upper arm cracked at the ball-joint pocket after a hard landing. No measurements or video-based angle estimates were taken." }),
    R({ subsystem_id: sub("Suspension"), type: "url", title: "Coil-over Damper Tuning for 1/10 Scale Off-road", url: "https://example.com/sample/coilover-tuning", site_name: "Sample RC Tech Blog",
      description: "Sample blog post on spring rate and shock oil selection for small off-road cars.", tags: ["suspension", "dampers", "tuning"], why_important: "Reference for the firmer front spring chosen in Rev B." }),
    R({ subsystem_id: sub("Steering"), type: "article", title: "Ackermann Steering Geometry for Small Vehicles", url: "https://example.com/sample/ackermann-small-vehicles", site_name: "Sample Mechanics Handbook",
      description: "Sample article on Ackermann percentage and its effect on low-speed scrub.", tags: ["steering", "ackermann"], why_important: "Needed when we revisit the steering linkage after the suspension change moved the pivot points." }),
    R({ subsystem_id: sub("Steering"), type: "note", title: "Servo torque sizing notes", description: "Back-of-envelope reasoning for servo selection.", tags: ["steering", "servo"],
      why_important: "Starting point for the pending servo decision.", content_text: "SAMPLE NOTE. Servo must overcome tire scrub at standstill. Team has not yet chosen between the stock plastic-gear servo and a metal-gear unit." }),
    R({ subsystem_id: sub("Chassis"), type: "paper", title: "3 mm Carbon Fiber vs 6061 Aluminum Plates for Small Chassis", url: "https://example.com/sample/carbon-vs-aluminum-plates", site_name: "Sample Materials Review",
      description: "Sample comparison of stiffness-to-weight and cost for plate chassis in small vehicles.", tags: ["chassis", "materials", "carbon-fiber"],
      why_important: "Supports choosing a carbon plate for stiffness-to-weight.", content_text: "SAMPLE TEXT for the demo. Carbon fiber laminate plates offer higher specific stiffness than 6061 aluminum of equal thickness but cost more and are harder to machine cleanly." }),
    R({ subsystem_id: sub("Drivetrain"), type: "url", title: "Brushless Motor KV and Gear Ratio Selection", url: "https://example.com/sample/motor-kv-gearing", site_name: "Sample RC Tech Blog",
      description: "Sample guide on matching motor KV, battery voltage and final drive ratio.", tags: ["drivetrain", "motor", "gearing"], why_important: "Would inform the gear ratio decision — but the team never linked it to a decision." }),
  ], "id,title");
  const rs = (t: string) => research.find((r) => r.title.startsWith(t))!.id;

  // ── Revisions ──
  const V = (r: object) => ({ project_id: pid, is_sample: true, ...r });
  const revs = await ins<{ id: string; rev_label: string }>(supabase, "design_revisions", [
    V({ subsystem_id: sub("Chassis"), rev_label: "Rev 0", title: "Initial vehicle concept", kind: "initial", occurred_on: day(-82), author_name: me,
      description: "First layout: plate chassis, 4WD shaft drivetrain, single upper-arm suspension.", reason: "Start from a simple, printable design so the team could build and test quickly within the semester." }),
    V({ subsystem_id: sub("Suspension"), rev_label: "Rev A", title: "Suspension Rev A — single upper arm", kind: "design_change", occurred_on: day(-74), author_name: "Priya Raman",
      description: "Single upper arm with a fixed lower link and an inboard coil-over.", reason: "Fewest parts and quickest to print; acceptable for first drive tests." }),
    V({ subsystem_id: sub("Suspension"), rev_label: "Discovery 1", title: "Roll-center research reviewed", kind: "research", occurred_on: day(-58), author_name: "Priya Raman",
      description: "Team read the roll-center and wishbone geometry sources and mapped them to Rev A's behaviour.", reason: "Needed to understand why Rev A leaned so much before choosing a fix." }),
    V({ subsystem_id: sub("Suspension"), rev_label: "Test 1", title: "Track test #1 — excessive body roll", kind: "feedback", occurred_on: day(-56), author_name: me,
      description: "Outdoor track session. Car leaned in fast corners; inside rear wheel lifted; upper arm cracked at the ball-joint pocket.", reason: "Recorded as the trigger for the suspension redesign. Observations are qualitative; no data was logged." }),
    V({ subsystem_id: sub("Suspension"), rev_label: "Rev B", title: "Suspension Rev B — unequal-length double wishbone", kind: "design_change", occurred_on: day(-40), author_name: "Priya Raman",
      description: "Replaced the single upper arm with an unequal-length double wishbone, lowered the roll center, stiffened the front spring, and switched arm material from PLA to a tougher nylon-based filament.",
      reason: "Rev A had too much body roll in track test #1 and the printed arm cracked. Research indicated unequal-length wishbones add camber gain in roll and let us lower the roll center." }),
    V({ subsystem_id: sub("Chassis"), rev_label: "Sim 1", title: "Chassis plate static analysis (placeholder)", kind: "simulation", occurred_on: day(-32), author_name: "Marcus Lee",
      description: "A static load case on the chassis plate was set up. Sample entry: the attached image is a placeholder and does not contain real results.", reason: "Check the plate would not flex excessively with the battery tray cutout." }),
    V({ subsystem_id: sub("Suspension"), rev_label: "Review 1", title: "Peer review of Rev B", kind: "feedback", occurred_on: day(-24), author_name: "Marcus Lee",
      description: "Marcus reviewed Rev B and asked about arm clearance and ball-joint pocket strength.", reason: "Standard design review before ordering the final printed parts." }),
    V({ subsystem_id: sub("Suspension"), rev_label: "Rev B.1", title: "Rev B.1 — upper-arm spacer added", kind: "design_change", occurred_on: day(-20), author_name: "Priya Raman",
      description: "Added a spacer to the upper arm mounting so the arm clears the shock tower at full compression.", reason: "Direct response to Marcus's clearance question in the Rev B peer review." }),
    V({ subsystem_id: sub("Suspension"), rev_label: "Test 2", title: "Track test #2 on Rev B.1", kind: "final", occurred_on: day(-10), author_name: me,
      description: "Second track session with Rev B.1. Drivers reported noticeably less lean. No instrumented measurement was taken.", reason: "Confirm whether the redesign addressed the roll problem. Result is a subjective observation only." }),
  ], "id,rev_label");
  const rv = (l: string) => revs.find((r) => r.rev_label === l)!.id;

  // ── Files ──
  const F = (f: object) => ({ project_id: pid, is_sample: true, uploaded_by: user.id, ...f });
  const files = await ins<{ id: string; name: string }>(supabase, "files", [
    F({ subsystem_id: sub("Suspension"), revision_id: rv("Rev A"), name: "suspension-rev-a.svg", storage_path: pathA, mime: "image/svg+xml", size: suspensionRevA().length, category: "cad_screenshot", description: "Schematic of Rev A (sample illustration)." }),
    F({ subsystem_id: sub("Suspension"), revision_id: rv("Rev B"), name: "suspension-rev-b.svg", storage_path: pathB, mime: "image/svg+xml", size: suspensionRevB().length, category: "cad_screenshot", description: "Schematic of Rev B (sample illustration)." }),
    F({ subsystem_id: sub("Suspension"), revision_id: rv("Rev B"), name: "roll-stiffness-worksheet.txt", storage_path: pathCalc, mime: "text/plain", size: calcNote.length, category: "calculation", description: "Sample worksheet outline — contains no real calculated values.", extracted_text: calcNote }),
    F({ subsystem_id: sub("Chassis"), revision_id: rv("Sim 1"), name: "chassis-plate-fea-placeholder.svg", storage_path: pathPlate, mime: "image/svg+xml", size: chassisPlate().length, category: "fea", description: "Placeholder image standing in for FEA results (sample)." }),
  ], "id,name");
  const fl = (n: string) => files.find((f) => f.name.startsWith(n))!.id;

  // ── Decisions + evidence ──
  const D = (d: object) => ({ project_id: pid, is_sample: true, ...d });
  const decisions = await ins<{ id: string; title: string }>(supabase, "design_decisions", [
    D({ subsystem_id: sub("Suspension"), title: "Switch from single-arm to unequal-length double-wishbone suspension", status: "accepted", decided_on: day(-42), author_name: "Priya Raman",
      problem: "Rev A leaned heavily in fast corners during track test #1, the inside rear wheel lifted, and the printed upper arm cracked at the ball-joint pocket.",
      selected_solution: "Adopt an unequal-length double-wishbone geometry (shorter upper arm), lower the roll center, use a firmer front spring, and print the arms in a tougher nylon-based filament.",
      alternatives: [
        { name: "Keep Rev A and fit stiffer springs", reason_rejected: "Would reduce lean but harden the ride and does not give camber control; also does nothing for the cracked arm." },
        { name: "Add an anti-roll bar to Rev A", reason_rejected: "No mounting room on the current chassis plate and adds weight; may be revisited later." },
        { name: "Multi-link rear and front suspension", reason_rejected: "Too complex to design, print and tune within the semester timeline." },
      ],
      reasoning: "The cited research links body roll to roll-center height and spring roll stiffness, and shows unequal-length wishbones add camber gain in roll, keeping the outer tire flatter. Together with the track observations, this made the double wishbone the best fit for the problem within time and parts constraints. Note: no simulation or instrumented measurement supports the decision; it rests on research and qualitative test observation." }),
    D({ subsystem_id: sub("Chassis"), title: "Use a 3 mm carbon-fiber plate for the main chassis", status: "accepted", decided_on: day(-35), author_name: "Marcus Lee",
      problem: "The chassis needs to be stiff and light enough to carry the suspension mounts and battery without flexing.",
      selected_solution: "Use a 3 mm carbon-fiber plate chassis with a battery tray cutout.",
      alternatives: [{ name: "6061 aluminum plate", reason_rejected: "Heavier for similar stiffness; team preferred the weight savings." }],
      reasoning: "The materials comparison indicated carbon plates give better stiffness-to-weight. A static analysis was set up to check flex around the battery cutout (the sample attachment is a placeholder)." }),
    D({ subsystem_id: sub("Steering"), title: "Upgrade the steering servo", status: "proposed", decided_on: day(-14), author_name: me,
      problem: "The stock servo may be too weak and its plastic gears may strip under load.",
      selected_solution: "Move to a metal-gear servo (model not yet chosen).", alternatives: [], reasoning: "Torque sizing is only roughed out; no comparison of candidate servos has been recorded yet." }),
    D({ subsystem_id: sub("Drivetrain"), title: "Choose 13T pinion with 54T spur gear", status: "accepted", decided_on: day(-50), author_name: "Elena Voss",
      problem: "Select a final drive ratio.", selected_solution: "13T pinion with a 54T spur gear.", alternatives: [], reasoning: "" }),
  ], "id,title");
  const dc = (t: string) => decisions.find((d) => d.title.startsWith(t))!.id;
  const E = (e: object) => ({ project_id: pid, ...e });
  await ins(supabase, "decision_evidence", [
    E({ decision_id: dc("Switch"), kind: "research", research_id: rs("Suspension Geometry"), note: "Unequal-length wishbones add camber gain in roll." }),
    E({ decision_id: dc("Switch"), kind: "research", research_id: rs("Roll Center"), note: "Links roll to roll-center height and spring rate." }),
    E({ decision_id: dc("Switch"), kind: "research", research_id: rs("Track test #1"), note: "First-hand evidence of the problem with Rev A (qualitative)." }),
    E({ decision_id: dc("Switch"), kind: "research", research_id: rs("Coil-over"), note: "Basis for the firmer front spring." }),
    E({ decision_id: dc("Switch"), kind: "revision", revision_id: rv("Rev A"), note: "The design being replaced." }),
    E({ decision_id: dc("Switch"), kind: "revision", revision_id: rv("Test 1"), note: "Test that exposed the problem." }),
    E({ decision_id: dc("Switch"), kind: "revision", revision_id: rv("Rev B"), note: "The resulting design." }),
    E({ decision_id: dc("Switch"), kind: "file", file_id: fl("suspension-rev-b"), note: "Rev B schematic." }),
    E({ decision_id: dc("Switch"), kind: "file", file_id: fl("roll-stiffness"), note: "Outline worksheet — contains no calculated values." }),
    E({ decision_id: dc("Switch"), kind: "simulation", note: "No suspension simulation was run for this decision." }),
    E({ decision_id: dc("Use a 3 mm"), kind: "research", research_id: rs("3 mm Carbon"), note: "Stiffness-to-weight comparison." }),
    E({ decision_id: dc("Use a 3 mm"), kind: "file", file_id: fl("chassis-plate"), note: "Placeholder for the FEA results image." }),
    E({ decision_id: dc("Use a 3 mm"), kind: "revision", revision_id: rv("Sim 1") }),
  ], "id");

  // ── Reviews + comments ──
  const reviews = await ins<{ id: string; title: string }>(supabase, "reviews", [
    { project_id: pid, is_sample: true, title: "Review: Rev B double-wishbone suspension", description: "Please review the Rev B geometry and the decision to move from a single arm. Focus on clearances and part strength.",
      status: "changes_requested", subsystem_id: sub("Suspension"), decision_id: dc("Switch"), revision_id: rv("Rev B"), file_id: fl("suspension-rev-b"),
      reviewer_member_id: mem("Marcus").id, reviewer_name: "Marcus Lee", requested_by: user.id, requester_name: "Priya Raman", created_at: ts(-26) },
    { project_id: pid, is_sample: true, title: "Review: Chassis plate analysis", description: "Sanity-check the chassis plate layout and analysis setup.", status: "approved", subsystem_id: sub("Chassis"),
      decision_id: dc("Use a 3 mm"), revision_id: rv("Sim 1"), file_id: fl("chassis-plate"), reviewer_member_id: mem("Elena").id, reviewer_name: "Elena Voss", requested_by: user.id, requester_name: "Marcus Lee", created_at: ts(-30) },
    { project_id: pid, is_sample: true, title: "Review: Steering servo selection", description: "Is a metal-gear servo justified? Please ask questions.", status: "pending", subsystem_id: sub("Steering"),
      decision_id: dc("Upgrade"), reviewer_member_id: mem("Priya").id, reviewer_name: "Priya Raman", requested_by: user.id, requester_name: me, created_at: ts(-12) },
  ], "id,title");
  const rw = (t: string) => reviews.find((r) => r.title.includes(t))!.id;
  const C = (c: object) => ({ project_id: pid, is_sample: true, ...c });
  const [q1] = await ins(supabase, "review_comments", C({
    review_id: rw("Rev B"), kind: "question", author_name: "Marcus Lee", decision_id: dc("Switch"), file_id: fl("suspension-rev-b"), created_at: ts(-25),
    body: "Does the new upper arm clear the shock tower at full compression? From the schematic it looks tight.", resolved: true, resolved_by: "Marcus Lee", resolved_at: ts(-19), influenced_revision_id: rv("Rev B.1") }));
  await ins(supabase, "review_comments", [
    C({ review_id: rw("Rev B"), kind: "response", author_name: "Priya Raman", parent_id: q1.id, created_at: ts(-22),
      body: "Good catch. In CAD it only clears with a spacer at the arm mount. I've added that in Rev B.1." }),
    C({ review_id: rw("Rev B"), kind: "comment", author_name: "Marcus Lee", file_id: fl("suspension-rev-b"), created_at: ts(-24),
      body: "The ball-joint pocket looks thin for impact loads — that's where Rev A cracked. Can we add material or change the print orientation?", resolved: false }),
    C({ review_id: rw("Chassis plate"), kind: "comment", author_name: "Elena Voss", created_at: ts(-29), body: "Layout looks reasonable. Approving; please keep the analysis setup attached to the project.", resolved: true, resolved_by: "Elena Voss", resolved_at: ts(-29) }),
  ]);

  // ── Notes: background, lessons, issues, next steps ──
  const N = (n: object) => ({ project_id: pid, is_sample: true, author_name: me, ...n });
  await ins(supabase, "project_notes", [
    N({ kind: "background", title: "What this project is trying to do", body: "Build a reliable 1/10-scale 4WD off-road RC buggy in one semester, and document the design decisions so a future team can improve it rather than start over." }),
    N({ kind: "lesson", subsystem_id: sub("Suspension"), title: "PLA arms cracked at the ball-joint pocket", body: "The Rev A printed arm failed after a hard landing in track test #1. Rev B moved to a tougher nylon-based filament, but the pocket thickness is still under review." }),
    N({ kind: "lesson", subsystem_id: sub("Suspension"), title: "Instrument the car early", body: "Most of our evidence about roll is subjective. Adding an IMU or video-based measurement before redesigning would have given us a baseline to compare against." }),
    N({ kind: "lesson", subsystem_id: sub("Suspension"), title: "Stiffer springs alone were rejected", body: "We considered only stiffening Rev A's springs and rejected it because it would harden the ride without camber control. We did not test this alternative." }),
    N({ kind: "issue", subsystem_id: sub("Suspension"), title: "No quantitative validation that Rev B reduced body roll", body: "Test 2 drivers reported less lean, but no measurements exist. The roll improvement is unverified." }),
    N({ kind: "issue", subsystem_id: sub("Suspension"), title: "Ball-joint pocket strength on Rev B arms", body: "Marcus's review comment about the thin pocket is still open." }),
    N({ kind: "issue", subsystem_id: sub("Drivetrain"), title: "Gear ratio choice is undocumented", body: "The 13T/54T gearing was chosen with no recorded reasoning and no linked research." }),
    N({ kind: "issue", subsystem_id: sub("Steering"), title: "Steering servo selection still pending", body: "Candidate servos have not been compared and the review has not started." }),
    N({ kind: "next_step", subsystem_id: sub("Suspension"), title: "Add an IMU or logging to measure roll", body: "Establish a baseline and compare Rev B.1 against it before further tuning." }),
    N({ kind: "next_step", subsystem_id: sub("Suspension"), title: "Close the ball-joint pocket review comment", body: "Add material or change print orientation, record the change as a revision, then resolve the comment." }),
    N({ kind: "next_step", subsystem_id: sub("Drivetrain"), title: "Document or re-evaluate the gear ratio", body: "Use the motor KV and gearing reference in the library to write down why 13T/54T was chosen, or choose again." }),
    N({ kind: "next_step", subsystem_id: sub("Steering"), title: "Compare candidate servos", body: "Finish torque sizing, shortlist servos and request the review." }),
  ], "id");

  // ── Activity feed ──
  const A = (offset: number, hour: number, actor: string, kind: string, summary: string, ref_type?: string, ref_id?: string) =>
    ({ project_id: pid, actor_name: actor, kind, summary, ref_type: ref_type ?? null, ref_id: ref_id ?? null, created_at: ts(offset, hour) });
  await ins(supabase, "project_activity", [
    A(-82, 10, me, "project", "Created project \"RC Car Design\"", "project", pid),
    A(-74, 16, "Priya Raman", "revision", "Recorded revision Rev A: Suspension Rev A — single upper arm", "revision", rv("Rev A")),
    A(-58, 11, "Priya Raman", "research", "Added research \"Suspension Geometry Optimization\"", "research", rs("Suspension Geometry")),
    A(-57, 15, "Priya Raman", "research", "Added research \"Roll Center and Weight Transfer Basics\"", "research", rs("Roll Center")),
    A(-56, 18, me, "revision", "Recorded revision Test 1: Track test #1 — excessive body roll", "revision", rv("Test 1")),
    A(-40, 13, "Priya Raman", "revision", "Recorded revision Rev B: Suspension Rev B — unequal-length double wishbone", "revision", rv("Rev B")),
    A(-42, 17, "Priya Raman", "decision", "Recorded decision \"Switch from single-arm to unequal-length double-wishbone suspension\"", "decision", dc("Switch")),
    A(-32, 12, "Marcus Lee", "file", "Uploaded chassis-plate-fea-placeholder.svg", "file", fl("chassis-plate")),
    A(-26, 9, "Priya Raman", "review", "Requested review \"Review: Rev B double-wishbone suspension\" from Marcus Lee", "review", rw("Rev B")),
    A(-20, 14, "Priya Raman", "revision", "Recorded revision Rev B.1: Rev B.1 — upper-arm spacer added", "revision", rv("Rev B.1")),
    A(-19, 10, "Marcus Lee", "review", "Resolved a comment on \"Review: Rev B double-wishbone suspension\"", "review", rw("Rev B")),
    A(-10, 16, me, "revision", "Recorded revision Test 2: Track test #2 on Rev B.1", "revision", rv("Test 2")),
    A(-3, 11, me, "note", "Added issue: No quantitative validation that Rev B reduced body roll"),
  ], "id");

  return pid;
}

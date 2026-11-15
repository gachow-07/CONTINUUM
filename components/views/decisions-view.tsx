"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ClipboardCheck, FlaskConical, Loader2, Pencil, Plus, Scale, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge, SampleBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DrawerContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ConfirmDialog, EmptyState, SetupNotice } from "@/components/ui/misc";
import { act } from "@/lib/client";
import { deleteDecision, saveDecision } from "@/app/actions/knowledge";
import { formatDate } from "@/lib/utils";
import type { Alternative, Decision } from "@/lib/types";
import type { Scope } from "@/lib/scope";
import { FilterSelect, NotDocumented, RefChip, SearchBox, Section, SubsystemTag, useOpenParam } from "./common";
import { DECISION_STATUS } from "./meta";

export function DecisionsView({ scope, projectId, subsystemId, aiEnabled }: { scope: Scope; projectId?: string; subsystemId?: string; aiEnabled: boolean }) {
  const [open, setOpen] = useOpenParam();
  const [editing, setEditing] = useState<Decision | "new" | null>(null);
  const [q, setQ] = useState("");
  const [project, setProject] = useState(projectId ?? "");
  const [sub, setSub] = useState(subsystemId ?? "");
  const [status, setStatus] = useState("");

  const rows = scope.decisions.filter((d) =>
    (!project || d.project_id === project) && (!sub || d.subsystem_id === sub) && (!status || d.status === status) &&
    (!q || `${d.title} ${d.problem} ${d.selected_solution}`.toLowerCase().includes(q.toLowerCase())));
  const selected = scope.decisions.find((d) => d.id === open) ?? null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search decisions…" />
        {!projectId && <FilterSelect value={project} onChange={(v) => { setProject(v); setSub(""); }} label="All projects" options={scope.projects.map((p) => ({ value: p.id, label: p.name }))} />}
        {!subsystemId && <FilterSelect value={sub} onChange={setSub} label="All subsystems" options={scope.subsystems.filter((s) => !project || s.project_id === project).map((s) => ({ value: s.id, label: s.name }))} />}
        <FilterSelect value={status} onChange={setStatus} label="Any status" options={Object.entries(DECISION_STATUS).map(([v, m]) => ({ value: v, label: m.label }))} />
        <Button variant="accent" onClick={() => setEditing("new")} disabled={scope.projects.length === 0}><Plus className="h-4 w-4" />Add decision</Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Scale className="h-5 w-5" />} title={scope.decisions.length ? "No decisions match your filters" : "No design decisions yet"}
          description={scope.decisions.length ? "Try clearing a filter." : "Record what you decided, what you rejected, and why — with the research and revisions that back it up."}
          action={!scope.decisions.length && <Button variant="accent" onClick={() => setEditing("new")}><Plus className="h-4 w-4" />Add decision</Button>} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
          <ul className="divide-y divide-border">
            {rows.map((d) => {
              const ev = scope.evidence.filter((e) => e.decision_id === d.id);
              const gap = !d.reasoning.trim() && ev.length === 0;
              const reviews = scope.reviews.filter((r) => r.decision_id === d.id).length;
              return (
                <li key={d.id}>
                  <button onClick={() => setOpen(d.id)} className="flex w-full items-start gap-3.5 px-5 py-4 text-left transition-colors hover:bg-muted/60">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><p className="text-[13px] font-semibold">{d.title}</p>{d.is_sample && <SampleBadge />}</div>
                      <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground"><span className="font-medium text-foreground">Selected:</span> {d.selected_solution || "—"}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <Badge tone={DECISION_STATUS[d.status].tone}>{DECISION_STATUS[d.status].label}</Badge><SubsystemTag id={d.subsystem_id} subsystems={scope.subsystems} />
                        <span>{d.author_name} · {formatDate(d.decided_on)}</span>
                      </div>
                    </div>
                    <div className="hidden shrink-0 flex-col items-end gap-1.5 text-xs sm:flex">
                      {gap ? <Badge tone="warning"><AlertTriangle className="h-3 w-3" />Undocumented reasoning</Badge> : <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3.5 w-3.5" />{ev.length} evidence link{ev.length === 1 ? "" : "s"}</span>}
                      {reviews > 0 && <span className="inline-flex items-center gap-1 text-muted-foreground"><ClipboardCheck className="h-3.5 w-3.5" />{reviews} review{reviews > 1 ? "s" : ""}</span>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {editing && <DecisionEditor scope={scope} decision={editing === "new" ? null : editing} projectId={projectId} subsystemId={subsystemId} aiEnabled={aiEnabled} onClose={() => setEditing(null)} />}
      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setOpen(null)}>
        {selected && <DecisionDrawer d={selected} scope={scope} aiEnabled={aiEnabled} onClose={() => setOpen(null)} onEdit={() => { setOpen(null); setEditing(selected); }} />}
      </Dialog>
    </div>
  );
}

function DecisionDrawer({ d, scope, aiEnabled, onClose, onEdit }: { d: Decision; scope: Scope; aiEnabled: boolean; onClose: () => void; onEdit: () => void }) {
  const router = useRouter();
  const [del, setDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const ev = scope.evidence.filter((e) => e.decision_id === d.id);
  const pid = d.project_id;
  const research = ev.filter((e) => e.kind === "research");
  const revisions = ev.filter((e) => e.kind === "revision");
  const files = ev.filter((e) => e.kind === "file");
  const sims = ev.filter((e) => e.kind === "simulation");
  const reviews = scope.reviews.filter((r) => r.decision_id === d.id);

  async function summarize() {
    setBusy(true);
    try {
      const res = await fetch("/api/ai/summarize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "decision", id: d.id }) });
      const j = await res.json();
      if (!res.ok) toast.error(j.error ?? "Summary failed"); else { toast.success("Summary saved"); router.refresh(); }
    } finally { setBusy(false); }
  }

  return (
    <DrawerContent title={d.title} description={`${d.author_name} · ${formatDate(d.decided_on)}`}
      actions={<><Button variant="ghost" size="icon" aria-label="Edit decision" onClick={onEdit}><Pencil className="h-4 w-4" /></Button><Button variant="danger-ghost" size="icon" aria-label="Delete decision" onClick={() => setDel(true)}><Trash2 className="h-4 w-4" /></Button></>}>
      <div className="mb-5 flex flex-wrap gap-1.5"><Badge tone={DECISION_STATUS[d.status].tone}>{DECISION_STATUS[d.status].label}</Badge><SubsystemTag id={d.subsystem_id} subsystems={scope.subsystems} />{d.is_sample && <SampleBadge />}</div>
      <Section title="Problem">{d.problem || <NotDocumented />}</Section>
      <Section title="Selected solution">{d.selected_solution || <NotDocumented />}</Section>
      <Section title="Alternatives considered">
        {d.alternatives.length === 0 ? <NotDocumented>No alternatives documented</NotDocumented> : (
          <ul className="space-y-2">{d.alternatives.map((a, i) => <li key={i} className="rounded-md border border-border p-2.5"><p className="font-medium">{a.name}</p><p className="mt-0.5 text-xs text-muted-foreground">Rejected because: {a.reason_rejected || <NotDocumented>reason not documented</NotDocumented>}</p></li>)}</ul>)}
      </Section>
      <Section title="Reasoning">{d.reasoning ? <p className="whitespace-pre-wrap">{d.reasoning}</p> : <NotDocumented>No reasoning recorded for this decision</NotDocumented>}</Section>
      <Section title="Supporting evidence">
        {ev.length === 0 ? <NotDocumented>No evidence linked</NotDocumented> : (
          <div className="space-y-3">
            {research.length > 0 && <div><p className="mb-1.5 text-xs font-medium text-muted-foreground">Research</p><ul className="space-y-1.5">{research.map((e) => { const r = scope.research.find((x) => x.id === e.research_id); return r && <li key={e.id}><RefChip projectId={pid} type="research" id={r.id} label={r.title} onNavigate={onClose} />{e.note && <p className="ml-1 mt-0.5 text-xs text-muted-foreground">↳ {e.note}</p>}</li>; })}</ul></div>}
            {revisions.length > 0 && <div><p className="mb-1.5 text-xs font-medium text-muted-foreground">Design revisions</p><ul className="space-y-1.5">{revisions.map((e) => { const r = scope.revisions.find((x) => x.id === e.revision_id); return r && <li key={e.id}><RefChip projectId={pid} type="revision" id={r.id} label={`${r.rev_label} — ${r.title}`} onNavigate={onClose} />{e.note && <p className="ml-1 mt-0.5 text-xs text-muted-foreground">↳ {e.note}</p>}</li>; })}</ul></div>}
            {files.length > 0 && <div><p className="mb-1.5 text-xs font-medium text-muted-foreground">Files</p><ul className="space-y-1.5">{files.map((e) => { const f = scope.files.find((x) => x.id === e.file_id); return f && <li key={e.id}><RefChip projectId={pid} type="file" id={f.id} label={f.name} onNavigate={onClose} />{e.note && <p className="ml-1 mt-0.5 text-xs text-muted-foreground">↳ {e.note}</p>}</li>; })}</ul></div>}
            {sims.length > 0 && <div><p className="mb-1.5 text-xs font-medium text-muted-foreground">Simulation evidence notes</p><ul className="space-y-1.5">{sims.map((e) => <li key={e.id} className="flex gap-2 rounded-md bg-muted/60 p-2.5 text-xs"><FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />{e.note}</li>)}</ul></div>}
          </div>)}
      </Section>
      <Section title="Peer reviews">
        {reviews.length === 0 ? <span className="text-muted-foreground">No reviews requested for this decision.</span> : <ul className="space-y-1.5">{reviews.map((r) => <li key={r.id}><RefChip projectId={pid} type="review" id={r.id} label={r.title} onNavigate={onClose} /></li>)}</ul>}
      </Section>
      <Section title="AI summary" action={aiEnabled ? <button disabled={busy} onClick={summarize} className="ai-gradient inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold disabled:opacity-50">{busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}{d.ai_summary ? "Regenerate" : "Generate"}</button> : undefined}>
        {d.ai_summary ? <p className="rounded-md bg-accent-soft/50 p-3">{d.ai_summary}</p> : aiEnabled ? <span className="text-muted-foreground">Not generated yet.</span> : <SetupNotice title="AI not configured">Add OPENAI_API_KEY to enable summaries.</SetupNotice>}
      </Section>
      <ConfirmDialog open={del} onOpenChange={setDel} title="Delete this decision?" description="Evidence links are removed with it. Research, revisions and files are kept." onConfirm={async () => { const r = await act(deleteDecision(d.id), "Decision deleted"); if (r.ok) { onClose(); router.refresh(); } }} />
    </DrawerContent>
  );
}

interface AssistResult {
  organized: { problem: string; selected_solution: string; reasoning: string; alternatives: Alternative[] };
  missing: { field: string; question: string }[]; questions: string[]; summary: string;
  suggested_evidence: { kind: "research" | "revision" | "file"; id: string; title: string; why: string }[];
}

function DecisionEditor({ scope, decision, projectId, subsystemId, aiEnabled, onClose }: { scope: Scope; decision: Decision | null; projectId?: string; subsystemId?: string; aiEnabled: boolean; onClose: () => void }) {
  const router = useRouter();
  const [pid, setPid] = useState(decision?.project_id ?? projectId ?? scope.projects[0]?.id ?? "");
  const [f, setF] = useState({
    title: decision?.title ?? "", subsystem_id: decision?.subsystem_id ?? subsystemId ?? "", status: decision?.status ?? "proposed",
    decided_on: decision?.decided_on ?? new Date().toISOString().slice(0, 10), problem: decision?.problem ?? "", selected_solution: decision?.selected_solution ?? "", reasoning: decision?.reasoning ?? "",
  });
  const [alts, setAlts] = useState<Alternative[]>(decision?.alternatives ?? []);
  const existing = decision ? scope.evidence.filter((e) => e.decision_id === decision.id) : [];
  const [ev, setEv] = useState<Record<string, string>>(() => Object.fromEntries(existing.filter((e) => e.kind !== "simulation").map((e) => [`${e.kind}:${e.research_id ?? e.revision_id ?? e.file_id}`, e.note])));
  const [sims, setSims] = useState<string[]>(existing.filter((e) => e.kind === "simulation").map((e) => e.note));
  const [free, setFree] = useState("");
  const [ai, setAi] = useState<AssistResult | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const research = scope.research.filter((r) => r.project_id === pid);
  const revisions = scope.revisions.filter((r) => r.project_id === pid);
  const files = scope.files.filter((x) => x.project_id === pid);
  const toggle = (key: string) => setEv((p) => { const n = { ...p }; if (key in n) delete n[key]; else n[key] = ""; return n; });

  async function assist() {
    setError(""); setAiBusy(true);
    try {
      const res = await fetch("/api/ai/decision-assist", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: pid, draft: { title: f.title, subsystem: scope.subsystems.find((s) => s.id === f.subsystem_id)?.name ?? "", problem: f.problem, selected_solution: f.selected_solution, reasoning: f.reasoning, alternatives: alts, free_text: free } }),
      });
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? "AI assist failed"); return; }
      setAi(j);
    } catch { setError("Couldn't reach the AI service."); } finally { setAiBusy(false); }
  }
  function applyOrganized() {
    if (!ai) return;
    setF((p) => ({ ...p, problem: ai.organized.problem || p.problem, selected_solution: ai.organized.selected_solution || p.selected_solution, reasoning: ai.organized.reasoning || p.reasoning }));
    if (ai.organized.alternatives.length) setAlts(ai.organized.alternatives);
    toast.success("Organized text applied — review it before saving.");
  }

  async function save() {
    setError("");
    if (!pid) return setError("Choose a project.");
    setBusy(true);
    const evidence = [
      ...Object.entries(ev).map(([k, note]) => { const [kind, id] = k.split(":"); return { kind: kind as "research" | "revision" | "file", research_id: kind === "research" ? id : null, revision_id: kind === "revision" ? id : null, file_id: kind === "file" ? id : null, note }; }),
      ...sims.filter((s) => s.trim()).map((note) => ({ kind: "simulation" as const, note })),
    ];
    const r = await act(saveDecision(decision?.id ?? null, { project_id: pid, ...f, subsystem_id: f.subsystem_id || null, alternatives: alts.filter((a) => a.name.trim()) }, evidence), decision ? "Decision updated" : "Decision saved");
    setBusy(false);
    if (r.ok) { onClose(); router.refresh(); } else setError(r.error);
  }

  const check = (k: string, label: string, sub?: string) => (
    <li key={k} className="rounded-md border border-border p-2">
      <label className="flex cursor-pointer items-start gap-2 text-[13px]"><input type="checkbox" className="mt-0.5 accent-[var(--accent)]" checked={k in ev} onChange={() => toggle(k)} /><span><span className="font-medium">{label}</span>{sub && <span className="ml-1.5 text-xs text-muted-foreground">{sub}</span>}</span></label>
      {k in ev && <Input className="mt-2 h-8" placeholder="How does this support the decision?" value={ev[k]} onChange={(e) => setEv((p) => ({ ...p, [k]: e.target.value }))} />}
    </li>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent wide title={decision ? "Edit design decision" : "Document a design decision"} description="Capture the problem, the choice, the alternatives and the evidence.">
        <div className="space-y-5">
          <div className="rounded-lg border border-accent/25 bg-accent-soft/40 p-3.5">
            <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold"><Sparkles className="h-4 w-4 text-accent" />AI decision assistant</div>
            <Textarea value={free} onChange={(e) => setFree(e.target.value)} className="min-h-[64px] bg-surface" placeholder='Explain the decision informally, e.g. "We changed the suspension geometry because the previous design had too much body roll."' />
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Button size="sm" variant="accent" onClick={assist} loading={aiBusy} disabled={!aiEnabled}><Sparkles className="h-3.5 w-3.5" />Organize &amp; find gaps</Button>
              {!aiEnabled ? <span className="text-xs text-warning">OPENAI_API_KEY isn&apos;t configured — AI assistance is off.</span> : <span className="text-xs text-muted-foreground">Works only from what you write and this project&apos;s records. It never invents results.</span>}
            </div>
            {ai && (
              <div className="mt-3 space-y-3 border-t border-accent/20 pt-3 text-[13px]">
                {ai.summary && <p><span className="font-medium">Summary: </span>{ai.summary}</p>}
                <Button size="sm" variant="outline" onClick={applyOrganized}>Apply organized text to the form</Button>
                {ai.missing.length > 0 && <div><p className="mb-1 font-medium text-warning">Missing information</p><ul className="space-y-1">{ai.missing.map((m, i) => <li key={i} className="flex gap-2 text-xs"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" /><span><span className="font-medium capitalize">{m.field.replace(/_/g, " ")}:</span> {m.question}</span></li>)}</ul></div>}
                {ai.questions.length > 0 && <div><p className="mb-1 font-medium">Questions a future engineer will ask</p><ul className="list-disc space-y-0.5 pl-5 text-xs text-foreground">{ai.questions.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
                {ai.suggested_evidence.length > 0 && <div><p className="mb-1 font-medium">Possibly related records <span className="font-normal text-muted-foreground">(you decide whether they support it)</span></p>
                  <ul className="space-y-1.5">{ai.suggested_evidence.map((s) => { const key = `${s.kind}:${s.id}`; const on = key in ev; return <li key={key} className="flex items-start justify-between gap-2 rounded-md bg-surface p-2 text-xs"><span><span className="font-medium">{s.title}</span> <span className="text-muted-foreground">— {s.why}</span></span><Button size="sm" variant={on ? "outline" : "accent"} onClick={() => on ? toggle(key) : setEv((p) => ({ ...p, [key]: s.why }))}>{on ? "Linked" : "Link"}</Button></li>; })}</ul></div>}
              </div>)}
          </div>

          <Field label="Decision title" required><Input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Switch to double-wishbone suspension" /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            {!projectId && <Field label="Project" required><Select value={pid} onChange={(e) => { setPid(e.target.value); set("subsystem_id", ""); setEv({}); }}>{scope.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>}
            <Field label="Subsystem"><Select value={f.subsystem_id} onChange={(e) => set("subsystem_id", e.target.value)}><option value="">None</option>{scope.subsystems.filter((s) => s.project_id === pid).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
            <Field label="Status"><Select value={f.status} onChange={(e) => set("status", e.target.value)}>{Object.entries(DECISION_STATUS).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}</Select></Field>
            <Field label="Date"><Input type="date" value={f.decided_on} onChange={(e) => set("decided_on", e.target.value)} /></Field>
          </div>
          <Field label="Problem being addressed" required><Textarea value={f.problem} onChange={(e) => set("problem", e.target.value)} /></Field>
          <Field label="Selected solution" required><Textarea value={f.selected_solution} onChange={(e) => set("selected_solution", e.target.value)} /></Field>
          <Field label="Alternatives considered">
            <div className="space-y-2">
              {alts.map((a, i) => (
                <div key={i} className="flex gap-2"><Input value={a.name} onChange={(e) => setAlts(alts.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Alternative" className="w-2/5" />
                  <Input value={a.reason_rejected} onChange={(e) => setAlts(alts.map((x, j) => j === i ? { ...x, reason_rejected: e.target.value } : x))} placeholder="Why it was rejected" />
                  <Button variant="ghost" size="icon" aria-label="Remove alternative" onClick={() => setAlts(alts.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button></div>))}
              <Button size="sm" variant="outline" onClick={() => setAlts([...alts, { name: "", reason_rejected: "" }])}><Plus className="h-3.5 w-3.5" />Add alternative</Button>
            </div>
          </Field>
          <Field label="Reasoning" hint="Why this solution over the alternatives?"><Textarea value={f.reasoning} onChange={(e) => set("reasoning", e.target.value)} className="min-h-[100px]" /></Field>

          <div>
            <p className="mb-2 text-xs font-medium text-foreground">Supporting evidence</p>
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <div><p className="mb-1.5 text-xs font-semibold text-muted-foreground">Research</p>{research.length === 0 ? <p className="text-xs text-muted-foreground">No research in this project yet.</p> : <ul className="space-y-1.5">{research.map((r) => check(`research:${r.id}`, r.title))}</ul>}</div>
              <div><p className="mb-1.5 text-xs font-semibold text-muted-foreground">Relevant CAD / design revisions</p>{revisions.length === 0 ? <p className="text-xs text-muted-foreground">No revisions yet.</p> : <ul className="space-y-1.5">{revisions.map((r) => check(`revision:${r.id}`, `${r.rev_label} — ${r.title}`))}</ul>}</div>
              <div><p className="mb-1.5 text-xs font-semibold text-muted-foreground">Files (CAD screenshots, calculations, FEA / CFD results)</p>{files.length === 0 ? <p className="text-xs text-muted-foreground">No files yet.</p> : <ul className="space-y-1.5">{files.map((x) => check(`file:${x.id}`, x.name, x.category.replace("_", " ")))}</ul>}</div>
              <div><p className="mb-1.5 text-xs font-semibold text-muted-foreground">Simulation evidence notes</p>
                <div className="space-y-1.5">{sims.map((s, i) => <div key={i} className="flex gap-2"><Input value={s} onChange={(e) => setSims(sims.map((x, j) => j === i ? e.target.value : x))} placeholder="What simulation was run and what did it show — or note that none was run" /><Button variant="ghost" size="icon" aria-label="Remove note" onClick={() => setSims(sims.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button></div>)}
                  <Button size="sm" variant="outline" onClick={() => setSims([...sims, ""])}><Plus className="h-3.5 w-3.5" />Add simulation note</Button></div></div>
            </div>
          </div>
          {error && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="accent" loading={busy} onClick={save}>{decision ? "Save changes" : "Save decision"}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

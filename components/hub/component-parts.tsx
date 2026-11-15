"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadModelParts } from "@/lib/cad/model-parts-cache";
import type { Decision, Research } from "@/lib/types";

type Part = { key: string; name: string };

function demoDescription(name: string): string | null {
  const n = name.toUpperCase().replace(/_/g, " ");
  if (n.includes("NOSECONE")) return "The shaped front section of the bodywork, positioned at the nose of the assembly.";
  if (n.includes("FAIRING")) return "A shaped bodywork surface that surrounds or smooths part of the assembly.";
  if (n.includes("ENDPLATE") && n.includes("SKIN")) return "A surface layer on a wing endplate, located at the side of the wing assembly.";
  if (n.includes("ENDPLATE") && n.includes("CORE")) return "The inner core of a wing endplate, between its outer layers.";
  if (n.includes("ENDPLATE") && n.includes("INSERT")) return "An insert associated with the wing endplate; its exact attachment role is not documented.";
  if (n.includes("ENDPLATE")) return "A plate at the side of a wing element; its exact design purpose is not documented here.";
  if (n.includes("TOP SKIN") || n.includes("BOTTOM SKIN")) return `A ${n.includes("TOP") ? "top" : "bottom"} surface layer of an aerodynamic element.`;
  if (n.includes("RIB")) return "An internal rib in an aerodynamic assembly, shown between the outer surfaces.";
  if (n.includes("TRUSS")) return "A truss-shaped support within the aerodynamic assembly.";
  if (n.includes("STRUT")) return "A slender structural support in the aerodynamic assembly.";
  if (n.includes("STIFFENER")) return "A stiffening member in the assembly; its exact load path is not documented.";
  if (n.includes("CLEVIS")) return "A clevis-shaped attachment used to connect members of the assembly.";
  if (n.includes("MOUNT") || n.includes("BRACKET") || n.includes("TAB")) return "An attachment feature connecting parts of the assembly; its exact role is not documented.";
  if (n.includes("BUNG")) return "An end fitting associated with a structural member; its exact role is not documented.";
  return null;
}

export function ComponentParts({ projectId, componentId, initialPart, model, links, loadError, decisions, research }: {
  projectId: string; componentId: string; initialPart: string; model: { path: string; name: string };
  links: { part_key: string; subsystem_id: string }[]; loadError: boolean; decisions: Decision[]; research: Research[];
}) {
  const [parts, setParts] = useState<Part[]>([]);
  const [selected, setSelected] = useState(initialPart);
  const [error, setError] = useState(loadError ? "Part assignments could not be loaded." : "");
  const [loading, setLoading] = useState(!loadError);
  const keys = JSON.stringify(links.map((link) => link.part_key));
  useEffect(() => {
    if (loadError) return;
    let live = true;
    const allowed = new Set<string>(JSON.parse(keys));
    // Shared with the Parts list on the same page, so the model is downloaded and parsed once.
    loadModelParts(model.path)
      .then((all) => { if (live) setParts(all.filter((part) => allowed.has(part.key))); })
      .catch(() => { if (live) setError("Model parts could not be loaded. Please return to the project and try again."); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [model.path, keys, loadError]);
  const part = parts.find((item) => item.key === selected);
  const demo = model.name.toLowerCase() === "f26-aer-0000-501.glb" && (projectId === "f2110fcf-2834-4f9a-85a8-81f3b18386a6" || model.path === `${projectId}/judge-demo/aero.glb`);
  const description = part && demo ? demoDescription(part.name) : null;
  const base = `/projects/${projectId}`;
  return <section className="rounded-lg border border-border bg-surface p-5 shadow-card" aria-label="Selected model part">
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Selected model part</p>
    {loading ? <p className="mt-3 text-sm text-muted-foreground">Loading model parts…</p> : error ? <p role="alert" className="mt-3 text-sm text-warning">{error}</p> : !part ? <p className="mt-3 text-sm text-muted-foreground">This part is no longer linked to this component, or the model has changed.</p> : <>
      <h3 className="mt-2 text-lg font-semibold">{part.name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description ?? "A description of this part’s purpose has not been recorded."}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground">Illustrative description based on the demo model; not verified engineering information.</p>}
      <details open className="mt-4 rounded-lg border border-border p-3"><summary className="cursor-pointer text-sm font-medium">Why this design?</summary><p className="mt-2 text-xs text-muted-foreground">These decisions are recorded for the component as a whole.</p>{decisions.length ? <ul className="mt-2 space-y-3">{decisions.map((d) => <li key={d.id}><p className="text-sm font-medium">{d.title}</p><p className="mt-1 text-sm text-muted-foreground">{d.reasoning || "No reasoning recorded."}</p></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No design decisions recorded yet.</p>}<Link href={`${base}/components/${componentId}?tab=decisions`} className="mt-2 inline-block text-xs text-accent hover:underline">View component decisions</Link></details>
      <details className="mt-2 rounded-lg border border-border p-3"><summary className="cursor-pointer text-sm font-medium">Research links</summary><p className="mt-2 text-xs text-muted-foreground">Research associated with this component.</p>{research.length ? <ul className="mt-2 space-y-2">{research.map((r) => <li key={r.id}><Link className="text-sm text-accent hover:underline" href={`${base}/research?open=${r.id}`}>{r.title}</Link>{r.why_important && <p className="mt-0.5 text-xs text-muted-foreground">{r.why_important}</p>}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No research recorded for this component yet.</p>}</details>
      <details className="mt-2 rounded-lg border border-border p-3"><summary className="cursor-pointer text-sm font-medium">Other parts in this component ({parts.length})</summary><label className="mt-3 block text-xs text-muted-foreground">Select a part<select aria-label="Select another part in this component" value={selected} onChange={(event) => setSelected(event.target.value)} className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">{parts.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</select></label></details>
    </>}
  </section>;
}

import type { Material, Part, PartKind, Unit } from "./types";

export const UNIT_MM: Record<Unit, number> = { mm: 1, cm: 10, in: 25.4 };
export const UNIT_DECIMALS: Record<Unit, number> = { mm: 1, cm: 2, in: 3 };

export function toUnit(mm: number, unit: Unit) { return mm / UNIT_MM[unit]; }
export function fromUnit(v: number, unit: Unit) { return v * UNIT_MM[unit]; }
export function fmt(mm: number, unit: Unit) {
  return String(Number(toUnit(mm, unit).toFixed(UNIT_DECIMALS[unit] + 1)));
}

export const newId = () => globalThis.crypto.randomUUID();

export const childrenOf = (parts: Part[], id: string | null) => parts.filter((p) => p.parentId === id);

export function descendantIds(parts: Part[], id: string): Set<string> {
  const out = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const p of parts) if (p.parentId && out.has(p.parentId) && !out.has(p.id)) { out.add(p.id); grew = true; }
  }
  return out;
}

export function ancestorIds(parts: Part[], id: string): string[] {
  const byId = new Map(parts.map((p) => [p.id, p]));
  const out: string[] = [];
  let cur = byId.get(id)?.parentId ?? null;
  while (cur) { out.push(cur); cur = byId.get(cur)?.parentId ?? null; }
  return out;
}

export function deletePart(parts: Part[], id: string): Part[] {
  const gone = descendantIds(parts, id);
  return parts.filter((p) => !gone.has(p.id));
}

/** Deep-copies a part and its descendants with fresh ids. The copy is offset so it doesn't sit on the original. */
export function duplicatePart(parts: Part[], id: string): { parts: Part[]; newId: string } {
  const src = parts.find((p) => p.id === id);
  if (!src) return { parts, newId: id };
  const ids = descendantIds(parts, id);
  const map = new Map<string, string>();
  ids.forEach((old) => map.set(old, newId()));
  const copies = parts.filter((p) => ids.has(p.id)).map((p) => ({
    ...p, id: map.get(p.id)!, parentId: p.id === id ? p.parentId : map.get(p.parentId!)!,
    name: p.id === id ? `${p.name} copy` : p.name,
    position: p.id === id ? ([p.position[0] + 20, p.position[1], p.position[2]] as Part["position"]) : p.position,
    params: { ...p.params }, material: { ...p.material },
  }));
  return { parts: [...parts, ...copies], newId: map.get(id)! };
}

export const DEFAULT_MATERIAL: Material = { color: "#aeb7c2", metalness: 0.7, roughness: 0.4, opacity: 1 };

export function makePrimitive(kind: Exclude<PartKind, "group">, count: number): Part {
  const params: Record<string, number> = kind === "box" ? { w: 40, h: 40, d: 40 } : kind === "cylinder" ? { r: 20, h: 50 } : { r: 25 };
  const half = kind === "box" ? 20 : kind === "cylinder" ? 25 : 25;
  return {
    id: newId(), parentId: null, name: `${kind[0].toUpperCase()}${kind.slice(1)} ${count}`, kind, params,
    position: [0, half, 0], rotation: [0, 0, 0], material: { ...DEFAULT_MATERIAL }, visible: true, subsystemId: null,
  };
}

/** Exact volume of a single primitive in mm³ (analytic, before any scaling). Groups have no volume of their own. */
export function volumeMm3(p: Part): number {
  if (p.kind === "box") return p.params.w * p.params.h * p.params.d;
  if (p.kind === "cylinder") return Math.PI * p.params.r ** 2 * p.params.h;
  if (p.kind === "sphere") return (4 / 3) * Math.PI * p.params.r ** 3;
  return 0;
}

/** Sum of primitive volumes under a part. Overlapping parts are double-counted: this is not a boolean union. */
export function totalVolume(parts: Part[], id?: string): number {
  const ids = id ? descendantIds(parts, id) : null;
  return parts.filter((p) => !ids || ids.has(p.id)).reduce((s, p) => s + volumeMm3(p), 0);
}

export function dimsLabel(p: Part, unit: Unit): string {
  const f = (v: number) => fmt(v, unit);
  if (p.kind === "box") return `${f(p.params.w)} × ${f(p.params.h)} × ${f(p.params.d)} ${unit}`;
  if (p.kind === "cylinder") return `Ø${f(p.params.r * 2)} × ${f(p.params.h)} ${unit}`;
  if (p.kind === "sphere") return `Ø${f(p.params.r * 2)} ${unit}`;
  return "Group";
}

export const KIND_LABEL: Record<PartKind, string> = { group: "Group", box: "Box", cylinder: "Cylinder", sphere: "Sphere" };

export function validateParts(raw: unknown): Part[] | null {
  if (!Array.isArray(raw)) return null;
  const ids = new Set(raw.map((p) => p?.id));
  return raw.every((p) => p && typeof p.id === "string" && typeof p.name === "string" && ["group", "box", "cylinder", "sphere"].includes(p.kind) && (p.parentId === null || ids.has(p.parentId))) ? (raw as Part[]) : null;
}

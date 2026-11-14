import * as THREE from "three";
import { descendantIds } from "./ops";
import type { Part } from "./types";

const rad = (d: number) => (d * Math.PI) / 180;

/** World-space axis-aligned bounds of the visible primitives (optionally limited to one part and its descendants). */
export function worldBox(parts: Part[], rootId?: string): THREE.Box3 {
  const byId = new Map(parts.map((p) => [p.id, p]));
  const only = rootId ? descendantIds(parts, rootId) : null;
  const box = new THREE.Box3();
  const matrices = new Map<string, THREE.Matrix4>();
  const world = (p: Part): THREE.Matrix4 => {
    const cached = matrices.get(p.id);
    if (cached) return cached;
    const local = new THREE.Matrix4().compose(new THREE.Vector3(...p.position), new THREE.Quaternion().setFromEuler(new THREE.Euler(rad(p.rotation[0]), rad(p.rotation[1]), rad(p.rotation[2]))), new THREE.Vector3(1, 1, 1));
    const parent = p.parentId ? byId.get(p.parentId) : null;
    const m = parent ? world(parent).clone().multiply(local) : local;
    matrices.set(p.id, m);
    return m;
  };
  const visible = (p: Part): boolean => p.visible && (!p.parentId || (byId.get(p.parentId) ? visible(byId.get(p.parentId)!) : true));
  for (const p of parts) {
    if (p.kind === "group" || (only && !only.has(p.id)) || !visible(p)) continue;
    const h = p.kind === "box" ? [p.params.w / 2, p.params.h / 2, p.params.d / 2] : p.kind === "cylinder" ? [p.params.r, p.params.h / 2, p.params.r] : [p.params.r, p.params.r, p.params.r];
    const m = world(p);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) box.expandByPoint(new THREE.Vector3(sx * h[0], sy * h[1], sz * h[2]).applyMatrix4(m));
  }
  return box;
}

export function boxSize(box: THREE.Box3): [number, number, number] | null {
  if (box.isEmpty()) return null;
  const s = box.getSize(new THREE.Vector3());
  return [s.x, s.y, s.z];
}

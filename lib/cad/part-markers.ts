import { Vector3 } from "three";
import { worldBox } from "./bounds";
import type { Part, Vec3 } from "./types";

/** Construct labels and marker positions from the project's saved model parts. */
export function modelPartEntries(parts: Part[]) {
  const byId = new Map(parts.map((part) => [part.id, part]));
  return parts.filter((part) => part.kind !== "group").map((part) => {
    const parents: string[] = [];
    const visited = new Set([part.id]);
    let parent = part.parentId ? byId.get(part.parentId) : undefined;
    while (parent && !visited.has(parent.id)) {
      visited.add(parent.id);
      parents.unshift(parent.name);
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
    const bounds = worldBox(parts, part.id);
    const center = bounds.getCenter(new Vector3());
    const marker: Vec3 | null = bounds.isEmpty() ? null : [center.x, bounds.max.y + 3, center.z];
    return { part, name: [...parents, part.name].join(" / "), marker };
  });
}

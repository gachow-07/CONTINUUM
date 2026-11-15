/**
 * Counts the selectable parts in a GLB without loading the model: only the 20-byte header and the JSON chunk are read
 * (with HTTP range requests when the server supports them). A part is one triangle primitive of a mesh reachable from
 * the default scene, which is what the 3D viewer's importedParts() enumerates after loading.
 */
type GltfJson = {
  scene?: number; scenes?: { nodes?: number[] }[];
  nodes?: { mesh?: number; children?: number[] }[];
  meshes?: { primitives?: { mode?: number }[] }[];
};

export async function glbPartCount(url: string, signal?: AbortSignal): Promise<number> {
  const head = await fetch(url, { headers: { Range: "bytes=0-19" }, signal });
  if (!head.ok) throw new Error("Could not read the model.");
  const start = await head.arrayBuffer();
  if (start.byteLength < 20) throw new Error("This is not a GLB model.");
  const view = new DataView(start);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(16, true) !== 0x4e4f534a) throw new Error("This is not a GLB model.");
  const jsonLength = view.getUint32(12, true);
  // A server that ignores Range sends the whole file, which already contains the JSON chunk.
  const json = head.status === 206 && start.byteLength < 20 + jsonLength
    ? await (await fetch(url, { headers: { Range: `bytes=20-${20 + jsonLength - 1}` }, signal })).arrayBuffer()
    : start.slice(20, 20 + jsonLength);
  return countParts(JSON.parse(new TextDecoder().decode(json)) as GltfJson);
}

export function countParts(gltf: GltfJson): number {
  const nodes = gltf.nodes ?? [];
  const roots = gltf.scenes?.[gltf.scene ?? 0]?.nodes ?? [];
  let count = 0;
  const seen = new Set<string>();
  const walk = (index: number, path: string) => {
    if (seen.has(path) || path.split("/").length > 64) return; // guards against malformed cyclic node graphs
    seen.add(path);
    const node = nodes[index];
    if (!node) return;
    if (node.mesh !== undefined) {
      // Modes 4-6 are triangles, strips and fans: the viewer turns each into a selectable mesh. Points and lines are not parts.
      count += (gltf.meshes?.[node.mesh]?.primitives ?? []).filter((p) => p.mode === undefined || p.mode >= 4).length;
    }
    (node.children ?? []).forEach((child, i) => walk(child, `${path}/${i}`));
  };
  roots.forEach((root, i) => walk(root, `root/${i}`));
  return count;
}

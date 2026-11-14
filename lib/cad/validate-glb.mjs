/** GLB must carry all its own data; do not fetch arbitrary external resources. */
/** @param {ArrayBuffer} data */
export function validateGlb(data) {
  if (data.byteLength < 20) throw new Error("This file is too small to be a GLB model.");
  const view = new DataView(data);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== data.byteLength) throw new Error("This is not a valid GLB 2.0 file.");
  const length = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a || length > data.byteLength - 20) throw new Error("The GLB model is incomplete.");
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(data, 20, length)));
  for (const item of [...(json.buffers ?? []), ...(json.images ?? [])]) {
    if (typeof item.uri === "string" && !item.uri.startsWith("data:")) throw new Error("Export a self-contained GLB with embedded textures and data.");
  }
}


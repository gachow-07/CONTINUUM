import { test } from "node:test";
import assert from "node:assert/strict";
import { validateGlb } from "../lib/cad/validate-glb.mjs";

function glb(json) {
  const text = JSON.stringify(json);
  const length = Math.ceil(text.length / 4) * 4;
  const data = new ArrayBuffer(20 + length);
  const view = new DataView(data);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, data.byteLength, true);
  view.setUint32(12, length, true);
  view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(data, 20).set(new TextEncoder().encode(text.padEnd(length)));
  return data;
}

test("accepts a self-contained GLB and embedded textures", () => {
  assert.doesNotThrow(() => validateGlb(glb({ asset: { version: "2.0" }, images: [{ uri: "data:image/png;base64,AAAA" }] })));
});
test("rejects external model resources", () => {
  assert.throws(() => validateGlb(glb({ buffers: [{ uri: "https://example.com/a.bin" }] })), /self-contained/);
  assert.throws(() => validateGlb(glb({ images: [{ uri: "texture.png" }] })), /self-contained/);
});
test("rejects invalid and truncated headers", () => {
  assert.throws(() => validateGlb(new ArrayBuffer(4)), /too small/);
  const data = glb({});
  new DataView(data).setUint32(8, 4000, true);
  assert.throws(() => validateGlb(data), /valid GLB/);
});

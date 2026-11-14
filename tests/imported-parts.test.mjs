import { test } from "node:test";
import assert from "node:assert/strict";
import { importedParts } from "../lib/cad/imported-parts.mjs";

test("uses distinct stable paths when CAD parts have duplicate names", () => {
  const tree = { children: [{ name: "Suspension", children: [{ name: "", isMesh: true }, { name: "", isMesh: true }] }, { name: "Wheel", isMesh: true }] };
  assert.deepEqual(importedParts(tree).map(({ key, name }) => ({ key, name })), [
    { key: "root/0/0", name: "Suspension" }, { key: "root/0/1", name: "Suspension" }, { key: "root/1", name: "Wheel" },
  ]);
});
test("unnamed meshes get a usable label", () => {
  assert.equal(importedParts({ children: [{ isMesh: true }] })[0].name, "Part 1");
});

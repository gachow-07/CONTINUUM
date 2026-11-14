import { test } from "node:test";
import assert from "node:assert/strict";
import { imageMime } from "../lib/ai/image-format.mjs";

test("recognizes the supported image signatures", () => {
  assert.equal(imageMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  assert.equal(imageMime(Buffer.from([0xff, 0xd8, 0xff, 0x00])), "image/jpeg");
  assert.equal(imageMime(Buffer.from("RIFF0000WEBP")), "image/webp");
  assert.equal(imageMime(Buffer.from("GIF89a")), "image/gif");
});

test("rejects unsupported or truncated data even when it resembles an image", () => {
  assert.equal(imageMime(Buffer.from("<svg></svg>")), null);
  assert.equal(imageMime(Buffer.from([0x89, 0x50, 0x4e, 0x47])), null);
  assert.equal(imageMime(Buffer.from("RIFF0000WAVE")), null);
  assert.equal(imageMime(Buffer.alloc(0)), null);
});

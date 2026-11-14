import { test } from "node:test";
import assert from "node:assert/strict";
import { readResearchDraft } from "../lib/research-draft.mjs";

test("restores a research draft without losing its form fields", () => {
  const draft = { mode: "url", pid: "project", url: "https://example.org/paper", meta: { title: "Paper", site_name: "Journal", description: "Summary" }, kind: "paper", noteText: "", title: "", desc: "", sub: "component", tags: "suspension", why: "Why this matters" };
  const storage = { getItem: (key) => key === "draft" ? JSON.stringify(draft) : null };
  assert.deepEqual(readResearchDraft(storage, "draft"), draft);
  assert.equal(readResearchDraft(storage, "another-project"), null);
});

test("ignores malformed drafts and unavailable browser storage", () => {
  assert.equal(readResearchDraft({ getItem: () => "not json" }, "draft"), null);
  assert.equal(readResearchDraft({ getItem: () => JSON.stringify({ mode: "url" }) }, "draft"), null);
  assert.equal(readResearchDraft({ getItem: () => { throw new Error("blocked"); } }, "draft"), null);
});

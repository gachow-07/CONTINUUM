import { test } from "node:test";
import assert from "node:assert/strict";
import { actionErrorMessage, DEPLOYMENT_CHANGED_MESSAGE, isDeploymentChangedError } from "../lib/action-error.mjs";

test("recognizes old deployment messages and hides internal action identifiers", () => {
  assert.equal(actionErrorMessage('Server Action "abc123" was not found on the server. Read more: https://nextjs.org/docs/messages/failed-to-find-server-action'), DEPLOYMENT_CHANGED_MESSAGE);
  assert.equal(actionErrorMessage('Failed to find Server Action "abc123"'), DEPLOYMENT_CHANGED_MESSAGE);
  assert.equal(isDeploymentChangedError(DEPLOYMENT_CHANGED_MESSAGE), true);
});

test("preserves unrelated errors for diagnosis", () => {
  assert.equal(actionErrorMessage("Permission denied"), "Permission denied");
  assert.equal(isDeploymentChangedError("Network request failed"), false);
});

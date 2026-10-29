import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeAppName, confirmedAppName } from "../src/profile.js";
test("App names are normalized and support international nicknames", () => {
  assert.equal(normalizeAppName("  Quiet   fern  "), "Quiet fern");
  assert.equal(normalizeAppName("নীল পাখি"), "নীল পাখি");
  for (const value of [
    "",
    "x",
    "a".repeat(41),
    "email@example.test",
    "bad\u0000name",
    12,
  ])
    assert.throws(() => normalizeAppName(value));
});
test("Unconfirmed Google profiles never become app identity", () => {
  assert.equal(confirmedAppName({ displayName: "Google Real Name" }), "");
  assert.equal(
    confirmedAppName({ displayName: "Google Real Name", nameConfirmed: false }),
    "",
  );
  assert.equal(
    confirmedAppName({ displayName: "Quiet fern", nameConfirmed: true }),
    "Quiet fern",
  );
  assert.equal(confirmedAppName({ displayName: "x", nameConfirmed: true }), "");
});

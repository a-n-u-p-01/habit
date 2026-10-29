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

import { buildProfilePayload, profileSaveMessage } from "../src/profile.js";
test("New app profiles contain only allowed fields and a creation timestamp", () => {
  const timestamp = { server: "timestamp" };
  const payload = buildProfilePayload({
    name: " Quiet fern ",
    photoURL: "",
    existing: null,
    timestamp,
  });
  assert.deepEqual(
    Object.keys(payload).sort(),
    [
      "createdAt",
      "displayName",
      "nameConfirmed",
      "photoURL",
      "updatedAt",
    ].sort(),
  );
  assert.equal(payload.displayName, "Quiet fern");
  assert.equal(payload.createdAt, timestamp);
});
test("Saving legacy profiles removes unsupported provider fields instead of merging them", () => {
  const existing = {
    displayName: "Old provider name",
    email: "old@example.test",
    phoneNumber: "legacy",
    nameConfirmed: false,
    photoURL: "",
  };
  const payload = buildProfilePayload({
    name: "Quiet fern",
    photoURL: "",
    existing,
    timestamp: 123,
  });
  assert.deepEqual(
    Object.keys(payload).sort(),
    ["displayName", "nameConfirmed", "photoURL", "updatedAt"].sort(),
  );
  assert.equal(Object.hasOwn(payload, "email"), false);
  assert.equal(Object.hasOwn(payload, "createdAt"), false);
  assert.equal(existing.email, "old@example.test");
});
test("Profile edits preserve the exact original join date while removing unsupported fields", () => {
  const createdAt = { original: "timestamp" };
  const payload = buildProfilePayload({
    name: "New nickname",
    photoURL: "https://lh3.googleusercontent.com/a/photo",
    existing: { createdAt, email: "old@example.test" },
    timestamp: 456,
  });
  assert.equal(payload.createdAt, createdAt);
  assert.equal(payload.updatedAt, 456);
  assert.equal(Object.hasOwn(payload, "email"), false);
});
test("Profile payloads validate names and do not persist arbitrary photo URLs", () => {
  assert.throws(() =>
    buildProfilePayload({
      name: "email@example.test",
      existing: null,
      timestamp: 1,
    }),
  );
  assert.equal(
    buildProfilePayload({
      name: "Quiet fern",
      photoURL: "https://example.test/photo",
      existing: {},
      timestamp: 1,
    }).photoURL,
    "",
  );
});
test("Profile errors distinguish access settings from connection and validation errors", () => {
  assert.match(
    profileSaveMessage({ code: "permission-denied" }),
    /access settings/,
  );
  assert.match(
    profileSaveMessage({ code: "firestore/permission-denied" }),
    /access settings/,
  );
  assert.match(profileSaveMessage({ code: "unavailable" }), /connection/);
  assert.equal(
    profileSaveMessage(Error("Choose a longer name.")),
    "Choose a longer name.",
  );
});

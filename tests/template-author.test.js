import { test } from "node:test";
import assert from "node:assert/strict";
import { templateAuthorName } from "../src/template-author.js";
const user = { uid: "me", displayName: "Quiet fern" };
test("Community details use the saved author username, never the viewer name", () => {
  assert.equal(
    templateAuthorName({ authorId: "other", authorName: "Moss trail" }, user),
    "Moss trail",
  );
});
test("Own private templates use the current chosen username even without copied metadata", () => {
  assert.equal(templateAuthorName({ id: "private" }, user, true), "Quiet fern");
  assert.equal(
    templateAuthorName(
      { id: "private", authorName: "Original creator" },
      user,
      true,
    ),
    "Quiet fern",
  );
});
test("Own public templates use the current app username after a rename", () => {
  assert.equal(
    templateAuthorName({ authorId: "me", authorName: "Old nickname" }, user),
    "Quiet fern",
  );
});
test("Missing historical attribution is explicit, not a fabricated username", () => {
  assert.equal(
    templateAuthorName({ authorId: "other" }, user),
    "Author unavailable",
  );
  assert.equal(
    templateAuthorName({ authorName: "  Moss trail  " }, null),
    "Moss trail",
  );
});
test("Built-in templates are attributed to the app, not a user", () => {
  assert.equal(templateAuthorName({ starter: true }, user), "Win Today");
});
test("Guest private copies do not inherit an unrelated author identity", () => {
  assert.equal(
    templateAuthorName({ authorName: "Original creator" }, null, true),
    "You",
  );
});

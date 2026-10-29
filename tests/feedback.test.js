import { test } from "node:test";
import assert from "node:assert/strict";
import { selectFeedback, feedbackPage, feedbackTime } from "../src/feedback.js";
const rows = [
  {
    id: "a",
    title: "Save problem",
    message: "Unable to save",
    type: "report",
    status: "open",
    authorName: "Fern",
    authorId: "u1",
    createdAt: 1000,
    updatedAt: 4000,
  },
  {
    id: "b",
    title: "Add reminders",
    message: "A daily nudge",
    type: "suggestion",
    status: "resolved",
    authorName: "Aster",
    authorId: "u2",
    createdAt: 2000,
    updatedAt: 3000,
  },
  {
    id: "c",
    title: "Better colors",
    type: "suggestion",
    status: "in_progress",
    authorName: "Moss",
    authorId: "u3",
  },
];
test("Feedback search finds title, message, author, author ID and submission ID", () => {
  for (const [search, id] of [
    ["SAVE", "a"],
    ["daily nudge", "b"],
    ["fern", "a"],
    ["u3", "c"],
    [" u2 ", "b"],
  ])
    assert.deepEqual(
      selectFeedback(rows, { search }).map((r) => r.id),
      [id],
    );
});
test("Submission IDs are searchable", () => {
  assert.equal(
    selectFeedback([{ id: "ticket-xyz" }], { search: "ticket-xyz" }).length,
    1,
  );
});
test("Feedback type, status and search filters combine", () => {
  assert.deepEqual(
    selectFeedback(rows, {
      status: "resolved",
      type: "suggestion",
      search: "aster",
    }).map((r) => r.id),
    ["b"],
  );
  assert.equal(
    selectFeedback(rows, { status: "open", type: "suggestion" }).length,
    0,
  );
});
test("Feedback sorts by created, updated, title and author without mutating data", () => {
  for (const [sort, ids] of [
    ["newest", ["b", "a", "c"]],
    ["oldest", ["a", "b", "c"]],
    ["updated", ["a", "b", "c"]],
    ["title", ["b", "c", "a"]],
    ["author", ["b", "a", "c"]],
  ])
    assert.deepEqual(
      selectFeedback(rows, { sort }).map((r) => r.id),
      ids,
    );
  assert.equal(rows[0].id, "a");
});
test("Feedback pagination clamps after filtering and realtime removals", () => {
  const many = Array.from({ length: 26 }, (_, id) => ({ id }));
  assert.equal(feedbackPage(many, 2, 10).rows[0].id, 10);
  assert.equal(feedbackPage(many, 100, 10).current, 3);
  assert.equal(feedbackPage(many, 2, 25).end, 26);
  assert.deepEqual(feedbackPage([], 99, 10), {
    rows: [],
    current: 1,
    pages: 1,
    start: 0,
    end: 0,
  });
});
test("Feedback dates support Firestore timestamps and missing legacy values", () => {
  assert.equal(feedbackTime({ toMillis: () => 1234 }), 1234);
  assert.equal(feedbackTime(undefined), 0);
  assert.equal(feedbackTime(NaN), 0);
});

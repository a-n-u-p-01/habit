import { test } from "node:test";
import assert from "node:assert/strict";
import {
  exemplar,
  achieved,
  totalWork,
  validateTask,
  dayStatus,
  scheduled,
  statistics,
  dateKey,
  daysBack,
} from "../src/domain.js";
const task = { ...exemplar, id: "a", createdDay: "2026-10-26", active: true };
const row = (checks = {}) => ({
  id: "2026-10-27_a",
  taskId: "a",
  date: "2026-10-27",
  scheduled: true,
  snapshot: task,
  checks,
});
test("T1 alone wins, without optional T2 or T3", () => {
  assert.equal(achieved(row({ ex1: true, ex2: true })), 1);
  assert.equal(
    dayStatus([task], [row({ ex1: true, ex2: true })], "2026-10-27").dayWon,
    true,
  );
});
test("Cannot jump ahead by checking T2 first", () =>
  assert.equal(achieved(row({ ex3: true, ex4: true, ex5: true })), 0));
test("Incomplete requirements do not award a win", () =>
  assert.equal(achieved(row({ ex1: true })), 0));
test("Total work sums incremental levels rather than replacing them", () => {
  const p = row(
    Object.fromEntries(exemplar.levels.flat().map((r) => [r.id, true])),
  );
  assert.equal(achieved(p), 3);
  const totals = totalWork(p);
  assert.equal(totals.find((t) => t.label === "Push-ups").amount, 20);
  assert.equal(totals.find((t) => t.label === "Squats").amount, 15);
  assert.equal(totals.find((t) => t.label === "Pull-ups").amount, 20);
  assert.equal(totals.find((t) => t.label === "Running").amount, 2);
});
test("No scheduled tasks is a rest day, not a free day won", () =>
  assert.equal(dayStatus([], [], "2026-10-27").dayWon, false));
test("All minimums must be won to win a day", () =>
  assert.equal(
    dayStatus(
      [task, { ...task, id: "b" }],
      [row({ ex1: true, ex2: true })],
      "2026-10-27",
    ).dayWon,
    false,
  ));
test("Historical schedule survives weekday edits", () => {
  const edited = {
    ...task,
    weekdays: [0],
    scheduleHistory: [
      { from: "2026-10-26", weekdays: [1, 2, 3, 4, 5], active: true },
      { from: "2026-10-28", weekdays: [0], active: true },
    ],
  };
  assert.equal(scheduled(edited, "2026-10-27"), true);
  assert.equal(scheduled(edited, "2026-10-28"), false);
});
test("Pausing does not erase historical schedules", () => {
  const paused = {
    ...task,
    active: false,
    scheduleHistory: [
      { from: "2026-10-26", weekdays: [1, 2, 3, 4, 5], active: true },
      { from: "2026-10-28", weekdays: [1, 2, 3, 4, 5], active: false },
    ],
  };
  assert.equal(scheduled(paused, "2026-10-27"), true);
  assert.equal(scheduled(paused, "2026-10-28"), false);
});
test("Stored scheduled sessions remain in denominator after edits", () =>
  assert.equal(dayStatus([], [row({})], "2026-10-27").total, 1));
test("Distribution is exclusive highest level per task-day", () => {
  const p = row(
    Object.fromEntries(exemplar.levels.flat().map((r) => [r.id, true])),
  );
  assert.deepEqual(
    statistics([task], [p], ["2026-10-27"]).distribution,
    [0, 0, 1],
  );
});
test("Reject empty names, zero quantities, duplicate IDs and empty schedules", () => {
  assert.equal(validateTask(task), "");
  assert.ok(validateTask({ ...task, name: "" }));
  assert.ok(validateTask({ ...task, weekdays: [] }));
  const clone = structuredClone(task);
  clone.levels[1][0].amount = 0;
  assert.ok(validateTask(clone));
  clone.levels[1][0].amount = 1;
  clone.levels[1][0].id = "ex1";
  assert.ok(validateTask(clone));
});
test("Local date keys and consecutive day generation", () => {
  assert.equal(dateKey(new Date(2026, 9, 27, 0, 1)), "2026-10-27");
  assert.deepEqual(daysBack(3, new Date(2026, 9, 27)), [
    "2026-10-25",
    "2026-10-26",
    "2026-10-27",
  ]);
});

test("Firestore serialization avoids illegal nested arrays and roundtrips snapshots", async () => {
  const { encodeFirestore, decodeFirestore } =
    await import("../src/serialization.js");
  const data = {
    ...task,
    snapshot: { ...task },
    other: [{ snapshot: { ...task } }],
  };
  const encoded = encodeFirestore(data);
  assert.equal(Array.isArray(encoded.levels), false);
  assert.deepEqual(encoded.levels.t1, task.levels[0]);
  assert.deepEqual(decodeFirestore(encoded), data);
});

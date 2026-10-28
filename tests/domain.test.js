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
test("No scheduled habits is a rest day, not a free day won", () =>
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

test("One click marks all requirements of only the next level", async () => {
  const { completeNextLevel } = await import("../src/domain.js");
  const p = row({});
  const next = completeNextLevel(p, 1);
  assert.equal(achieved(next), 1);
  assert.equal(next.checks.ex1, true);
  assert.equal(next.checks.ex2, true);
  assert.equal(next.checks.ex3, undefined);
  assert.deepEqual(p.checks, {});
});
test("One-click wins retain partial work and add only the remaining target level", async () => {
  const { completeNextLevel } = await import("../src/domain.js");
  const p = row({ ex1: true, ex2: true, ex3: true });
  const next = completeNextLevel(p, 2);
  assert.equal(achieved(next), 2);
  assert.equal(next.checks.ex1, true);
  assert.equal(next.checks.ex3, true);
  assert.equal(next.checks.ex4, true);
  assert.equal(next.checks.ex6, undefined);
});
test("Retrying a won tier is idempotent and cannot accidentally win the next one", async () => {
  const { completeNextLevel } = await import("../src/domain.js");
  const p = row({ ex1: true, ex2: true });
  assert.equal(completeNextLevel(p, 1), p);
  assert.equal(achieved(completeNextLevel(p, 1)), 1);
});
test("One-click tier action cannot skip T1 or jump from T1 to T3", async () => {
  const { completeNextLevel } = await import("../src/domain.js");
  assert.throws(() => completeNextLevel(row({}), 2));
  assert.throws(() => completeNextLevel(row({ ex1: true, ex2: true }), 3));
  assert.throws(() => completeNextLevel(row({}), 0));
  assert.throws(() => completeNextLevel(row({}), 4));
});

test("Habit ranks sort stably without mutating legacy data", async () => {
  const { sortHabits } = await import("../src/domain.js");
  const old = [{ id: "b" }, { id: "a" }];
  assert.deepEqual(
    sortHabits(old).map((h) => h.id),
    ["b", "a"],
  );
  const ranked = [
    { id: "a", orderIndex: 2 },
    { id: "b", orderIndex: 0 },
    { id: "c", orderIndex: 1 },
  ];
  assert.deepEqual(
    sortHabits(ranked).map((h) => h.id),
    ["b", "c", "a"],
  );
  assert.equal(ranked[0].orderIndex, 2);
});
test("Reordering includes paused habits and preserves data/history", async () => {
  const { applyHabitOrder, sortHabits } = await import("../src/domain.js");
  const rows = [
    { id: "a", active: true, levels: exemplar.levels },
    {
      id: "b",
      active: false,
      scheduleHistory: [{ from: "2026-10-27", active: false }],
    },
    { id: "old", deletedDay: "2026-10-26" },
  ];
  const next = applyHabitOrder(rows, ["b", "a"]);
  assert.deepEqual(
    sortHabits(next)
      .filter((h) => !h.deletedDay)
      .map((h) => h.id),
    ["b", "a"],
  );
  assert.equal(next[1].active, false);
  assert.deepEqual(next[1].scheduleHistory, rows[1].scheduleHistory);
  assert.equal(next[0].levels, rows[0].levels);
  assert.equal(rows[0].orderIndex, undefined);
});
test("Stale or duplicate reorder IDs are rejected without dropping habits", async () => {
  const { applyHabitOrder } = await import("../src/domain.js");
  const rows = [{ id: "a" }, { id: "b" }];
  assert.throws(() => applyHabitOrder(rows, ["a", "a"]));
  assert.throws(() => applyHabitOrder(rows, ["a"]));
  assert.throws(() => applyHabitOrder(rows, ["a", "x"]));
});
test("Timeline rows follow the same habit order and move boundaries are safe", async () => {
  const { sortByHabitOrder, moveHabit } = await import("../src/domain.js");
  assert.deepEqual(
    sortByHabitOrder(
      [{ taskId: "a" }, { taskId: "c" }, { taskId: "b" }],
      [{ id: "b" }, { id: "a" }, { id: "c" }],
    ).map((p) => p.taskId),
    ["b", "a", "c"],
  );
  assert.deepEqual(moveHabit(["a", "b", "c"], 2, 0), ["c", "a", "b"]);
  assert.deepEqual(moveHabit(["a", "b"], 0, -1), ["a", "b"]);
});

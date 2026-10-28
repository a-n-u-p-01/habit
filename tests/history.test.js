import { test } from "node:test";
import assert from "node:assert/strict";
import {
  exemplar,
  achieved,
  progressId,
  dayStatus,
  daysBack,
  parseDate,
} from "../src/domain.js";
import {
  habitSnapshot,
  recordHabitDefinition,
  pastEntryInfo,
  preparePastCompletion,
} from "../src/history.js";
const today = "2026-10-28",
  yesterday = "2026-10-27";
const task = {
  ...exemplar,
  id: "a",
  active: true,
  createdDay: "2026-10-01",
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  scheduleHistory: [],
};
const options = {
  today,
  confirmed: true,
  confirmCurrentRequirements: true,
  nowMs: Date.parse("2026-10-28T12:00:00Z"),
};
const stored = {
  id: progressId("a", yesterday),
  taskId: "a",
  date: yesterday,
  snapshot: habitSnapshot(task),
  checks: {},
  scheduled: true,
};

test("Exactly the previous seven calendar days are eligible", () => {
  for (const key of daysBack(7, parseDate(yesterday)))
    assert.equal(pastEntryInfo(task, null, key, today).eligible, true);
  for (const key of ["2026-10-20", today, "2026-10-29", "2026-02-31", "bad"])
    assert.equal(pastEntryInfo(task, null, key, today).eligible, false);
});
test("Cannot correct before creation, unscheduled days, or a deleted habit's later dates", () => {
  assert.equal(
    pastEntryInfo({ ...task, createdDay: today }, null, yesterday, today)
      .eligible,
    false,
  );
  assert.equal(
    pastEntryInfo({ ...task, weekdays: [3] }, null, yesterday, today).eligible,
    false,
  );
  assert.equal(
    pastEntryInfo({ ...task, deletedDay: yesterday }, null, yesterday, today)
      .eligible,
    false,
  );
  assert.equal(
    pastEntryInfo(task, { ...stored, scheduled: false }, yesterday, today)
      .eligible,
    false,
  );
});
test("Historical schedules and existing scheduled sessions survive pauses", () => {
  const paused = {
    ...task,
    active: false,
    weekdays: [3],
    scheduleHistory: [
      { from: task.createdDay, weekdays: task.weekdays, active: true },
      { from: today, weekdays: [3], active: false },
    ],
  };
  assert.equal(pastEntryInfo(paused, null, yesterday, today).eligible, true);
  assert.equal(
    pastEntryInfo({ ...task, active: false }, stored, yesterday, today)
      .eligible,
    true,
  );
});
test("Existing snapshots win over changed current definitions", () => {
  const changed = {
    ...task,
    name: "Changed",
    levels: task.levels.map((rows) => rows.map((r) => ({ ...r, amount: 999 }))),
  };
  const result = preparePastCompletion(changed, stored, yesterday, 3, options);
  assert.deepEqual(result.progress.snapshot, stored.snapshot);
  assert.equal(achieved(result.progress), 3);
  assert.equal(result.wins.length, 3);
  assert.equal(result.progress.lateRequirementsSource, "saved_session");
  assert.deepEqual(stored.checks, {});
});
test("Known definition history restores the date's blueprint", () => {
  const changed = { ...task, name: "New definition" };
  const history = recordHabitDefinition(null, task, task.createdDay);
  const withHistory = {
    ...changed,
    definitionHistory: recordHabitDefinition(
      { ...task, definitionHistory: history },
      changed,
      today,
    ),
  };
  const info = pastEntryInfo(withHistory, null, yesterday, today);
  assert.equal(info.snapshot.name, task.name);
  assert.equal(info.source, "saved_history");
  assert.equal(info.needsRequirementsConfirmation, false);
  assert.equal(recordHabitDefinition(withHistory, changed, today).length, 2);
});
test("Legacy requirements are never silently claimed as historical", () => {
  const info = pastEntryInfo(task, null, yesterday, today);
  assert.equal(info.needsRequirementsConfirmation, true);
  assert.throws(
    () =>
      preparePastCompletion(task, null, yesterday, 1, {
        ...options,
        confirmCurrentRequirements: false,
      }),
    /requirements match/,
  );
  assert.throws(
    () =>
      preparePastCompletion(task, null, yesterday, 1, {
        ...options,
        confirmed: false,
      }),
    /Confirm you completed/,
  );
  assert.equal(
    preparePastCompletion(task, null, yesterday, 1, options).progress
      .lateRequirementsSource,
    "confirmed_current",
  );
  const history = recordHabitDefinition(
    task,
    { ...task, name: "Edited" },
    today,
  );
  assert.equal(
    history[0].from,
    today,
    "Do not manufacture a legacy definition's start date",
  );
});
test("Changed reviewed requirements are rejected rather than silently replaced", () => {
  assert.throws(
    () =>
      preparePastCompletion(task, stored, yesterday, 1, {
        ...options,
        expectedSnapshot: { ...stored.snapshot, name: "Other" },
      }),
    /review the date again/,
  );
});
test("Late logging is idempotent, cumulative, and never removes a previous win", () => {
  const first = preparePastCompletion(task, stored, yesterday, 2, options);
  assert.deepEqual(
    first.wins.map((w) => w.level),
    [1, 2],
  );
  const retry = preparePastCompletion(
    task,
    first.progress,
    yesterday,
    2,
    options,
  );
  assert.equal(retry.changed, false);
  assert.deepEqual(retry.wins, []);
  const third = preparePastCompletion(
    task,
    first.progress,
    yesterday,
    3,
    options,
  );
  assert.deepEqual(
    third.wins.map((w) => w.level),
    [3],
  );
  assert.equal(achieved(third.progress), 3);
  assert.equal(
    preparePastCompletion(task, third.progress, yesterday, 1, options).changed,
    false,
  );
  for (const target of [0, 4, 1.5])
    assert.throws(() =>
      preparePastCompletion(task, stored, yesterday, target, options),
    );
});
test("A correction updates only its date; completing T1 is sufficient", () => {
  const result = preparePastCompletion(task, stored, yesterday, 1, options);
  assert.equal(dayStatus([task], [result.progress], yesterday).dayWon, true);
  assert.equal(dayStatus([task], [result.progress], today).won, 0);
  assert.equal(result.progress.lateLoggedAt, options.nowMs);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activityCalendar,
  activityLabel,
  progressSummary,
} from "../src/analytics.js";
import { exemplar, parseDate } from "../src/domain.js";
const habit = {
  ...exemplar,
  id: "h1",
  name: "Reading",
  active: true,
  createdDay: "2026-10-26",
  weekdays: [1, 2, 3, 4, 5],
  scheduleHistory: [],
};
const entry = (day, tier = 1) => ({
  taskId: "h1",
  date: day,
  scheduled: true,
  snapshot: exemplar,
  checks: Object.fromEntries(
    exemplar.levels
      .slice(0, tier)
      .flat()
      .map((row) => [row.id, true]),
  ),
});
const keys = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29"];
test("T1, T2 and T3 each count as one completed habit-day", () => {
  const s = progressSummary(
    [habit],
    [entry(keys[0], 1), entry(keys[1], 2), entry(keys[2], 3)],
    keys,
    "2026-10-29",
  );
  assert.equal(s.completed, 3);
  assert.equal(s.expected, 4);
  assert.equal(s.rate, 75);
  assert.equal(s.daysWon, 3);
  assert.deepEqual(s.distribution, [1, 1, 1]);
});
test("Days are only won when every scheduled minimum is complete", () => {
  const s = progressSummary(
    [habit, { ...habit, id: "h2" }],
    [entry(keys[0])],
    [keys[0]],
    "2026-10-29",
  );
  assert.equal(s.daysWon, 0);
  assert.equal(s.completed, 1);
  assert.equal(s.expected, 2);
  assert.equal(s.rate, 50);
});
test("Rest days and future days do not lower completion rates", () => {
  const s = progressSummary(
    [habit],
    [entry(keys[0])],
    ["2026-10-25", keys[0], "2026-11-02"],
    "2026-10-29",
  );
  assert.equal(s.eligible, 1);
  assert.equal(s.rate, 100);
  assert.equal(s.winRate, 100);
  const empty = progressSummary([], [], keys, "2026-10-29");
  assert.equal(empty.rate, null);
  assert.equal(empty.winRate, null);
});
test("Historical scheduled sessions remain counted after a habit is removed", () => {
  const s = progressSummary(
    [{ ...habit, active: false, deletedDay: "2026-10-27" }],
    [entry(keys[0])],
    keys,
    "2026-10-29",
  );
  assert.equal(s.completed, 1);
  assert.equal(s.habits[0].editable, false);
  assert.equal(s.focus, null);
});
test("Attention suggestions require at least three past scheduled days, not incomplete today", () => {
  assert.equal(
    progressSummary([habit], [], keys.slice(0, 3), "2026-10-28").focus,
    null,
  );
  const s = progressSummary([habit], [entry(keys[0])], keys, "2026-10-29");
  assert.equal(s.focus.id, "h1");
  assert.equal(s.focus.pastTotal, 3);
  assert.equal(s.focus.pastDone, 1);
  assert.equal(
    progressSummary([{ ...habit, active: false }], [], keys, "2026-10-29")
      .focus,
    null,
  );
});
test("Activity calendar is Monday-aligned, 12 weeks long and includes current-week future placeholders", () => {
  const cells = activityCalendar("2026-10-29");
  assert.equal(cells.length, 84);
  assert.equal(parseDate(cells[0].day).getDay(), 1);
  assert.equal(cells.at(-1).day, "2026-11-01");
  assert.equal(cells.filter((c) => c.future).length, 3);
  assert.ok(cells.some((c) => c.day === "2026-10-29" && !c.future));
});
test("Activity labels distinguish rest, missing, partial, won and future", () => {
  assert.equal(activityLabel({ total: 0, won: 0, dayWon: false }), "Rest day");
  assert.equal(
    activityLabel({ total: 1, won: 0, dayWon: false }),
    "Not completed",
  );
  assert.equal(
    activityLabel({ total: 2, won: 1, dayWon: false }),
    "Partly complete",
  );
  assert.equal(activityLabel({ total: 2, won: 2, dayWon: true }), "Day won");
  assert.equal(activityLabel({}, true), "Upcoming");
});

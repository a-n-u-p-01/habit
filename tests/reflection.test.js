import { test } from "node:test";
import assert from "node:assert/strict";
import {
  reflectionValues,
  reflectionSignature,
  reflectionHabits,
  validReflection,
} from "../src/reflection.js";
import { exemplar } from "../src/domain.js";
test("Legacy reflections normalize without losing answers", () => {
  assert.deepEqual(reflectionValues({ worked: "A useful routine" }), {
    worked: "A useful routine",
    hard: "",
    next: "",
  });
  assert.equal(
    reflectionSignature({ worked: "a" }),
    reflectionSignature({ worked: "a", hard: "", next: "" }),
  );
  assert.notEqual(
    reflectionSignature({ worked: "a" }),
    reflectionSignature({ worked: "b" }),
  );
});
test("Reflection text uses existing 2000-character limits and optional prompts", () => {
  assert.equal(validReflection({ worked: "", hard: "", next: "" }), true);
  assert.equal(
    validReflection({ worked: "a".repeat(2001), hard: "", next: "" }),
    false,
  );
  assert.equal(validReflection({ worked: 4, hard: "", next: "" }), false);
});
const task = {
  ...exemplar,
  id: "habit",
  name: "Reading",
  active: true,
  createdDay: "2026-10-26",
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  scheduleHistory: [],
};
test("Weekly habit context excludes future days", () => {
  const rows = reflectionHabits(
    [task],
    [],
    ["2026-10-26", "2026-10-27", "2026-10-28"],
    "2026-10-27",
  );
  assert.equal(rows[0].scheduled, 2);
  assert.equal(rows[0].completed, 0);
});
test("Weekly context respects saved scheduled sessions after habit edits", () => {
  const progress = [
    {
      taskId: "habit",
      date: "2026-10-26",
      scheduled: true,
      snapshot: exemplar,
      checks: Object.fromEntries(exemplar.levels[0].map((r) => [r.id, true])),
    },
  ];
  const rows = reflectionHabits(
    [{ ...task, active: false }],
    progress,
    ["2026-10-26"],
    "2026-10-29",
  );
  assert.equal(rows[0].completed, 1);
  assert.equal(rows[0].scheduled, 1);
  assert.equal(rows[0].rate, 1);
});
test("Non-scheduled and deleted habits never produce misleading edit actions", () => {
  assert.deepEqual(
    reflectionHabits([task], [], ["2026-10-25"], "2026-10-29"),
    [],
  );
  const rows = reflectionHabits(
    [{ ...task, deletedDay: "2026-10-28" }],
    [],
    ["2026-10-26"],
    "2026-10-29",
  );
  assert.equal(rows[0].editable, false);
});

import { reflectionReadSections } from "../src/reflection.js";
test("Saved reflection sections are ordered, read-only content without empty placeholders", () => {
  assert.deepEqual(
    reflectionReadSections({
      worked: "A routine",
      hard: "  ",
      next: "Read one page",
    }),
    [
      { key: "worked", label: "What worked", text: "A routine" },
      { key: "next", label: "Next week", text: "Read one page" },
    ],
  );
  assert.deepEqual(reflectionReadSections(undefined), []);
});
test("Saved reflection content preserves line breaks and literal markup as text", () => {
  const value = "First line\nSecond line <script>not executable</script>";
  assert.equal(reflectionReadSections({ hard: value })[0].text, value);
});

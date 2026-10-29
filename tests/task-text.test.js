import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newRequirement,
  validateTask,
  taskText,
  isTaskOnly,
  achieved,
  completeNextLevel,
  totalWork,
  exemplar,
  CATEGORIES,
} from "../src/domain.js";
import { encodeFirestore, decodeFirestore } from "../src/serialization.js";
const row = (id, label) => ({ id, label });
const levels = [1, 2, 3].map((tier) =>
  Array.from({ length: 30 }, (_, i) =>
    row(`t${tier}-${i}`, `Task ${tier} ${i + 1}`),
  ),
);
const task = {
  name: "Daily routine",
  category: "Health",
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  levels,
};
test("New tasks have only identity and task text", () => {
  const r = newRequirement();
  assert.deepEqual(Object.keys(r).sort(), ["id", "label"]);
  assert.equal(isTaskOnly(r), true);
  assert.equal(taskText({ ...r, label: "Read 2 pages" }), "Read 2 pages");
  assert.equal(
    taskText({ ...r, label: "Read 2 more pages" }, true),
    "+ Read 2 more pages",
  );
});
test("Task lists are not limited to four and preserve order through Firestore", () => {
  assert.equal(validateTask(task), "");
  const encoded = encodeFirestore(task);
  assert.equal(encoded.levels.t1.ids.length, 30);
  assert.equal(encoded.levels.t1.tasks[29], "Task 1 30");
  assert.deepEqual(decodeFirestore(encoded), task);
  const nested = {
    definitionHistory: [{ from: "2026-10-01", snapshot: task }],
  };
  assert.deepEqual(decodeFirestore(encodeFirestore(nested)), nested);
});
test("Every task is required; later tiers cannot skip prior tasks", () => {
  const p = {
    snapshot: task,
    checks: Object.fromEntries(levels[0].slice(0, 29).map((r) => [r.id, true])),
  };
  assert.equal(achieved(p), 0);
  assert.throws(() => completeNextLevel(p, 2));
  const done = completeNextLevel(p, 1);
  assert.equal(achieved(done), 1);
  assert.equal(Object.keys(done.checks).length, 30);
  assert.equal(totalWork(done).length, 30);
  assert.equal(totalWork(done)[0].amount, undefined);
});
test("Legacy quantities remain readable and become meaningful editable task text", () => {
  assert.equal(taskText(exemplar.levels[0][0]), "10 reps Push-ups");
  assert.equal(isTaskOnly(exemplar.levels[0][0]), false);
  assert.deepEqual(decodeFirestore(encodeFirestore(exemplar)), exemplar);
});
test("All three levels need a task; invalid text and duplicate IDs fail", () => {
  for (const invalid of [
    { ...task, levels: [[], levels[1], levels[2]] },
    { ...task, levels: [[row("x", " ")], levels[1], levels[2]] },
    { ...task, levels: [[row("x", "a\nb")], levels[1], levels[2]] },
    { ...task, levels: [[row("x", "a".repeat(161))], levels[1], levels[2]] },
    { ...task, levels: [[row("x", "A")], [row("x", "B")], levels[2]] },
  ])
    assert.notEqual(validateTask(invalid), "");
});
test("Useful daily categories are available without removing old categories", () => {
  for (const name of [
    "Fitness",
    "Study",
    "Life",
    "Health",
    "Sleep",
    "Nutrition",
    "Relationships",
    "Finance",
    "Home",
    "Growth",
  ])
    assert.ok(CATEGORIES.includes(name));
});

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const CATEGORIES = [
  "Fitness",
  "Study",
  "Mindfulness",
  "Creative",
  "Career",
  "Life",
];
export const LEVELS = ["Minimum badge", "Momentum badge", "Full effort badge"];
export const dateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const parseDate = (key) => new Date(`${key}T12:00:00`);
export function daysBack(n, end = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(end);
    d.setDate(d.getDate() - n + 1 + i);
    return dateKey(d);
  });
}
export function weekDates(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(d);
    day.setDate(day.getDate() + i);
    return dateKey(day);
  });
}
export function scheduled(task, key) {
  const history = (task.scheduleHistory || [])
    .filter((h) => h.from <= key)
    .sort((a, b) => b.from.localeCompare(a.from));
  const schedule = history[0] || task;
  return (
    schedule.active !== false &&
    schedule.weekdays.includes(parseDate(key).getDay()) &&
    (!task.createdDay || key >= task.createdDay) &&
    (!task.deletedDay || key < task.deletedDay)
  );
}
export const progressId = (taskId, key) => `${key}_${taskId}`;
export function achieved(progress) {
  if (!progress) return 0;
  let level = 0;
  for (let i = 0; i < 3; i++) {
    const reqs = progress.snapshot?.levels?.[i] || [];
    if (reqs.length && reqs.every((r) => progress.checks?.[r.id]))
      level = i + 1;
    else break;
  }
  return level;
}
// Plan exactly the requested next tier without altering previous wins.
// Returning the same object for an already-earned tier makes retries idempotent.
export function completeNextLevel(progress, target) {
  if (!Number.isInteger(target) || target < 1 || target > 3)
    throw new Error("Choose a level from T1 to T3.");
  const current = achieved(progress);
  if (current >= target) return progress;
  if (target !== current + 1)
    throw new Error("Win the current level before moving to the next one.");
  const requirements = progress?.snapshot?.levels?.[target - 1];
  if (!requirements?.length)
    throw new Error(
      "This level has no requirements. Edit the habit and try again.",
    );
  return {
    ...progress,
    checks: {
      ...progress.checks,
      ...Object.fromEntries(requirements.map((r) => [r.id, true])),
    },
  };
}
export function totalWork(progress) {
  const totals = new Map();
  for (const requirements of (progress?.snapshot?.levels || []).slice(
    0,
    achieved(progress),
  ))
    for (const r of requirements) {
      const k = `${r.label.trim().toLowerCase()}|${r.unit.trim().toLowerCase()}`;
      const old = totals.get(k) || { label: r.label, unit: r.unit, amount: 0 };
      totals.set(k, {
        ...old,
        amount: Math.round((old.amount + Number(r.amount)) * 100) / 100,
      });
    }
  return [...totals.values()];
}
export function dayStatus(tasks, progress, key) {
  const p = progress.filter((p) => p.date === key);
  const expected = new Set(
    tasks.filter((t) => scheduled(t, key)).map((t) => t.id),
  );
  for (const row of p) if (row.scheduled) expected.add(row.taskId);
  const won = p.filter(
    (row) => expected.has(row.taskId) && achieved(row) >= 1,
  ).length;
  return {
    total: expected.size,
    won,
    dayWon: expected.size > 0 && won === expected.size,
  };
}
export function statistics(tasks, progress, keys) {
  const rows = progress.filter((p) => keys.includes(p.date));
  return {
    daysWon: keys.filter((k) => dayStatus(tasks, progress, k).dayWon).length,
    tasksWon: rows.filter((p) => achieved(p) > 0).length,
    t3: rows.filter((p) => achieved(p) === 3).length,
    distribution: [1, 2, 3].map(
      (n) => rows.filter((p) => achieved(p) === n).length,
    ),
  };
}
export const newRequirement = () => ({
  id: crypto.randomUUID(),
  label: "",
  amount: 1,
  unit: "reps",
});
export function validateTask(task) {
  if (!task.name?.trim()) return "Give your habit a name.";
  if (task.name.length > 80) return "Use a name under 80 characters.";
  if (!task.weekdays?.length) return "Choose at least one weekday.";
  if (!Array.isArray(task.levels) || task.levels.length !== 3)
    return "Define all three levels.";
  const ids = new Set();
  for (const [i, rows] of task.levels.entries()) {
    if (!rows.length || rows.length > 4)
      return `T${i + 1} needs 1–4 requirements.`;
    for (const r of rows) {
      if (!r.id || ids.has(r.id)) return "Each requirement needs a unique ID.";
      ids.add(r.id);
      if (
        !r.label.trim() ||
        r.label.length > 80 ||
        !r.unit.trim() ||
        r.unit.length > 24 ||
        !Number.isFinite(Number(r.amount)) ||
        Number(r.amount) <= 0 ||
        Number(r.amount) > 100000
      )
        return `T${i + 1}: add a label, positive amount, and unit.`;
    }
  }
  return "";
}
export const exemplar = {
  name: "Everyday movement",
  category: "Fitness",
  weekdays: [1, 2, 3, 4, 5],
  levels: [
    [
      { id: "ex1", label: "Push-ups", amount: 10, unit: "reps" },
      { id: "ex2", label: "Squats", amount: 10, unit: "reps" },
    ],
    [
      { id: "ex3", label: "Push-ups", amount: 5, unit: "reps" },
      { id: "ex4", label: "Squats", amount: 5, unit: "reps" },
      { id: "ex5", label: "Pull-ups", amount: 10, unit: "reps" },
    ],
    [
      { id: "ex6", label: "Push-ups", amount: 5, unit: "reps" },
      { id: "ex7", label: "Pull-ups", amount: 10, unit: "reps" },
      { id: "ex8", label: "Running", amount: 2, unit: "km" },
    ],
  ],
};
export const starterTemplates = [
  {
    ...exemplar,
    id: "starter-movement",
    description:
      "A small, approachable start. Each next level adds a little more.",
    authorName: "Win Today · starter",
    starter: true,
  },
  {
    id: "starter-reading",
    starter: true,
    name: "A little reading",
    category: "Study",
    description: "Build a reading habit, a few pages at a time.",
    authorName: "Win Today · starter",
    weekdays: [1, 2, 3, 4, 5, 6, 0],
    levels: [
      [{ id: "r1", label: "Reading", amount: 2, unit: "pages" }],
      [{ id: "r2", label: "Reading", amount: 3, unit: "pages" }],
      [{ id: "r3", label: "Reading", amount: 5, unit: "pages" }],
    ],
  },
  {
    id: "starter-pause",
    starter: true,
    name: "Room to breathe",
    category: "Mindfulness",
    description: "Make a little space for yourself. Start with one minute.",
    authorName: "Win Today · starter",
    weekdays: [1, 2, 3, 4, 5, 6, 0],
    levels: [
      [{ id: "m1", label: "Mindful breathing", amount: 1, unit: "min" }],
      [{ id: "m2", label: "Mindful breathing", amount: 2, unit: "min" }],
      [{ id: "m3", label: "Mindful breathing", amount: 5, unit: "min" }],
    ],
  },
];

// A single, stable order is shared by every habit-based screen. Old data with
// no rank retains its existing relative order until the user arranges it.
export function sortHabits(habits) {
  return habits
    .map((habit, index) => ({ habit, index }))
    .sort((a, b) => {
      const ar = Number.isFinite(a.habit.orderIndex)
        ? a.habit.orderIndex
        : -Infinity;
      const br = Number.isFinite(b.habit.orderIndex)
        ? b.habit.orderIndex
        : -Infinity;
      return ar === br ? a.index - b.index : ar - br;
    })
    .map((row) => row.habit);
}
export function applyHabitOrder(habits, orderedIds) {
  const visible = habits.filter((h) => !h.deletedDay);
  const ids = new Set(orderedIds);
  if (
    ids.size !== orderedIds.length ||
    ids.size !== visible.length ||
    visible.some((h) => !ids.has(h.id))
  )
    throw new Error("The habit list changed. Please retry the reorder.");
  const ranks = new Map(orderedIds.map((id, index) => [id, index]));
  return habits.map((h) =>
    ranks.has(h.id) ? { ...h, orderIndex: ranks.get(h.id) } : h,
  );
}
export function moveHabit(ids, from, to) {
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to < 0 ||
    from >= ids.length ||
    to >= ids.length
  )
    return [...ids];
  const next = [...ids];
  const [id] = next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}

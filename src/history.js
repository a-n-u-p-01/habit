import {
  achieved,
  completeNextLevel,
  dateKey,
  daysBack,
  parseDate,
  progressId,
  scheduled,
} from "./domain.js";

const clone = (value) => JSON.parse(JSON.stringify(value));
export const habitSnapshot = (task) =>
  clone({
    name: task.name,
    category: task.category,
    weekdays: task.weekdays,
    levels: task.levels,
  });

// Version definitions from their actual effective day, never invent legacy history.
export function recordHabitDefinition(previous, next, key) {
  const history = previous?.definitionHistory || [];
  const snapshot = habitSnapshot(next);
  const latest = [...history].sort((a, b) => b.from.localeCompare(a.from))[0];
  if (
    latest &&
    JSON.stringify(habitSnapshot(latest.snapshot)) === JSON.stringify(snapshot)
  )
    return clone(history);
  return [
    ...history.filter((row) => row.from !== key),
    { from: key, snapshot },
  ];
}

export function pastEntryInfo(task, stored, key, today = dateKey()) {
  const blocked = (reason) => ({ eligible: false, reason });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || dateKey(parseDate(key)) !== key)
    return blocked("Choose a valid date.");
  if (key >= today)
    return blocked(
      "Corrections are only for previous days. Use Today for today's habits.",
    );
  if (key < daysBack(8, parseDate(today))[0])
    return blocked("Only the previous 7 days can be corrected.");
  if (!task?.createdDay || key < task.createdDay)
    return blocked("This habit did not exist on that date.");
  if (stored ? stored.scheduled !== true : !scheduled(task, key))
    return blocked("This habit was not scheduled on that date.");
  if (stored?.snapshot)
    return {
      eligible: true,
      snapshot: habitSnapshot(stored.snapshot),
      source: ["saved_session", "saved_history", "confirmed_current"].includes(
        stored.lateRequirementsSource,
      )
        ? stored.lateRequirementsSource
        : "saved_session",
      needsRequirementsConfirmation: false,
    };
  const version = [...(task.definitionHistory || [])]
    .filter((row) => row.from <= key)
    .sort((a, b) => b.from.localeCompare(a.from))[0];
  if (version)
    return {
      eligible: true,
      snapshot: habitSnapshot(version.snapshot),
      source: "saved_history",
      needsRequirementsConfirmation: false,
    };
  return {
    eligible: true,
    snapshot: habitSnapshot(task),
    source: "confirmed_current",
    needsRequirementsConfirmation: true,
  };
}

export function preparePastCompletion(task, stored, key, target, options = {}) {
  const {
    today = dateKey(),
    nowMs = Date.now(),
    confirmed = false,
    confirmCurrentRequirements = false,
    expectedSnapshot,
  } = options;
  const info = pastEntryInfo(task, stored, key, today);
  if (!info.eligible) throw new Error(info.reason);
  if (!confirmed)
    throw new Error(
      "Confirm you completed these requirements on the selected date.",
    );
  if (info.needsRequirementsConfirmation && !confirmCurrentRequirements)
    throw new Error(
      "Confirm the current requirements match what this habit required on that date.",
    );
  if (
    expectedSnapshot &&
    JSON.stringify(habitSnapshot(expectedSnapshot)) !==
      JSON.stringify(info.snapshot)
  )
    throw new Error(
      "The saved requirements changed. Close this window and review the date again.",
    );
  if (!Number.isInteger(target) || target < 1 || target > 3)
    throw new Error("Choose a tier from T1 to T3.");
  const current = achieved(stored);
  if (current >= target) return { progress: stored, wins: [], changed: false };
  let next = stored
    ? clone(stored)
    : {
        id: progressId(task.id, key),
        taskId: task.id,
        date: key,
        scheduled: true,
        snapshot: info.snapshot,
        checks: {},
        createdAt: nowMs,
      };
  const wins = [];
  for (let level = current + 1; level <= target; level++) {
    next = completeNextLevel(next, level);
    wins.push({
      id: `${next.id}_T${level}`,
      taskId: task.id,
      date: key,
      level,
      lateLoggedAt: nowMs,
      lateRequirementsSource: info.source,
    });
  }
  return {
    progress: {
      ...next,
      lateLoggedAt: nowMs,
      lateRequirementsSource: info.source,
    },
    wins,
    changed: true,
  };
}

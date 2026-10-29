import {
  achieved,
  dateKey,
  dayStatus,
  parseDate,
  scheduled,
} from "./domain.js";

export function progressSummary(tasks, progress, keys, today) {
  const days = keys
    .filter((day) => day <= today)
    .map((day) => ({ day, ...dayStatus(tasks, progress, day) }));
  const eligible = days.filter((day) => day.total > 0).length;
  const daysWon = days.filter((day) => day.dayWon).length;
  const expected = days.reduce((sum, day) => sum + day.total, 0);
  const completed = days.reduce((sum, day) => sum + day.won, 0);
  const distribution = [0, 0, 0];
  const byId = new Map(tasks.map((task) => [task.id, task]));
  for (const entry of progress) {
    if (!keys.includes(entry.date) || entry.date > today) continue;
    const tier = achieved(entry);
    if (
      tier > 0 &&
      (entry.scheduled ||
        (byId.has(entry.taskId) &&
          scheduled(byId.get(entry.taskId), entry.date)))
    )
      distribution[tier - 1]++;
  }
  const habits = tasks
    .map((task) => {
      const expectedDays = days.filter(
        ({ day }) =>
          scheduled(task, day) ||
          progress.some(
            (entry) =>
              entry.taskId === task.id && entry.date === day && entry.scheduled,
          ),
      );
      const finished = (day) =>
        progress.some(
          (entry) =>
            entry.taskId === task.id &&
            entry.date === day &&
            achieved(entry) > 0,
        );
      const count = expectedDays.filter(({ day }) => finished(day)).length;
      const past = expectedDays.filter(({ day }) => day < today);
      const pastDone = past.filter(({ day }) => finished(day)).length;
      return {
        id: task.id,
        name: task.name,
        category: task.category,
        completed: count,
        total: expectedDays.length,
        percent: expectedDays.length
          ? Math.round((count / expectedDays.length) * 100)
          : null,
        pastTotal: past.length,
        pastDone,
        editable: !task.deletedDay,
        active: !task.deletedDay && task.active !== false,
      };
    })
    .filter((habit) => habit.total > 0);
  const focus =
    habits
      .filter(
        (habit) =>
          habit.active &&
          habit.pastTotal >= 3 &&
          habit.pastDone / habit.pastTotal < 0.5,
      )
      .sort(
        (a, b) =>
          a.pastDone / a.pastTotal - b.pastDone / b.pastTotal ||
          a.name.localeCompare(b.name),
      )[0] || null;
  return {
    days,
    eligible,
    daysWon,
    expected,
    completed,
    distribution,
    rate: expected ? Math.round((completed / expected) * 100) : null,
    winRate: eligible ? Math.round((daysWon / eligible) * 100) : null,
    habits,
    focus,
  };
}
export function activityCalendar(today, weeks = 12) {
  const monday = parseDate(today);
  monday.setDate(
    monday.getDate() - ((monday.getDay() + 6) % 7) - (weeks - 1) * 7,
  );
  return Array.from({ length: weeks * 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(day.getDate() + index);
    const key = dateKey(day);
    return { day: key, future: key > today };
  });
}
export function activityLabel(status, future = false) {
  if (future) return "Upcoming";
  if (!status.total) return "Rest day";
  if (status.dayWon) return "Day won";
  return status.won ? "Partly complete" : "Not completed";
}

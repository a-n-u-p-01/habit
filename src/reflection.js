import { achieved, scheduled } from "./domain.js";
export function reflectionValues(record) {
  return {
    worked: record?.worked || "",
    hard: record?.hard || "",
    next: record?.next || "",
  };
}
export function reflectionSignature(record) {
  return JSON.stringify(reflectionValues(record));
}
export function reflectionHabits(tasks, progress, keys, today) {
  const elapsed = keys.filter((day) => day <= today);
  return tasks
    .map((task) => {
      const days = elapsed.filter((day) => {
        const entry = progress.find(
          (row) => row.taskId === task.id && row.date === day,
        );
        return entry ? entry.scheduled === true : scheduled(task, day);
      });
      const completed = days.filter((day) =>
        progress.some(
          (row) =>
            row.taskId === task.id && row.date === day && achieved(row) > 0,
        ),
      ).length;
      return {
        id: task.id,
        name: task.name,
        category: task.category,
        scheduled: days.length,
        completed,
        rate: days.length ? completed / days.length : 0,
        editable: !task.deletedDay,
      };
    })
    .filter((row) => row.scheduled > 0);
}
export function validReflection(record) {
  return ["worked", "hard", "next"].every(
    (key) => typeof record[key] === "string" && record[key].length <= 2000,
  );
}

export function reflectionReadSections(record) {
  const values = reflectionValues(record);
  return [
    ["worked", "What worked"],
    ["hard", "What was difficult"],
    ["next", "Next week"],
  ]
    .filter(([key]) => values[key].trim())
    .map(([key, label]) => ({ key, label, text: values[key] }));
}

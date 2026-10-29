// Version 1 measured rows remain readable. New task-only tiers use ordered
// parallel string lists, allowing native Rules validation without a row cap.
const taskOnly = (r) =>
  r && !Object.hasOwn(r, "amount") && !Object.hasOwn(r, "unit");
function encodeLevels(levels) {
  const text = levels.every(
    (rows) => Array.isArray(rows) && rows.every(taskOnly),
  );
  return Object.fromEntries(
    levels.map((rows, i) => [
      `t${i + 1}`,
      text
        ? { ids: rows.map((r) => r.id), tasks: rows.map((r) => r.label) }
        : encodeFirestore(rows),
    ]),
  );
}
function decodeLevel(stage) {
  if (Array.isArray(stage)) return decodeFirestore(stage);
  if (!stage || !Array.isArray(stage.ids) || !Array.isArray(stage.tasks))
    return [];
  return stage.ids.map((id, i) => ({
    id: String(id),
    label: typeof stage.tasks[i] === "string" ? stage.tasks[i] : "Invalid task",
  }));
}
export function encodeFirestore(value) {
  if (Array.isArray(value)) return value.map(encodeFirestore);
  if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  )
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [
        key,
        key === "levels" && Array.isArray(v)
          ? encodeLevels(v)
          : encodeFirestore(v),
      ]),
    );
  return value;
}
export function decodeFirestore(value) {
  if (Array.isArray(value)) return value.map(decodeFirestore);
  if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  )
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [
        key,
        key === "levels" && v && !Array.isArray(v)
          ? [decodeLevel(v.t1), decodeLevel(v.t2), decodeLevel(v.t3)]
          : decodeFirestore(v),
      ]),
    );
  return value;
}

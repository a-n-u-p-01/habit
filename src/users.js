import { ROLE_LABELS } from "./access-labels.js";

export function userRole(roles, id) {
  const value = roles[id];
  return Object.hasOwn(ROLE_LABELS, value) ? value : "user";
}
export function joinedMillis(value) {
  const result =
    value?.toMillis?.() ??
    (typeof value === "number"
      ? value
      : typeof value === "string"
        ? Date.parse(value)
        : NaN);
  return Number.isFinite(result) && result > 0 ? result : null;
}
export function templateCounts(templates) {
  return templates.reduce((counts, row) => {
    if (row.authorId) counts[row.authorId] = (counts[row.authorId] || 0) + 1;
    return counts;
  }, Object.create(null));
}
export function selectUsers(
  rows,
  roles,
  counts,
  { search = "", role = "all", sort = "name" } = {},
) {
  const term = search.trim().toLocaleLowerCase();
  return rows
    .filter(
      (row) =>
        (role === "all" || userRole(roles, row.id) === role) &&
        `${row.displayName || ""} ${row.id}`.toLocaleLowerCase().includes(term),
    )
    .sort((a, b) => {
      let difference = 0;
      if (sort === "newest")
        difference =
          (joinedMillis(b.createdAt) || 0) - (joinedMillis(a.createdAt) || 0);
      else if (sort === "templates")
        difference = (counts[b.id] || 0) - (counts[a.id] || 0);
      return (
        difference ||
        (a.displayName || "~").localeCompare(b.displayName || "~") ||
        a.id.localeCompare(b.id)
      );
    });
}
export function paginateUsers(rows, page = 1, pageSize = 10) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  return {
    rows: rows.slice((current - 1) * pageSize, current * pageSize),
    page: current,
    totalPages,
    start: rows.length ? (current - 1) * pageSize + 1 : 0,
    end: Math.min(current * pageSize, rows.length),
  };
}

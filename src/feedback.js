export const FEEDBACK_STATUSES = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};
export function feedbackTime(value) {
  const time = value?.toMillis?.() ?? (typeof value === "number" ? value : NaN);
  return Number.isFinite(time) && time > 0 ? time : 0;
}
export function selectFeedback(
  rows,
  { search = "", status = "all", type = "all", sort = "newest" } = {},
) {
  const term = search.trim().toLocaleLowerCase();
  return rows
    .filter(
      (row) =>
        (status === "all" || row.status === status) &&
        (type === "all" || row.type === type) &&
        [row.title, row.message, row.authorName, row.authorId, row.id]
          .join(" ")
          .toLocaleLowerCase()
          .includes(term),
    )
    .sort((a, b) => {
      let order = 0;
      if (sort === "oldest")
        order =
          (feedbackTime(a.createdAt) || Infinity) -
          (feedbackTime(b.createdAt) || Infinity);
      else if (sort === "updated")
        order = feedbackTime(b.updatedAt) - feedbackTime(a.updatedAt);
      else if (sort === "title")
        order = (a.title || "").localeCompare(b.title || "");
      else if (sort === "author")
        order = (a.authorName || "").localeCompare(b.authorName || "");
      else order = feedbackTime(b.createdAt) - feedbackTime(a.createdAt);
      return order || (a.id || "").localeCompare(b.id || "");
    });
}
export function feedbackPage(rows, page, size) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(Math.max(1, page), pages);
  return {
    rows: rows.slice((current - 1) * size, current * size),
    current,
    pages,
    start: rows.length ? (current - 1) * size + 1 : 0,
    end: Math.min(current * size, rows.length),
  };
}

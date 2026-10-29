import React, { useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Inbox,
  ArrowUpDown,
} from "lucide-react";
import {
  FEEDBACK_STATUSES,
  feedbackTime,
  selectFeedback,
  feedbackPage,
} from "./feedback.js";
function DateCell({ value }) {
  const time = feedbackTime(value);
  return time ? (
    <time
      dateTime={new Date(time).toISOString()}
      title={new Date(time).toLocaleString()}
    >
      {new Date(time).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}
      <small>
        {new Date(time).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </small>
    </time>
  ) : (
    <span className="inbox-muted">Not recorded</span>
  );
}
export function FeedbackInbox({ data, busy, onStatus }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const filtered = selectFeedback(data.rows, { search, status, type, sort });
  const view = feedbackPage(filtered, page, size);
  const setFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };
  const reset = () => {
    setSearch("");
    setStatus("all");
    setType("all");
    setSort("newest");
    setPage(1);
  };
  return (
    <>
      <div className="inbox-overview" aria-label="Feedback summary">
        {[
          ["all", "Total submissions"],
          ...Object.entries(FEEDBACK_STATUSES),
        ].map(([key, label]) => (
          <div key={key}>
            <span>{label}</span>
            <strong>
              {data.loading || data.error
                ? "—"
                : data.rows.filter((row) => key === "all" || row.status === key)
                    .length}
            </strong>
          </div>
        ))}
      </div>
      <section className="panel inbox-directory" aria-label="Feedback inbox">
        <div className="inbox-heading">
          <h2>
            Admin inbox{" "}
            <span>{data.loading || data.error ? "—" : data.rows.length}</span>
          </h2>
          <p>Review submissions and update their status.</p>
        </div>
        <div className="inbox-filters">
          <label className="inbox-search">
            <Search size={17} />
            <input
              type="search"
              aria-label="Search feedback"
              placeholder="Search title, details, name or ID…"
              value={search}
              onChange={setFilter(setSearch)}
            />
          </label>
          <select
            aria-label="Filter feedback status"
            value={status}
            onChange={setFilter(setStatus)}
          >
            <option value="all">All statuses</option>
            {Object.entries(FEEDBACK_STATUSES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter feedback type"
            value={type}
            onChange={setFilter(setType)}
          >
            <option value="all">All types</option>
            <option value="report">Problem reports</option>
            <option value="suggestion">Suggestions</option>
          </select>
          <label className="inbox-sort">
            <ArrowUpDown size={14} />
            <select
              aria-label="Sort feedback"
              value={sort}
              onChange={setFilter(setSort)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="updated">Recently updated</option>
              <option value="title">Title: A–Z</option>
              <option value="author">Author: A–Z</option>
            </select>
          </label>
        </div>
        <div
          className="inbox-scroll"
          tabIndex={0}
          role="region"
          aria-label="Feedback table, scroll horizontally for all columns"
        >
          <table className="inbox-table" aria-busy={data.loading}>
            <caption className="visually-hidden">
              Community reports and suggestions, authors, dates and editable
              statuses.
            </caption>
            <thead>
              <tr>
                <th scope="col">Submission</th>
                <th scope="col">Type</th>
                <th scope="col">Submitted by</th>
                <th scope="col">Created</th>
                <th scope="col">Last updated</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.loading ? (
                <tr>
                  <td colSpan={6}>
                    <p className="inbox-empty" role="status">
                      Loading feedback…
                    </p>
                  </td>
                </tr>
              ) : data.error ? (
                <tr>
                  <td colSpan={6}>
                    <p className="inbox-empty">
                      Feedback could not be loaded. Check the error above.
                    </p>
                  </td>
                </tr>
              ) : (
                view.rows.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="inbox-submission">
                        <h3>{item.title || "Untitled submission"}</h3>
                        <code title={item.id}>{item.id}</code>
                        <details>
                          <summary>View details</summary>
                          <p>{item.message || "No details provided."}</p>
                        </details>
                      </div>
                    </td>
                    <td>
                      <span className={`inbox-type ${item.type}`}>
                        {item.type === "report"
                          ? "Problem report"
                          : "Suggestion"}
                      </span>
                    </td>
                    <td>
                      <div className="inbox-author">
                        <strong>{item.authorName || "App user"}</strong>
                        <code title={item.authorId}>
                          {item.authorId || "Not recorded"}
                        </code>
                      </div>
                    </td>
                    <td>
                      <DateCell value={item.createdAt} />
                    </td>
                    <td>
                      <DateCell value={item.updatedAt} />
                    </td>
                    <td>
                      <div className="inbox-status">
                        <span
                          className={`role-badge feedback-badge ${item.status || "open"}`}
                        >
                          {FEEDBACK_STATUSES[item.status] || "Unknown"}
                        </span>
                        <select
                          aria-label={`Status for ${item.title}`}
                          value={item.status || "open"}
                          disabled={busy}
                          onChange={(event) =>
                            onStatus(item.id, event.target.value)
                          }
                        >
                          {Object.entries(FEEDBACK_STATUSES).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {!data.loading && !data.error && !filtered.length && (
                <tr>
                  <td colSpan={6}>
                    <div className="inbox-empty">
                      <Inbox size={26} />
                      <h3>
                        {data.rows.length
                          ? "No matching submissions"
                          : "Your inbox is clear"}
                      </h3>
                      <p>
                        {data.rows.length
                          ? "Try another search or change the filters."
                          : "New reports and suggestions will appear here."}
                      </p>
                      {(search || status !== "all" || type !== "all") && (
                        <button className="text-button" onClick={reset}>
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="users-pagination inbox-pagination">
          <p role="status" aria-live="polite">
            {data.loading ? (
              "Loading inbox…"
            ) : data.error ? (
              "Inbox unavailable"
            ) : (
              <>
                Showing{" "}
                <strong>
                  {view.start}–{view.end}
                </strong>{" "}
                of <strong>{filtered.length}</strong> submissions
              </>
            )}
          </p>
          <div className="users-page-controls">
            <label>
              Rows per page
              <select
                aria-label="Rows per page"
                value={size}
                onChange={(event) => {
                  setSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                {[10, 25, 50].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <div className="users-page-buttons">
              <button
                aria-label="First page"
                disabled={data.loading || view.current === 1}
                onClick={() => setPage(1)}
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                aria-label="Previous page"
                disabled={data.loading || view.current === 1}
                onClick={() => setPage(view.current - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <span>
                Page {view.current} of {view.pages}
              </span>
              <button
                aria-label="Next page"
                disabled={data.loading || view.current === view.pages}
                onClick={() => setPage(view.current + 1)}
              >
                <ChevronRight size={16} />
              </button>
              <button
                aria-label="Last page"
                disabled={data.loading || view.current === view.pages}
                onClick={() => setPage(view.pages)}
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

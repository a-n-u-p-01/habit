import { FeedbackInbox } from "../FeedbackInbox";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UsersTable } from "../UsersTable";
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  setDoc,
  deleteDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useApp } from "../store";
import { ROLE_LABELS, useAccess } from "../access";
import { PageTitle } from "../components";

function useRows(path, enabled, owner) {
  const [state, setState] = useState({
    key: "",
    rows: [],
    loading: true,
    error: "",
  });
  const key = `${path}:${owner || "all"}`;
  useEffect(() => {
    if (!enabled) {
      setState({ key, rows: [], loading: false, error: "" });
      return;
    }
    setState({ key, rows: [], loading: true, error: "" });
    const source = owner
      ? query(collection(db, path), where("authorId", "==", owner))
      : collection(db, path);
    return onSnapshot(
      source,
      (snapshot) =>
        setState({
          key,
          rows: snapshot.docs.map((d) => ({ ...d.data(), id: d.id })),
          loading: false,
          error: "",
        }),
      (e) =>
        setState({
          key,
          rows: [],
          loading: false,
          error: `Could not load ${path === "feedback" ? "feedback" : path === "templates" ? "templates" : "users or roles"}: ${e.message}`,
        }),
    );
  }, [path, enabled, owner, key]);
  return enabled && state.key === key
    ? state
    : { rows: [], loading: enabled, error: "" };
}
function timeLabel(value) {
  return value?.toDate ? value.toDate().toLocaleString() : "Sending…";
}

export function UsersPage() {
  const { user, online, setNotice } = useApp();
  const { isStaff, isSuperAdmin } = useAccess();
  const users = useRows("users", isStaff, null),
    roles = useRows("userRoles", isStaff, null);
  const templates = useRows("templates", isStaff, null);
  const [busy, setBusy] = useState(null),
    [error, setError] = useState("");
  async function changeRole(uid, next) {
    if (
      !isSuperAdmin ||
      busy ||
      !online ||
      roles.loading ||
      roles.error ||
      uid === user?.uid ||
      !Object.hasOwn(ROLE_LABELS, next)
    )
      return;
    if (
      !window.confirm(
        `Change this user's role to ${ROLE_LABELS[next]}?${next === "user" ? " This removes admin access." : ""}`,
      )
    )
      return;
    setBusy(uid);
    setError("");
    try {
      if (next === "user") await deleteDoc(doc(db, "userRoles", uid));
      else
        await setDoc(doc(db, "userRoles", uid), {
          role: next,
          updatedBy: user.uid,
          updatedAt: serverTimestamp(),
        });
      setNotice("Role updated.");
    } catch (e) {
      setError(`Role was not changed: ${e.message}`);
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="admin-page users-page">
      <PageTitle eyebrow="ADMINISTRATION" title="Users" />
      <p className="users-intro">
        A clear view of your community. Manage people and their permissions in
        one place.
      </p>
      {(error || users.error || roles.error) && (
        <p className="banner error" role="alert">
          {error || users.error || roles.error}
        </p>
      )}
      {templates.error && (
        <p className="banner error" role="alert">
          Template counts could not be loaded. Counts are unavailable, not zero.
        </p>
      )}
      {!online && (
        <p className="banner" role="status">
          You're offline. Role changes are paused; displayed data may be out of
          date.
        </p>
      )}
      <UsersTable
        users={users}
        roles={roles}
        templates={templates}
        currentUserId={user?.uid}
        isSuperAdmin={isSuperAdmin}
        online={online}
        busy={busy}
        onChangeRole={changeRole}
        setNotice={setNotice}
      />
    </div>
  );
}

function FeedbackCard({ item, staff, onStatus, busy }) {
  return (
    <article className="panel feedback-card">
      <div className="feedback-heading">
        <span className="eyebrow">
          {item.type === "report" ? "Problem report" : "Suggestion"}
        </span>
        <span className={`role-badge feedback-badge ${item.status || "open"}`}>
          {item.status === "in_progress"
            ? "In progress"
            : item.status === "resolved"
              ? "Resolved"
              : "Open"}
        </span>
      </div>
      <h3>{item.title}</h3>
      <p className="feedback-message">{item.message}</p>
      <small className="muted">
        {staff ? `${item.authorName} · ${item.authorId} · ` : ""}
        {timeLabel(item.createdAt)}
      </small>
      {staff && (
        <label className="feedback-status">
          Status
          <select
            aria-label={`Status for ${item.title}`}
            value={item.status}
            disabled={busy}
            onChange={(e) => onStatus(item.id, e.target.value)}
          >
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>
      )}
    </article>
  );
}

export function FeedbackPage({
  inbox = false,
  embedded = false,
  view = "all",
}) {
  const app = useApp();
  const { isStaff } = useAccess();
  const rows = useRows(
    "feedback",
    !!app.user && (!inbox || isStaff),
    inbox ? null : app.user?.uid,
  );
  const [form, setForm] = useState({ type: "report", title: "", message: "" });
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (busy || !app.user || !app.online) return;
    const title = form.title.trim(),
      message = form.message.trim();
    if (!title || !message) {
      setError("Please enter a title and details.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await addDoc(collection(db, "feedback"), {
        type: form.type,
        title,
        message,
        authorId: app.user.uid,
        authorName: (app.user.displayName || "App user").slice(0, 200),
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setForm({ type: "report", title: "", message: "" });
      setSent(true);
      app.setNotice(
        "Thank you. Your feedback has been sent to the admin team.",
      );
    } catch (e) {
      setError(`Feedback was not sent: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }
  async function changeStatus(id, status) {
    if (
      busy ||
      !app.online ||
      !isStaff ||
      !inbox ||
      !["open", "in_progress", "resolved"].includes(status)
    )
      return;
    setBusy(true);
    setError("");
    try {
      await updateDoc(doc(db, "feedback", id), {
        status,
        updatedAt: serverTimestamp(),
        updatedBy: app.user.uid,
      });
      app.setNotice("Feedback status updated.");
    } catch (e) {
      setError(`Status was not changed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }
  const sorted = rows.rows
    .filter((r) => filter === "all" || r.status === filter)
    .sort(
      (a, b) =>
        (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0),
    );
  return (
    <div className={`feedback-page${inbox ? " feedback-inbox-page" : ""}`}>
      {!embedded && (
        <>
          <PageTitle
            eyebrow={inbox ? "ADMINISTRATION" : "HELP US IMPROVE"}
            title={inbox ? "Reports & suggestions." : "Report or suggest."}
          />
          <p className="feedback-intro">
            {inbox
              ? "Review community feedback and keep people updated."
              : "Something not working? Have an idea? Let us know."}
          </p>
        </>
      )}
      {!app.user ? (
        <section className="panel form-section">
          <h2>We'd love to hear from you.</h2>
          <p>
            Sign in to report a problem or send a suggestion to the admin team.
          </p>
          <button className="button" onClick={() => app.login()}>
            Continue with Google
          </button>
        </section>
      ) : (
        <>
          {isStaff && !embedded && (
            <p className="feedback-admin-link">
              <Link
                className="text-button"
                to={inbox ? "/help?section=feedback" : "/admin/feedback"}
              >
                {inbox ? "Send your own feedback" : "Open admin inbox"}
              </Link>
            </p>
          )}
          {!app.online && (
            <p role="status">Reconnect to send feedback or change a status.</p>
          )}
          {(error || rows.error) && (
            <p className="banner error" role="alert">
              {error || rows.error}
            </p>
          )}
          {embedded && view === "compose" && sent && (
            <p className="support-sent-note" role="status">
              Feedback sent.{" "}
              <Link to="/help?section=submissions">
                View your submissions and status
              </Link>
            </p>
          )}
          <div
            className={
              inbox
                ? "feedback-inbox-content"
                : `feedback-personal-layout${embedded ? " feedback-embedded-layout" : ""}`
            }
          >
            {!inbox && view !== "history" && (
              <form
                className="panel form-section feedback-form"
                onSubmit={submit}
              >
                <h2>
                  {form.type === "report"
                    ? "Report a problem"
                    : "Suggest an improvement"}
                </h2>
                <p className="feedback-privacy">
                  {form.type === "report"
                    ? "Tell us what happened and how to reproduce it."
                    : "Describe your idea and how it would help you."}{" "}
                  Private to you and the admin team. Don’t include sensitive
                  information.
                </p>
                <label className="feedback-type-field">
                  Type
                  <select
                    aria-label="Feedback type"
                    disabled={busy}
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="report">Report a problem</option>
                    <option value="suggestion">Suggest an improvement</option>
                  </select>
                </label>
                <label className="feedback-title-field">
                  Title
                  <input
                    required
                    maxLength={120}
                    disabled={busy}
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    placeholder="A short summary"
                  />
                </label>
                <label className="feedback-details-field">
                  Details
                  <textarea
                    required
                    maxLength={5000}
                    disabled={busy}
                    rows={5}
                    value={form.message}
                    onChange={(e) =>
                      setForm({ ...form, message: e.target.value })
                    }
                    placeholder={
                      form.type === "report"
                        ? "Which page? What did you do? What happened instead? Include the error and device/browser if relevant."
                        : "What would you like to change? How would it make your routine easier?"
                    }
                  />
                </label>
                <button className="button" disabled={busy || !app.online}>
                  {busy ? "Sending…" : "Send feedback"}
                </button>
              </form>
            )}
            {inbox ? (
              <FeedbackInbox
                data={rows}
                busy={busy || !app.online || !isStaff}
                onStatus={changeStatus}
              />
            ) : view !== "compose" ? (
              <section
                className="panel feedback-history"
                aria-label="Your submissions"
              >
                <div className="section-heading feedback-submissions-heading">
                  <h2>{inbox ? "Admin inbox" : "Your submissions"}</h2>
                  <label>
                    Filter status
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">All statuses</option>
                      <option value="open">Open</option>
                      <option value="in_progress">In progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </label>
                </div>
                {rows.loading ? (
                  <p role="status">Loading feedback…</p>
                ) : sorted.length ? (
                  <div className="feedback-list">
                    {sorted.map((item) => (
                      <FeedbackCard
                        key={item.id}
                        item={item}
                        staff={inbox}
                        onStatus={changeStatus}
                        busy={busy || !app.online}
                      />
                    ))}
                  </div>
                ) : (
                  !rows.error && (
                    <p className="panel feedback-empty">
                      {inbox
                        ? "No feedback matches this filter."
                        : filter !== "all"
                          ? "No submissions match this status."
                          : "No submissions yet. Send a report or suggestion to get started."}
                    </p>
                  )
                )}
              </section>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

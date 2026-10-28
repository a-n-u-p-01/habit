import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
          error: `Could not load ${path === "feedback" ? "feedback" : "users or roles"}: ${e.message}`,
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
  const users = useRows("users", isStaff, null);
  const roles = useRows("userRoles", isStaff, null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const roleById = Object.fromEntries(roles.rows.map((r) => [r.id, r.role]));
  async function changeRole(uid, next) {
    if (!isSuperAdmin || busy || !online || uid === user.uid) return;
    if (
      !window.confirm(
        `Change this user's role to ${ROLE_LABELS[next]}?${next === "user" ? " This removes their admin access." : ""}`,
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
      setNotice("User role updated.");
    } catch (e) {
      setError(`Role was not changed: ${e.message}`);
    } finally {
      setBusy(null);
    }
  }
  const filtered = users.rows
    .filter((row) =>
      `${row.displayName} ${row.email || ""} ${row.id}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
  return (
    <>
      <PageTitle
        back="/profile"
        eyebrow="ADMINISTRATION"
        title="Users & roles."
      />
      <div className="panel form-section">
        <p>
          {isSuperAdmin
            ? "Give or remove Admin and Super admin roles. Select User to remove elevated access."
            : "View registered app users and their roles. Only a super admin can change roles."}
        </p>
        <p className="muted">
          Your own role cannot be changed here. Private habits and progress
          remain private.
        </p>
        <label>
          Search users
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email or user ID"
          />
        </label>
        {(error || users.error || roles.error) && (
          <p className="banner error" role="alert">
            {error || users.error || roles.error}
          </p>
        )}
        {!online && <p role="status">Reconnect to change roles.</p>}
        {users.loading || roles.loading ? (
          <p role="status">Loading users…</p>
        ) : (
          <>
            <p className="muted">
              {filtered.length} of {users.rows.length} users
            </p>
            <div className="admin-users">
              {filtered.map((row) => (
                <article className="admin-user" key={row.id}>
                  <div className="admin-user-copy">
                    <h3>
                      {row.displayName || "App user"}
                      {row.id === user.uid ? " (you)" : ""}
                    </h3>
                    {row.email && <p>{row.email}</p>}
                    <small className="muted">{row.id}</small>
                  </div>
                  {isSuperAdmin ? (
                    <label className="admin-role">
                      Role
                      <select
                        aria-label={`Role for ${row.displayName || row.id}`}
                        value={roleById[row.id] || "user"}
                        disabled={
                          !!busy ||
                          !online ||
                          row.id === user.uid ||
                          !!roles.error
                        }
                        onChange={(e) => changeRole(row.id, e.target.value)}
                      >
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      {busy === row.id && <small role="status">Saving…</small>}
                    </label>
                  ) : (
                    <span className="role-badge">
                      {ROLE_LABELS[roleById[row.id]] || "User"}
                    </span>
                  )}
                </article>
              ))}
              {!filtered.length && !users.error && <p>No users found.</p>}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function FeedbackCard({ item, staff, onStatus, busy }) {
  return (
    <article className="panel feedback-card">
      <div className="feedback-heading">
        <span className="eyebrow">
          {item.type === "report" ? "Problem report" : "Suggestion"}
        </span>
        <span className="role-badge">
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

export function FeedbackPage({ inbox = false }) {
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
    if (busy || !app.online) return;
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
    <>
      <PageTitle
        back="/profile"
        eyebrow={inbox ? "ADMINISTRATION" : "HELP US IMPROVE"}
        title={inbox ? "Reports & suggestions." : "Report or suggest."}
      />
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
          {isStaff && (
            <p>
              <Link
                className="text-button"
                to={inbox ? "/feedback" : "/admin/feedback"}
              >
                {inbox ? "Send your own feedback" : "Open admin inbox"}
              </Link>
            </p>
          )}
          {!inbox && (
            <form
              className="panel form-section feedback-form"
              onSubmit={submit}
            >
              <h2>A problem or a possibility?</h2>
              <p>
                Only you, admins and super admins can read your submission.
                Please do not include passwords or sensitive personal
                information.
              </p>
              <label>
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
              <label>
                Title
                <input
                  required
                  maxLength={120}
                  disabled={busy}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="A short summary"
                />
              </label>
              <label>
                Details
                <textarea
                  required
                  maxLength={5000}
                  disabled={busy}
                  rows={6}
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                  placeholder="What happened, or what would you like us to improve?"
                />
              </label>
              <button className="button" disabled={busy || !app.online}>
                {busy ? "Sending…" : "Send feedback"}
              </button>
            </form>
          )}
          {!app.online && (
            <p role="status">Reconnect to send feedback or change a status.</p>
          )}
          {(error || rows.error) && (
            <p className="banner error" role="alert">
              {error || rows.error}
            </p>
          )}
          <div className="section-heading">
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
              <p className="panel form-section">
                {inbox
                  ? "No feedback matches this filter."
                  : "No submissions yet. Send a report or suggestion above."}
              </p>
            )
          )}
        </>
      )}
    </>
  );
}

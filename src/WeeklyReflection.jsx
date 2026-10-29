import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  CloudOff,
  ArrowRight,
  Target,
  BookOpen,
  Shield,
  Edit3,
} from "lucide-react";
import { useApp } from "./store";
import { dateKey, parseDate, statistics, weekDates } from "./domain";
import { CategoryIcon, PageTitle } from "./components";
import {
  reflectionHabits,
  reflectionSignature,
  reflectionValues,
  validReflection,
  reflectionReadSections,
} from "./reflection.js";
const prompts = [
  [
    "worked",
    "What worked?",
    "Keep doing",
    "What helped you show up? A small win, a routine, or a useful reminder.",
  ],
  [
    "hard",
    "What felt difficult?",
    "Learn from",
    "What got in the way? Time, energy, an unclear task, or something else.",
  ],
  [
    "next",
    "One kind adjustment for next week",
    "Try next week",
    "One specific change: “After breakfast, read one page” or “Move workouts to evenings.”",
  ],
];
function ReflectionForm({ id, existing, onDirtyChange }) {
  const app = useApp();
  const [draft, setDraft] = useState(() => reflectionValues(existing));
  const [baseline, setBaseline] = useState(() => reflectionSignature(existing));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(!existing);
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    existing ? reflectionValues(existing) : null,
  );
  const edited = useRef(false);
  const savedView = useRef(null);
  const focusSavedView = useRef(false);
  const serverSignature = reflectionSignature(existing);
  const signature = reflectionSignature(draft);
  const dirty = signature !== baseline;
  const remoteChanged =
    serverSignature !== baseline && serverSignature !== signature;
  useEffect(() => {
    if (!edited.current || !dirty) {
      setDraft(reflectionValues(existing));
      setBaseline(serverSignature);
      if (existing) {
        setSavedSnapshot(reflectionValues(existing));
        if (!savedSnapshot && !edited.current) setEditing(false);
      } else if (savedSnapshot) {
        setSavedSnapshot(null);
        setEditing(true);
      }
    }
  }, [serverSignature, existing?.id]);
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    const warn = (event) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (!editing && focusSavedView.current && savedView.current) {
      focusSavedView.current = false;
      savedView.current.focus({ preventScroll: true });
      savedView.current.scrollIntoView({ block: "nearest", behavior: "auto" });
    }
  }, [editing]);
  async function save(event) {
    event.preventDefault();
    if (saving || !dirty || (app.user && !app.online)) return;
    if (!validReflection(draft)) {
      setError("Keep each answer under 2,000 characters.");
      return;
    }
    if (
      remoteChanged &&
      !window.confirm(
        "This reflection changed in another session. Replace that saved version with your draft?",
      )
    )
      return;
    setSaving(true);
    setError("");
    try {
      await app.persist("weeklyReviews", id, {
        weekStart: id,
        ...draft,
        updatedAt: Date.now(),
      });
      setBaseline(signature);
      setSavedSnapshot(reflectionValues(draft));
      focusSavedView.current = true;
      setEditing(false);
      setSaved(true);
      edited.current = false;
      app.setNotice(
        app.user ? "Reflection saved." : "Reflection saved on this device.",
      );
    } catch (error) {
      setError(`Could not save. Your draft is still here. ${error.message}`);
    } finally {
      setSaving(false);
    }
  }
  function editReflection() {
    const value = reflectionValues(savedSnapshot);
    setDraft(value);
    setBaseline(reflectionSignature(value));
    setError("");
    edited.current = false;
    setEditing(true);
  }
  function cancelEditing() {
    if (dirty && !window.confirm("Discard your unsaved reflection changes?"))
      return;
    const value =
      remoteChanged && existing
        ? reflectionValues(existing)
        : reflectionValues(savedSnapshot);
    setDraft(value);
    setBaseline(reflectionSignature(value));
    setSavedSnapshot(value);
    setError("");
    edited.current = false;
    focusSavedView.current = true;
    setEditing(false);
  }
  if (!editing && savedSnapshot) {
    const sections = reflectionReadSections(savedSnapshot);
    return (
      <section
        className="panel reflection-saved"
        ref={savedView}
        tabIndex={-1}
        aria-label="Saved weekly reflection"
      >
        <header>
          <div>
            <h2>Your reflection</h2>
            <span className="reflection-saved-indicator">
              <Check size={12} />
              Saved
            </span>
          </div>
          <button
            type="button"
            className="button secondary"
            aria-label="Edit reflection"
            disabled={saving}
            onClick={editReflection}
          >
            <Edit3 size={15} />
            Edit
          </button>
        </header>
        <div className="reflection-saved-content">
          {sections.length ? (
            sections.map((section) => (
              <section
                key={section.key}
                className={`reflection-saved-section ${section.key}`}
              >
                <h3>{section.label}</h3>
                <p>{section.text}</p>
              </section>
            ))
          ) : (
            <p className="reflection-saved-empty">No notes recorded.</p>
          )}
        </div>
        <footer>
          {app.user ? "Saved to your account" : "Saved on this device"}
        </footer>
      </section>
    );
  }
  const answered = Object.values(draft).filter((value) => value.trim()).length;
  return (
    <form className="panel reflection-editor" onSubmit={save}>
      <header>
        <div>
          <h2>Your reflection</h2>
          <p>A few lines are enough. Every prompt is optional.</p>
        </div>
        <span className="reflection-answered">{answered}/3 answered</span>
      </header>
      {prompts.map(([key, label, hint, placeholder], index) => (
        <div className="reflection-prompt" key={key}>
          <div className="reflection-prompt-heading">
            <span className="reflection-prompt-number">0{index + 1}</span>
            <label htmlFor={`reflection-${key}`}>
              {label}
              <small>{hint}</small>
            </label>
          </div>
          <textarea
            id={`reflection-${key}`}
            value={draft[key]}
            rows={3}
            maxLength={2000}
            disabled={saving}
            placeholder={placeholder}
            onChange={(event) => {
              edited.current = true;
              setSaved(false);
              setDraft({ ...draft, [key]: event.target.value });
            }}
          />
          <small className="reflection-character-count">
            {draft[key].length.toLocaleString()} / 2,000
          </small>
        </div>
      ))}
      {error && (
        <p className="banner error" role="alert">
          {error}
        </p>
      )}
      {remoteChanged && dirty && (
        <p className="reflection-warning" role="status">
          A newer saved version is available. Saving will ask before replacing
          it.
        </p>
      )}
      {app.user && !app.online && (
        <p className="reflection-warning" role="status">
          <CloudOff size={14} />
          Reconnect to save. Keep this page open to retain your draft.
        </p>
      )}
      <footer>
        <span
          className="reflection-save-status"
          role="status"
          aria-live="polite"
        >
          {saving
            ? "Saving…"
            : dirty
              ? "Unsaved changes"
              : saved || existing
                ? app.user
                  ? "Saved to your account"
                  : "Saved on this device"
                : "Not saved yet"}
        </span>
        <div className="reflection-editor-actions">
          {savedSnapshot && (
            <button
              type="button"
              className="button secondary"
              disabled={saving}
              onClick={cancelEditing}
            >
              Cancel
            </button>
          )}
          <button
            className="button"
            disabled={
              saving ||
              !dirty ||
              (!existing && !answered) ||
              (!!app.user && !app.online)
            }
          >
            <Check size={16} />
            {saving ? "Saving…" : "Save my reflection"}
          </button>
        </div>
      </footer>
    </form>
  );
}
export function WeeklyReflection() {
  const app = useApp();
  const [offset, setOffset] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);
  const keys = weekDates(offset),
    id = keys[0],
    today = dateKey();
  const existing = app.weeklyReviews.find((row) => row.id === id);
  const previous = app.weeklyReviews.find(
    (row) => row.id === weekDates(offset - 1)[0],
  );
  const stats = statistics(
    app.tasks,
    app.progress,
    keys.filter((day) => day <= today),
  );
  const habits = reflectionHabits(app.tasks, app.progress, keys, today);
  const total = habits.reduce((sum, row) => sum + row.scheduled, 0);
  const recent = app.weeklyReviews
    .filter(
      (row) => /^\d{4}-\d{2}-\d{2}$/.test(row.id) && row.id <= weekDates()[0],
    )
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 12);
  const dateLabel = (day) =>
    parseDate(day).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const confirmLeave = () =>
    !hasDraft ||
    window.confirm(
      "Leave this unsaved reflection? Save it first if you want to keep your changes.",
    );
  const navigate = (next) => {
    if (confirmLeave()) {
      setHasDraft(false);
      setOffset(next);
    }
  };
  const protectLink = (event) => {
    if (!confirmLeave()) event.preventDefault();
  };
  return (
    <div className="weekly-reflection-page">
      <PageTitle title="Weekly reflection" />
      <div className="reflection-week-toolbar">
        <div className="period-navigation">
          <button
            className="icon-button"
            aria-label="Previous review week"
            onClick={() => navigate(offset - 1)}
          >
            <ChevronLeft size={19} />
          </button>
          <h2>
            {dateLabel(id)} —{" "}
            {parseDate(keys[6]).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </h2>
          <button
            className="icon-button"
            aria-label="Next review week"
            disabled={offset >= 0}
            onClick={() => navigate(offset + 1)}
          >
            <ChevronRight size={19} />
          </button>
        </div>
        <div className="reflection-week-actions">
          {offset !== 0 && (
            <button className="text-button" onClick={() => navigate(0)}>
              Current week
            </button>
          )}
          <select
            aria-label="Open saved reflection"
            value=""
            onChange={(event) => {
              if (event.target.value)
                navigate(
                  Math.round(
                    (parseDate(event.target.value) -
                      parseDate(weekDates()[0])) /
                      604800000,
                  ),
                );
            }}
          >
            <option value="" disabled>
              Saved reflections
            </option>
            {recent.map((row) => (
              <option value={row.id} key={row.id}>
                {dateLabel(row.id)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="reflection-week-summary" aria-label="Week summary">
        {[
          [stats.daysWon, "Days won"],
          [stats.tasksWon, "Habit completions"],
          [total, "Scheduled habit-days"],
        ].map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="reflection-workspace">
        <ReflectionForm
          key={`${app.user?.uid || "guest"}:${id}`}
          id={id}
          existing={existing}
          onDirtyChange={setHasDraft}
        />
        <aside className="reflection-context">
          {previous?.next?.trim() && (
            <section className="panel reflection-context-card">
              <header>
                <BookOpen size={17} />
                <h2>Last week’s next step</h2>
              </header>
              <p className="reflection-previous-plan">{previous.next}</p>
              <small>What happened when you tried it?</small>
            </section>
          )}
          <section className="panel reflection-context-card">
            <header>
              <Target size={17} />
              <h2>Your week at a glance</h2>
            </header>
            <p className="reflection-context-note">
              Completed / scheduled, through{" "}
              {dateLabel(keys.filter((day) => day <= today).at(-1) || id)}.
            </p>
            {habits.length ? (
              <ul className="reflection-habit-list">
                {habits.map((row) => (
                  <li key={row.id}>
                    <CategoryIcon category={row.category} />
                    <div>
                      <strong>{row.name}</strong>
                      <span
                        className="reflection-habit-track"
                        aria-hidden="true"
                      >
                        <i
                          style={{ width: `${Math.round(row.rate * 100)}%` }}
                        />
                      </span>
                    </div>
                    <span
                      aria-label={`${row.completed} of ${row.scheduled} scheduled days completed`}
                    >
                      {row.completed}/{row.scheduled}
                    </span>
                    {row.editable && (
                      <Link
                        className="icon-button"
                        aria-label={`Adjust ${row.name}`}
                        title="Adjust habit"
                        to={`/habits/${row.id}/edit`}
                        onClick={protectLink}
                      >
                        <Edit3 size={15} />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="reflection-context-note">
                No scheduled habits recorded for this week yet.
              </p>
            )}
            <Link className="help-inline-link" to="/week" onClick={protectLink}>
              Open weekly progress <ArrowRight size={14} />
            </Link>
          </section>
          <div className="reflection-private-note">
            <Shield size={14} />
            <span>Private to you. Changes to habits are made separately.</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

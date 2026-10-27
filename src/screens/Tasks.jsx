import React, { useState, useEffect, useMemo } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import {
  Home,
  BarChart3,
  Plus,
  Layers,
  User,
  ArrowRight,
  ArrowLeft,
  Check,
  ChevronRight,
  ChevronLeft,
  Flame,
  Mountain,
  BookOpen,
  Sparkles,
  Settings,
  LogOut,
  Search,
  Star,
  Bookmark,
  Trash2,
  Edit3,
  X,
  Sun,
  Moon,
  Monitor,
  Cloud,
  CloudOff,
  Download,
  Bell,
  Shield,
  HelpCircle,
  Menu,
  Target,
  Calendar,
  Heart,
  Trophy,
  RefreshCw,
} from "lucide-react";
import {
  AppProvider,
  useApp,
  usePublicTemplates,
  templateStats,
  reviewTemplate,
  listenReviews,
  recordUsage,
  loadPublicTemplate,
} from "../store";
import {
  WEEKDAYS,
  CATEGORIES,
  LEVELS,
  dateKey,
  daysBack,
  weekDates,
  scheduled,
  achieved,
  dayStatus,
  statistics,
  newRequirement,
  validateTask,
  starterTemplates,
  exemplar,
  parseDate,
  totalWork,
  progressId,
} from "../domain";
import {
  cx,
  CategoryIcon,
  Tier,
  Empty,
  PageTitle,
  Stats,
  RequirementText,
  Progression,
  Avatar,
} from "../components";
export function TaskEditor({ templateMode = false }) {
  const app = useApp(),
    { id } = useParams(),
    navigate = useNavigate(),
    location = useLocation();
  const source = id
    ? (templateMode ? app.templates : app.tasks).find((t) => t.id === id)
    : location.state?.template;
  const [form, setForm] = useState(() =>
    source
      ? {
          ...source,
          name: source.name,
          levels: source.levels.map((rows) =>
            rows.map((r) => ({ ...r, id: id ? r.id : crypto.randomUUID() })),
          ),
        }
      : {
          name: "",
          description: "",
          category: "Fitness",
          weekdays: [1, 2, 3, 4, 5],
          active: true,
          levels: [[newRequirement()], [newRequirement()], [newRequirement()]],
        },
  );
  const [preview, setPreview] = useState(false),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [confirmed, setConfirmed] = useState(false);
  if (id && !source)
    return (
      <Empty
        title="Task not found"
        action={
          <Link className="button" to="/profile">
            My tasks
          </Link>
        }
      >
        This item may have been removed.
      </Empty>
    );
  function updateRequirement(i, ri, patch) {
    setForm((f) => ({
      ...f,
      levels: f.levels.map((rows, j) =>
        j !== i
          ? rows
          : rows.map((r, k) => (k === ri ? { ...r, ...patch } : r)),
      ),
    }));
  }
  async function save(e) {
    e.preventDefault();
    const validation = validateTask(form);
    if (validation) {
      setError(validation);
      return;
    }
    if (!confirmed) {
      setError(
        "Confirm that T2 and T3 describe additional effort, not cumulative totals.",
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      const taskId = id || crypto.randomUUID(),
        key = dateKey();
      const history = (id ? source?.scheduleHistory || [] : []).filter(
        (h) => h.from !== key,
      );
      history.push({
        from: key,
        weekdays: form.weekdays,
        active: form.active !== false,
      });
      const value = {
        name: form.name.trim(),
        description: form.description || "",
        category: form.category,
        weekdays: form.weekdays,
        levels: form.levels.map((rows) =>
          rows.map((r) => ({
            ...r,
            label: r.label.trim(),
            unit: r.unit.trim(),
            amount: Number(r.amount),
          })),
        ),
        active: form.active !== false,
        createdDay: (id ? source?.createdDay : null) || key,
        scheduleHistory: history,
        sourceTemplateId:
          source?.sourceTemplateId ||
          (!id && source?.id ? source.id : null) ||
          null,
        ...(templateMode ? { published: source?.published || false } : {}),
      };
      await app.persist(templateMode ? "templates" : "tasks", taskId, value);
      if (!templateMode && !id && source?.id)
        await recordUsage(source.id, app.user).catch(() =>
          app.setNotice("Task saved. Template usage could not sync."),
        );
      app.setNotice(
        templateMode
          ? "Personal template saved. Publish it from My Templates when ready."
          : id
            ? "Task updated. Past sessions keep their original levels."
            : "A small promise, ready for you.",
      );
      navigate(templateMode ? "/templates?tab=mine" : "/");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageTitle
        back={templateMode ? "/templates" : "/profile"}
        eyebrow={templateMode ? "YOUR OWN BLUEPRINT" : "MAKE IT ACHIEVABLE"}
        title={`${id ? "Edit" : source ? "Customize" : "Create"} ${templateMode ? "template" : "task"}`}
      />
      <form className="editor-layout" onSubmit={save}>
        <div className="editor-main">
          <section className="panel form-section">
            <h2>A small promise to yourself</h2>
            <label>
              Task name
              <input
                maxLength={80}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Move a little"
                required
              />
            </label>
            <label>
              Category
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            {templateMode && (
              <label>
                Description
                <textarea
                  maxLength={600}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Who is this for? What makes the minimum approachable?"
                />
              </label>
            )}
            <label>Show up on</label>
            <div className="weekday-picker">
              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                <button
                  type="button"
                  aria-pressed={form.weekdays.includes(day)}
                  key={day}
                  className={form.weekdays.includes(day) ? "selected" : ""}
                  onClick={() =>
                    setForm({
                      ...form,
                      weekdays: form.weekdays.includes(day)
                        ? form.weekdays.filter((d) => d !== day)
                        : [...form.weekdays, day],
                    })
                  }
                >
                  {WEEKDAYS[day]}
                </button>
              ))}
            </div>
          </section>
          {form.levels.map((rows, i) => (
            <section className="panel form-section" key={i}>
              <div className="level-heading">
                <Tier level={i + 1} />
                <div>
                  <h2>{LEVELS[i]}</h2>
                  <p>
                    {i === 0
                      ? "Small enough for a hard day. This alone is a win."
                      : `Only additional effort after T${i}. Always optional.`}
                  </p>
                </div>
              </div>
              {rows.map((r, ri) => (
                <div className="requirement-editor" key={r.id}>
                  <label className="requirement-label">
                    {i > 0 ? "Additional activity" : "Activity"}
                    <input
                      aria-label={`T${i + 1} activity ${ri + 1}`}
                      maxLength={80}
                      value={r.label}
                      onChange={(e) =>
                        updateRequirement(i, ri, { label: e.target.value })
                      }
                      placeholder={i === 0 ? "Push-ups" : "More push-ups"}
                      required
                    />
                  </label>
                  <label>
                    Amount
                    <input
                      aria-label={`T${i + 1} amount ${ri + 1}`}
                      type="number"
                      min="0.01"
                      max="100000"
                      step="0.01"
                      value={r.amount}
                      onChange={(e) =>
                        updateRequirement(i, ri, { amount: e.target.value })
                      }
                      required
                    />
                  </label>
                  <label>
                    Unit
                    <input
                      aria-label={`T${i + 1} unit ${ri + 1}`}
                      maxLength={24}
                      value={r.unit}
                      onChange={(e) =>
                        updateRequirement(i, ri, { unit: e.target.value })
                      }
                      placeholder="reps"
                      required
                    />
                  </label>
                  <button
                    disabled={rows.length === 1}
                    type="button"
                    className="icon-button danger"
                    aria-label={`Remove T${i + 1} requirement ${ri + 1}`}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        levels: f.levels.map((rr, j) =>
                          i === j ? rr.filter((x) => x.id !== r.id) : rr,
                        ),
                      }))
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={rows.length >= 4}
                className="text-button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    levels: f.levels.map((rr, j) =>
                      i === j ? [...rr, newRequirement()] : rr,
                    ),
                  }))
                }
              >
                <Plus size={16} />
                Add requirement
              </button>
            </section>
          ))}
          <label className="confirm-row">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>
              T2 and T3 are additional amounts, not totals. My T1 is achievable
              on a difficult day.
            </span>
          </label>
          {error && (
            <p role="alert" className="inline-error">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button disabled={saving} className="button">
              {saving
                ? "Saving…"
                : `Save ${templateMode ? "template" : "task"}`}
              <Check size={17} />
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => setPreview(!preview)}
            >
              {preview ? "Hide preview" : "Preview progression"}
            </button>
          </div>
        </div>
        <aside className={cx("editor-aside", preview && "preview-visible")}>
          <div className="sticky">
            <span className="eyebrow">YOUR PROGRESSION</span>
            <h2>{form.name || "One small promise"}</h2>
            <Progression task={form} />
            <p className="muted">
              T1 is the destination. T2 and T3 are the scenic route.
            </p>
          </div>
        </aside>
      </form>
    </>
  );
}
export function TaskFlow() {
  const app = useApp(),
    { id } = useParams(),
    navigate = useNavigate();
  const task = app.tasks.find((t) => t.id === id),
    key = dateKey(),
    stored = app.progress.find((p) => p.id === progressId(id, key));
  const [p, setP] = useState(stored),
    [level, setLevel] = useState(
      stored ? Math.min(achieved(stored) + 1, 3) : 1,
    ),
    [phase, setPhase] = useState(
      stored && achieved(stored) > 0 ? "summary" : "work",
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    if (!task || stored) return;
    app
      .begin(task, key)
      .then((value) => {
        if (!cancelled) setP(value);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id, !!task, !!stored]);
  useEffect(() => {
    if (stored) setP(stored);
  }, [stored]);
  if (!task)
    return (
      <Empty
        title="Task not found"
        action={
          <Link className="button" to="/">
            Today
          </Link>
        }
      >
        This task is no longer available.
      </Empty>
    );
  if (!p)
    return (
      <div className="loading">
        <Mountain />
        <h2>{error ? "Unable to start" : "A small step begins here…"}</h2>
        {error && (
          <>
            <p className="inline-error">{error}</p>
            <button className="button" onClick={() => window.location.reload()}>
              Try again
            </button>
            <Link to="/">Back to today</Link>
          </>
        )}
      </div>
    );
  const a = achieved(p),
    rows = p.snapshot.levels[level - 1];
  async function toggle(r) {
    if (p.checks[r.id] || busy) return;
    setBusy(true);
    try {
      const next = await app.check(p, r.id);
      setP(next);
      if (achieved(next) > a) setPhase("celebrate");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flow-container">
      <Link className="back-link" to="/">
        <ArrowLeft size={18} /> Back to my day
      </Link>
      <div className={cx("flow-card", phase === "celebrate" && "celebrating")}>
        <div className="flow-landscape">
          <span className="eyebrow">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </span>
          <h1>{p.snapshot.name}</h1>
          <span>
            {phase === "work"
              ? `Today · T${level}`
              : phase === "celebrate"
                ? "A promise kept."
                : "Your story today."}
          </span>
          <div className="mountain-emblem">
            <Mountain size={70} />
          </div>
        </div>
        <div className="flow-body">
          {phase === "work" ? (
            <>
              <div className="level-heading">
                <Tier level={level} />
                <div>
                  <h2>{LEVELS[level - 1]}</h2>
                  <p>
                    {level === 1
                      ? "Do these to win this task today."
                      : "Only these extra steps. Your minimum is already won."}
                  </p>
                </div>
              </div>
              <div className="requirements">
                {rows.map((r) => (
                  <button
                    key={r.id}
                    disabled={busy || p.checks[r.id]}
                    className={cx(
                      "requirement-check",
                      p.checks[r.id] && "checked",
                    )}
                    onClick={() => toggle(r)}
                  >
                    <span className="checkbox">
                      {p.checks[r.id] && <Check size={16} />}
                    </span>
                    <span>
                      <RequirementText r={r} additional={level > 1} />
                    </span>
                    <span>
                      {p.checks[r.id]
                        ? `${r.amount}/${r.amount}`
                        : `0/${r.amount}`}
                    </span>
                  </button>
                ))}
              </div>
              <div className="gentle-tip">
                <Sparkles size={18} />
                <p>
                  {level === 1
                    ? "Keep it easy. Take short breaks if you need to. Mark each requirement once you have done it."
                    : `You've already won T1. These are extras, never obligations.`}
                </p>
              </div>
              <button
                className="button secondary full"
                onClick={() => navigate("/")}
              >
                Save my place & leave
              </button>
            </>
          ) : phase === "celebrate" ? (
            <div className="celebration-content">
              <div className={`celebration-orb orb-${a}`}>
                <Tier level={a} />
                <span>✦</span>
                <span>✧</span>
              </div>
              <span className="eyebrow">
                {a === 1
                  ? "YOU KEPT YOUR PROMISE"
                  : a === 2
                    ? "A LITTLE EXTRA MOMENTUM"
                    : "YOU WENT THE EXTRA MILE"}
              </span>
              <h2>
                {a === 1 ? "Task Won!" : a === 2 ? "Bigger Win!" : "Full Win!"}
              </h2>
              <p>
                {a === 1
                  ? "Your minimum is won. That is enough."
                  : a === 2
                    ? "More than your minimum. Be proud of that."
                    : "You showed up. You went all the way."}
              </p>
              <Stats
                items={rows.map((r) => [`${r.amount} ${r.unit}`, r.label])}
              />
              {a < 3 && (
                <button
                  className="button full"
                  onClick={() => {
                    setLevel(a + 1);
                    setPhase("work");
                  }}
                >
                  Continue to T{a + 1} · optional
                  <ArrowRight size={17} />
                </button>
              )}
              <button
                className={cx("button full", a < 3 && "secondary")}
                onClick={() => navigate("/")}
              >
                I'm Done for Today
                <Check size={17} />
              </button>
              <button
                className="text-button"
                onClick={() => setPhase("summary")}
              >
                View my task summary
                <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <>
              <span className="eyebrow">YOUR WINS, NOT YOUR TO-DO LIST</span>
              <h2>You showed up.</h2>
              <div className="summary-levels">
                {p.snapshot.levels.slice(0, a).map((rr, i) => (
                  <div className="panel" key={i}>
                    <Tier level={i + 1} />
                    <div>
                      <h3>{LEVELS[i]} won</h3>
                      <p>
                        {rr
                          .map(
                            (r) =>
                              `${i > 0 ? "+ " : ""}${r.amount} ${r.unit} ${r.label}`,
                          )
                          .join(" · ")}
                      </p>
                    </div>
                    <Check size={18} />
                  </div>
                ))}
              </div>
              <h3>Total work today</h3>
              <Stats
                items={totalWork(p).map((r) => [
                  `${r.amount} ${r.unit}`,
                  r.label,
                ])}
              />
              {a < 3 && (
                <button
                  className="button full"
                  onClick={() => {
                    setLevel(a + 1);
                    setPhase("work");
                  }}
                >
                  Want to add a little? T{a + 1}
                  <ArrowRight size={17} />
                </button>
              )}
              <Link className="button secondary full" to="/">
                Done for today
              </Link>
            </>
          )}
          {error && (
            <p role="alert" className="inline-error">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

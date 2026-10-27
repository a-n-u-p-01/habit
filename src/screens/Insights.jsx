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
export function Week() {
  const app = useApp();
  const [offset, setOffset] = useState(0),
    keys = weekDates(offset),
    stats = statistics(app.tasks, app.progress, keys),
    today = dateKey();
  const visibleTasks = app.tasks.filter((t) =>
    keys.some(
      (k) =>
        scheduled(t, k) ||
        app.progress.some((p) => p.date === k && p.taskId === t.id),
    ),
  );
  return (
    <>
      <PageTitle
        eyebrow="SHOWING UP ADDS UP"
        title="Your week, in small wins."
      />
      <div className="period-navigation">
        <button
          className="icon-button"
          aria-label="Previous week"
          onClick={() => setOffset(offset - 1)}
        >
          <ChevronLeft />
        </button>
        <h2>
          {parseDate(keys[0]).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}{" "}
          —{" "}
          {parseDate(keys[6]).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </h2>
        <button
          className="icon-button"
          aria-label="Next week"
          disabled={offset >= 0}
          onClick={() => setOffset(offset + 1)}
        >
          <ChevronRight />
        </button>
      </div>
      <div className="panel week-table-wrap">
        <table className="week-table">
          <thead>
            <tr>
              <th>Your promises</th>
              {keys.map((k) => (
                <th className={k === today ? "today-col" : ""} key={k}>
                  <small>{WEEKDAYS[parseDate(k).getDay()]}</small>
                  {parseDate(k).getDate()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleTasks.map((t) => (
              <tr key={t.id}>
                <th>
                  <CategoryIcon category={t.category} />
                  {t.name}
                </th>
                {keys.map((k) => {
                  const p = app.progress.find(
                      (p) => p.taskId === t.id && p.date === k,
                    ),
                    a = achieved(p),
                    s = scheduled(t, k) || p?.scheduled;
                  return (
                    <td
                      key={k}
                      title={
                        a
                          ? `T${a} won`
                          : !s
                            ? "Not scheduled"
                            : k > today
                              ? "Coming up"
                              : k === today
                                ? "A chance to show up"
                                : "A fresh start is always ahead"
                      }
                    >
                      {a ? (
                        <span className={`grid-win t${a}`}>
                          {a === 1 ? <Check size={15} /> : <>T{a}</>}
                        </span>
                      ) : s ? (
                        <span className={cx("grid-empty", k < today && "past")}>
                          {k < today ? "·" : ""}
                        </span>
                      ) : (
                        <span className="not-scheduled">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {!visibleTasks.length && (
          <Empty title="A week of possibilities">
            No scheduled tasks in this week.
          </Empty>
        )}
        <div className="legend">
          <span>
            <i className="legend-dot t1" />
            Minimum win
          </span>
          <span>
            <i className="legend-dot t2" />
            Bigger win
          </span>
          <span>
            <i className="legend-dot t3" />
            Full win
          </span>
          <span>· A fresh start ahead</span>
          <span>— Not scheduled</span>
        </div>
      </div>
      <Stats
        items={[
          [stats.daysWon, "Days Won"],
          [stats.tasksWon, "Tasks Won"],
          [stats.t3, "Full Wins"],
        ]}
      />
      <div className="panel reflection-callout">
        <Sparkles />
        <div>
          <h2>What made showing up easier?</h2>
          <p>A quick reflection helps you make next week a little kinder.</p>
        </div>
        <Link className="button secondary" to="/review">
          Weekly review
          <ArrowRight size={17} />
        </Link>
      </div>
    </>
  );
}
export function Analytics() {
  const { tasks, progress } = useApp();
  const [period, setPeriod] = useState(30);
  const keys = useMemo(() => daysBack(period), [period, dateKey()]),
    previousKeys = daysBack(
      period,
      new Date(parseDate(keys[0]).getTime() - 86400000),
    ),
    s = statistics(tasks, progress, keys),
    previous = statistics(tasks, progress, previousKeys);
  const consistency = tasks
    .filter((t) => !t.deletedDay || keys.some((k) => scheduled(t, k)))
    .map((t) => {
      const expected = keys.filter(
        (k) =>
          scheduled(t, k) ||
          progress.some(
            (p) => p.taskId === t.id && p.date === k && p.scheduled,
          ),
      );
      const count = expected.filter((k) =>
        progress.some(
          (p) => p.taskId === t.id && p.date === k && achieved(p) > 0,
        ),
      ).length;
      return {
        ...t,
        percent: expected.length
          ? Math.round((count / expected.length) * 100)
          : 0,
        count,
        total: expected.length,
      };
    })
    .filter((t) => t.total);
  const heat = daysBack(84);
  const eligible = keys.filter(
    (k) => dayStatus(tasks, progress, k).total > 0,
  ).length;
  return (
    <>
      <PageTitle
        eyebrow="ONLY COMPARE WITH YOUR PAST SELF"
        title="Look how far you've come."
      >
        <select
          aria-label="Progress period"
          value={period}
          onChange={(e) => setPeriod(Number(e.target.value))}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </PageTitle>
      <Stats
        items={[
          [s.daysWon, "Days Won"],
          [s.tasksWon, "Tasks Won"],
          [s.t3, "T3 Wins"],
        ]}
      />
      <div className="analytics-grid">
        <section className="panel chart-panel">
          <span className="eyebrow">THE PROMISE IS THE PROGRESS</span>
          <h2>Days you won</h2>
          <div className="ring-layout">
            <div
              className="progress-ring"
              style={{
                "--angle": `${eligible ? (s.daysWon / eligible) * 360 : 0}deg`,
              }}
            >
              <div>
                <strong>
                  {eligible ? Math.round((s.daysWon / eligible) * 100) : 0}%
                </strong>
                <span>of scheduled days</span>
              </div>
            </div>
            <div>
              <h3>
                {s.daysWon} of {eligible} days
              </h3>
              <p className="muted">
                {s.daysWon === previous.daysWon
                  ? "Your own pace. Your own progress."
                  : `${Math.abs(s.daysWon - previous.daysWon)} ${s.daysWon > previous.daysWon ? "more" : "fewer"} days won than the previous ${period} days.`}
              </p>
              <small>
                No scheduled tasks? Rest days don't lower your rate.
              </small>
            </div>
          </div>
        </section>
        <section className="panel chart-panel">
          <span className="eyebrow">HIGHEST LEVEL PER TASK-DAY</span>
          <h2>Your wins, by level</h2>
          <div className="distribution">
            {s.distribution.map((n, i) => (
              <div key={i}>
                <Tier level={i + 1} />
                <div className="bar-track">
                  <i
                    className={`t${i + 1}`}
                    style={{
                      width: `${s.tasksWon ? (n / s.tasksWon) * 100 : 0}%`,
                    }}
                  />
                </div>
                <strong>{n}</strong>
              </div>
            ))}
          </div>
          <p className="muted">A minimum win is still a whole win.</p>
        </section>
        <section className="panel chart-panel">
          <span className="eyebrow">THE LAST 12 WEEKS</span>
          <h2>Small steps leave a trail.</h2>
          <div className="heatmap">
            {heat.map((k) => {
              const d = dayStatus(tasks, progress, k);
              return (
                <div
                  key={k}
                  tabIndex={0}
                  title={`${parseDate(k).toLocaleDateString()}: ${d.won}/${d.total} tasks won`}
                  aria-label={`${k}: ${d.won} of ${d.total} tasks won`}
                  className={cx(
                    "heat-cell",
                    d.dayWon ? "heat-won" : d.won ? "heat-some" : "",
                  )}
                />
              );
            })}
          </div>
          <div className="legend">
            <span>Less</span>
            <i className="heat-cell" />
            <i className="heat-cell heat-some" />
            <i className="heat-cell heat-won" />
            <span>More</span>
          </div>
        </section>
        <section className="panel chart-panel">
          <span className="eyebrow">SHOWING UP, YOUR WAY</span>
          <h2>Task consistency</h2>
          {consistency.length ? (
            consistency.map((t) => (
              <div className="consistency" key={t.id}>
                <CategoryIcon category={t.category} />
                <div>
                  <span>{t.name}</span>
                  <div className="bar-track">
                    <i style={{ width: `${t.percent}%` }} />
                  </div>
                </div>
                <strong>{t.percent}%</strong>
                <small>
                  {t.count}/{t.total}
                </small>
              </div>
            ))
          ) : (
            <p className="muted">
              Your task history will grow here. No need to rush.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
export function WeeklyReview() {
  const app = useApp(),
    [offset, setOffset] = useState(0),
    keys = weekDates(offset),
    id = keys[0],
    existing = app.weeklyReviews.find((r) => r.id === id),
    [worked, setWorked] = useState(""),
    [hard, setHard] = useState(""),
    [next, setNext] = useState(""),
    [saving, setSaving] = useState(false),
    stats = statistics(app.tasks, app.progress, keys);
  useEffect(() => {
    setWorked(existing?.worked || "");
    setHard(existing?.hard || "");
    setNext(existing?.next || "");
  }, [id, existing?.id]);
  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await app.persist("weeklyReviews", id, {
        weekStart: id,
        worked,
        hard,
        next,
      });
      app.setNotice("Reflection saved. A little learning goes a long way.");
    } catch {
    } finally {
      setSaving(false);
    }
  }
  const suggestions = app.tasks
    .filter((t) => !t.deletedDay && t.active !== false)
    .filter((t) => {
      const scheduledDays = keys.filter(
        (k) => k <= dateKey() && scheduled(t, k),
      );
      return (
        scheduledDays.length >= 3 &&
        scheduledDays.filter((k) =>
          app.progress.some(
            (p) => p.taskId === t.id && p.date === k && achieved(p) > 0,
          ),
        ).length /
          scheduledDays.length <
          0.5
      );
    });
  return (
    <>
      <PageTitle
        back="/profile"
        eyebrow="A PAUSE, NOT A PERFORMANCE REVIEW"
        title="What did this week teach you?"
      />
      <div className="period-navigation">
        <button
          className="icon-button"
          aria-label="Previous review week"
          onClick={() => setOffset(offset - 1)}
        >
          <ChevronLeft />
        </button>
        <h3>
          Week of{" "}
          {parseDate(id).toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
          })}
        </h3>
        <button
          className="icon-button"
          aria-label="Next review week"
          disabled={offset >= 0}
          onClick={() => setOffset(offset + 1)}
        >
          <ChevronRight />
        </button>
      </div>
      <Stats
        items={[
          [stats.daysWon, "Days Won"],
          [stats.tasksWon, "Tasks Won"],
          [stats.t3, "Full Wins"],
        ]}
      />
      <div className="detail-layout">
        <form className="panel form-section" onSubmit={save}>
          <label>
            What worked?
            <textarea
              maxLength={2000}
              value={worked}
              onChange={(e) => setWorked(e.target.value)}
              placeholder="What made showing up easier?"
            />
          </label>
          <label>
            What felt difficult?
            <textarea
              maxLength={2000}
              value={hard}
              onChange={(e) => setHard(e.target.value)}
              placeholder="No judgment. Just noticing."
            />
          </label>
          <label>
            One kind adjustment for next week
            <textarea
              maxLength={2000}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="Maybe a smaller T1, or a different schedule."
            />
          </label>
          <button className="button" disabled={saving}>
            {saving ? "Saving…" : "Save my reflection"}
            <Check size={17} />
          </button>
        </form>
        <section>
          <div className="panel reminder-card">
            <Sparkles size={26} />
            <h2>
              Make the minimum
              <br />
              <em>more possible.</em>
            </h2>
            <p>
              If T1 keeps feeling hard, make it smaller. Recalibrating is a
              skill, not a setback.
            </p>
          </div>
          {suggestions.map((t) => (
            <Link
              key={t.id}
              className="panel recalibrate"
              to={`/tasks/${t.id}/edit`}
            >
              <span>
                <h3>{t.name}</h3>
                <p>Could a smaller T1 help next week?</p>
              </span>
              <Edit3 size={18} />
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}

import { pastEntryInfo } from "../history";
import { PastCompletionDialog } from "../PastCompletionDialog";
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useLayoutEffect,
} from "react";
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
  const [correction, setCorrection] = useState(null);
  const tableScroll = useRef(null);
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
  useLayoutEffect(() => {
    const scroller = tableScroll.current;
    if (!scroller) return;
    const current = scroller.querySelector("thead .today-col");
    const pinned = scroller.querySelector("thead th:first-child");
    if (offset !== 0 || !current || !pinned) {
      scroller.scrollLeft = 0;
      return;
    }
    const pinnedWidth = pinned.getBoundingClientRect().width;
    const cell = current.getBoundingClientRect();
    const left =
      cell.left - scroller.getBoundingClientRect().left + scroller.scrollLeft;
    // Center today only in the space to the right of the pinned habit column.
    // No scrollIntoView: that can move the entire page horizontally.
    scroller.scrollLeft = Math.max(
      0,
      left -
        pinnedWidth -
        (scroller.clientWidth - pinnedWidth - cell.width) / 2,
    );
  }, [offset, today]);
  return (
    <div className="week-page">
      <PageTitle title="This week" />
      <div className="week-toolbar">
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
        <details className="habit-controls-help week-guide">
          <summary
            aria-label="Weekly progress help"
            title="Weekly progress help"
          >
            <HelpCircle size={18} />
          </summary>
          <div className="habit-help-popover">
            <strong>Weekly progress</strong>
            <p>T1 is your daily minimum. T2 and T3 are optional extra tiers.</p>
            <p>
              Select an eligible day from the previous seven days to record
              completed work. Rest days and older dates are read-only.
            </p>
            <p>A dot is not yet completed; a dash is not scheduled.</p>
            <Link to="/help">Open help & feedback</Link>
          </div>
        </details>
      </div>
      <div className="panel week-table-wrap">
        <div
          className="week-table-scroll"
          ref={tableScroll}
          tabIndex={0}
          role="region"
          aria-label="Weekly habit progress"
        >
          <table className="week-table">
            <caption className="visually-hidden">
              Highest completed tier for each habit and day. Scroll horizontally
              to see all seven days.
            </caption>
            <colgroup>
              <col className="week-habit-col" />
              {keys.map((k) => (
                <col key={k} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Habit</th>
                {keys.map((k) => (
                  <th
                    scope="col"
                    className={k === today ? "today-col" : ""}
                    key={k}
                  >
                    <small>{WEEKDAYS[parseDate(k).getDay()]}</small>
                    {parseDate(k).getDate()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((t) => (
                <tr key={t.id}>
                  <th scope="row" title={t.name}>
                    <div className="week-habit-label">
                      <CategoryIcon category={t.category} />
                      <span className="week-habit-name">{t.name}</span>
                    </div>
                  </th>
                  {keys.map((k) => {
                    const p = app.progress.find(
                        (p) => p.taskId === t.id && p.date === k,
                      ),
                      a = achieved(p),
                      s = scheduled(t, k) || p?.scheduled;
                    const canCorrect =
                      a < 3 && pastEntryInfo(t, p, k, today).eligible;
                    const lateLabel = p?.lateLoggedAt
                      ? `Logged later on ${new Date(p.lateLoggedAt).toLocaleString()}`
                      : "";
                    const marker = a ? (
                      <span className={`grid-win t${a}`}>T{a}</span>
                    ) : s ? (
                      <span className={cx("grid-empty", k < today && "past")}>
                        {k < today ? "·" : ""}
                      </span>
                    ) : (
                      <span className="not-scheduled">—</span>
                    );
                    return (
                      <td
                        key={k}
                        aria-label={`${t.name}, ${k}: ${a ? `T${a} completed` : s ? "Not completed" : "Not scheduled"}${lateLabel ? `. ${lateLabel}` : ""}`}
                        title={[
                          a
                            ? `T${a} badge achieved`
                            : !s
                              ? "Not scheduled"
                              : k > today
                                ? "Coming up"
                                : k === today
                                  ? "A chance to show up"
                                  : "A fresh start is always ahead",
                          lateLabel,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      >
                        {canCorrect ? (
                          <button
                            type="button"
                            className="week-correction-button"
                            aria-label={`Log completion for ${t.name} on ${k}`}
                            onClick={() =>
                              setCorrection({ taskId: t.id, day: k })
                            }
                          >
                            {marker}
                          </button>
                        ) : (
                          marker
                        )}
                        {p?.lateLoggedAt && (
                          <span
                            className="late-entry-label week-late-marker"
                            aria-label={lateLabel}
                            title={lateLabel}
                          >
                            •
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visibleTasks.length && (
          <Empty title="A week of possibilities">
            No scheduled habits in this week.
          </Empty>
        )}
      </div>
      {correction && app.tasks.find((t) => t.id === correction.taskId) && (
        <PastCompletionDialog
          key={`${correction.taskId}_${correction.day}`}
          task={app.tasks.find((t) => t.id === correction.taskId)}
          day={correction.day}
          progress={app.progress.find(
            (p) => p.taskId === correction.taskId && p.date === correction.day,
          )}
          onClose={() => setCorrection(null)}
        />
      )}
      <Stats
        items={[
          [stats.daysWon, "Days Won"],
          [stats.tasksWon, "Habits achieved"],
          [stats.t3, "T3 badges"],
        ]}
      />
      <div className="panel reflection-callout">
        <Sparkles />
        <div>
          <h2>Weekly review</h2>
        </div>
        <Link className="button secondary" to="/week/review">
          Open review
          <ArrowRight size={17} />
        </Link>
      </div>
    </div>
  );
}
export { ProgressDashboard as Analytics } from "../ProgressDashboard";
export { WeeklyReflection as WeeklyReview } from "../WeeklyReflection";

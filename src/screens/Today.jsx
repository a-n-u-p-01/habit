import { sortByHabitOrder } from "../domain";
import { TodayTaskCard } from "../TodayTaskCard";
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
export function Today() {
  const { tasks, progress, user } = useApp();
  const [view, setView] = useState("tasks");
  const key = dateKey();
  const todayTasks = tasks.filter(
    (t) =>
      scheduled(t, key) ||
      progress.some((p) => p.taskId === t.id && p.date === key && p.scheduled),
  );
  const status = dayStatus(tasks, progress, key);
  const name = user?.displayName?.split(" ")[0];
  const hour = new Date().getHours();
  return (
    <>
      <PageTitle
        eyebrow={new Date().toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
        title={`Good ${hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"}${name ? `, ${name}` : "."}`}
      >
        <Link className="button secondary compact desktop-only" to="/tasks/new">
          <Plus size={17} />
          New habit
        </Link>
      </PageTitle>
      <section className="today-hero">
        <div className="hero-content">
          <span className="eyebrow">THE ONLY GOAL IS TO SHOW UP</span>
          <h2>
            You don't need to
            <br />
            finish everything.
            <br />
            <em>Just win today.</em>
          </h2>
          <p>Your minimum is enough. The rest is a bonus.</p>
          <div className="hero-progress">
            <div>
              <span>Today's habits</span>
              <strong>
                {status.won}
                <small> / {status.total}</small>
              </strong>
            </div>
            <div className="progress-track">
              <i
                style={{
                  width: `${status.total ? (status.won / status.total) * 100 : 0}%`,
                }}
              />
            </div>
            <span>
              {status.dayWon
                ? "All your minimums, won. Beautiful."
                : status.total
                  ? `${status.total - status.won} small ${status.total - status.won === 1 ? "promise" : "promises"} to keep`
                  : "A fresh canvas. Start with one small promise."}
            </span>
          </div>
        </div>
        <div className="hero-tag">
          <span className="green-dot" /> YOUR OWN PACE
        </div>
      </section>
      <div className="today-layout">
        <section>
          <div className="section-heading">
            <h2>
              Your day, one badge at a time <span>{todayTasks.length}</span>
            </h2>
            <div className="tabs small-tabs">
              <button
                className={view === "tasks" ? "selected" : ""}
                onClick={() => setView("tasks")}
              >
                Habits
              </button>
              <button
                className={view === "timeline" ? "selected" : ""}
                onClick={() => setView("timeline")}
              >
                Timeline
              </button>
            </div>
          </div>
          <div className="task-list">
            {view === "timeline"
              ? sortByHabitOrder(
                  progress.filter((p) => p.date === key),
                  tasks,
                ).map((p) => (
                  <div className="task-card" key={p.id}>
                    <CategoryIcon category={p.snapshot.category} />
                    <div className="task-copy">
                      <h3>{p.snapshot.name}</h3>
                      <p>
                        {achieved(p)
                          ? `T${achieved(p)} badge achieved`
                          : "You showed up. Keep going."}
                      </p>
                    </div>
                    {achieved(p) > 0 && <Tier level={achieved(p)} />}
                  </div>
                ))
              : todayTasks.map((t) => (
                  <TodayTaskCard
                    key={t.id}
                    task={t}
                    progress={progress.find(
                      (p) => p.taskId === t.id && p.date === key,
                    )}
                    day={key}
                  />
                ))}
            {((view === "tasks" && !todayTasks.length) ||
              (view === "timeline" &&
                !progress.some((p) => p.date === key))) && (
              <Empty
                title={
                  view === "tasks"
                    ? "Make room for a small win"
                    : "Your story starts with showing up"
                }
                action={
                  <Link
                    className="button"
                    to={view === "tasks" ? "/tasks/new" : "/"}
                    onClick={() => setView("tasks")}
                  >
                    {view === "tasks"
                      ? "Create your first habit"
                      : "See today’s habits"}
                    <Plus size={17} />
                  </Link>
                }
              >
                {view === "tasks"
                  ? "No habits scheduled for today. Add an achievable minimum, or take a well-earned rest."
                  : "Start a habit to begin your timeline."}
              </Empty>
            )}
          </div>
          {status.dayWon && (
            <div className="day-won panel">
              <Trophy size={35} />
              <div>
                <span className="eyebrow">DAY WON</span>
                <h2>You kept your promises today.</h2>
                <p>Anything else is a bonus. You can leave feeling good.</p>
              </div>
              <Link to="/week" className="button secondary">
                See my week
                <ArrowRight size={17} />
              </Link>
            </div>
          )}
        </section>
        <aside className="today-aside">
          <div className="panel week-preview">
            <div className="section-heading">
              <h3>This week</h3>
              <Link to="/week" aria-label="View this week">
                <ArrowRight size={18} />
              </Link>
            </div>
            <div className="week-strip">
              {weekDates().map((k) => (
                <div key={k} className={cx(k === key && "is-today")}>
                  <small>{WEEKDAYS[parseDate(k).getDay()].slice(0, 1)}</small>
                  <span
                    className={
                      dayStatus(tasks, progress, k).dayWon
                        ? "day-circle won"
                        : "day-circle"
                    }
                  >
                    {dayStatus(tasks, progress, k).dayWon ? (
                      <Check size={15} />
                    ) : (
                      parseDate(k).getDate()
                    )}
                  </span>
                </div>
              ))}
            </div>
            <p>
              {
                weekDates().filter((k) => dayStatus(tasks, progress, k).dayWon)
                  .length
              }{" "}
              days won. Each one matters.
            </p>
          </div>
          <div className="panel reminder-card">
            <div className="mini-mountain">
              <Mountain size={45} />
            </div>
            <span className="eyebrow">A GENTLE REMINDER</span>
            <h3>
              Consistency isn't
              <br />
              doing the most.
              <br />
              <em>It's coming back.</em>
            </h3>
            <p>T1 is enough. Come back tomorrow.</p>
          </div>
          <Link className="review-link" to="/review">
            <span>
              <Sparkles size={19} /> A moment to reflect
            </span>
            <ChevronRight size={18} />
          </Link>
        </aside>
      </div>
    </>
  );
}

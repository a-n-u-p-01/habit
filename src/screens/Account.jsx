import { HabitOrderList } from "../HabitOrderList";
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
export function Profile() {
  const app = useApp();
  const allKeys = [
    ...new Set([
      ...app.progress.map((p) => p.date),
      ...app.tasks.flatMap((t) =>
        daysBack(
          Math.min(
            3660,
            Math.max(
              1,
              Math.floor(
                (new Date() - parseDate(t.createdDay || dateKey())) / 86400000,
              ) + 2,
            ),
          ),
        ),
      ),
    ]),
  ];
  const stats = statistics(app.tasks, app.progress, allKeys);
  const active = app.tasks.filter((t) => !t.deletedDay);
  async function toggle(t) {
    const active = t.active === false;
    const history = (t.scheduleHistory || []).filter(
      (h) => h.from !== dateKey(),
    );
    history.push({ from: dateKey(), weekdays: t.weekdays, active });
    try {
      await app.persist("tasks", t.id, {
        ...t,
        active,
        scheduleHistory: history,
      });
    } catch {}
  }
  async function remove(t) {
    if (
      !confirm(
        "Delete this habit from future days? Your past wins and sessions will remain.",
      )
    )
      return;
    try {
      await app.persist("tasks", t.id, {
        ...t,
        deletedDay: dateKey(),
        active: false,
      });
    } catch {}
  }
  return (
    <>
      <PageTitle eyebrow="THIS IS YOUR OWN JOURNEY" title="Your space." />
      <section className="panel profile-card">
        <Avatar />
        <h2>{app.user?.displayName || "One small step at a time."}</h2>
        <p>
          {app.user
            ? "Your wins, safely in your own space."
            : "Your data is saved on this device. Sign in for cloud sync."}
        </p>
        {!app.user && (
          <button className="button" onClick={() => app.login()}>
            Continue with Google
            <ArrowRight size={17} />
          </button>
        )}
        <Stats
          items={[
            [stats.daysWon, "Days Won"],
            [stats.tasksWon, "Habits achieved"],
            [stats.t3, "T3 badges"],
          ]}
        />
      </section>
      {app.user && app.guestCount > 0 && (
        <div className="banner">
          You have {app.guestCount} records on this device that haven't been
          imported.
          <button
            onClick={() =>
              app.importGuest().catch((e) => app.setError(e.message))
            }
          >
            Import device data
          </button>
        </div>
      )}
      <div className="profile-layout">
        <section>
          <div className="section-heading">
            <h2>My habits</h2>
            <Link className="text-button" to="/tasks/new">
              <Plus size={16} />
              New
            </Link>
          </div>
          {active.length > 0 && (
            <HabitOrderList
              habits={active}
              onPause={toggle}
              onRemove={remove}
            />
          )}
          {!active.length && (
            <Empty
              title="Start smaller than you think"
              action={
                <Link className="button" to="/tasks/new">
                  Create a habit
                </Link>
              }
            >
              One achievable minimum is a great beginning.
            </Empty>
          )}
        </section>
        <section className="panel profile-menu">
          {[
            [Layers, "My Templates", "/templates?tab=mine"],
            [Bookmark, "Saved Templates", "/templates?tab=saved"],
            [Sparkles, "Weekly Review", "/review"],
            [Settings, "Settings & Privacy", "/settings"],
            [HelpCircle, "Help & Philosophy", "/help"],
          ].map(([Icon, label, to]) => (
            <Link key={to} to={to}>
              <Icon size={19} />
              <span>{label}</span>
              <ChevronRight size={18} />
            </Link>
          ))}
          {app.user && (
            <button onClick={() => app.logout()}>
              <LogOut size={19} />
              <span>Sign out</span>
              <ChevronRight size={18} />
            </button>
          )}
          <blockquote>
            “A little progress each day
            <br />
            adds up to big results.”
          </blockquote>
        </section>
      </div>
    </>
  );
}
export function SettingsPage() {
  const app = useApp();
  const [reminder, setReminder] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("win-reminder") ||
          '{"enabled":false,"time":"09:00"}',
      );
    } catch {
      return { enabled: false, time: "09:00" };
    }
  });
  async function saveReminder(e) {
    e.preventDefault();
    localStorage.setItem("win-reminder", JSON.stringify(reminder));
    if (app.user)
      await app.persist("weeklyReviews", "reminder-preference", {
        kind: "reminderPreference",
        ...reminder,
      });
    app.setNotice(
      "Preference saved on this device. Background push is not enabled in this frontend-only build.",
    );
  }
  async function download() {
    try {
      const value = await app.exportData(),
        blob = new Blob([JSON.stringify(value, null, 2)], {
          type: "application/json",
        }),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `win-today-${dateKey()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      app.setError(e.message);
    }
  }
  return (
    <>
      <PageTitle
        back="/profile"
        eyebrow="MAKE YOUR SPACE FEEL LIKE YOU"
        title="Settings & privacy."
      />
      <div className="settings-grid">
        <section className="panel form-section">
          <h2>
            <Sun size={21} /> Appearance
          </h2>
          <div className="theme-options">
            {[
              [Sun, "light"],
              [Moon, "dark"],
              [Monitor, "system"],
            ].map(([Icon, value]) => (
              <button
                key={value}
                className={app.theme === value ? "selected" : ""}
                onClick={() => app.setTheme(value)}
              >
                <Icon />
                {value}
              </button>
            ))}
          </div>
        </section>
        <section className="panel form-section">
          <h2>
            <Bell size={21} /> Gentle reminders
          </h2>
          <form onSubmit={saveReminder}>
            <label className="confirm-row">
              <input
                type="checkbox"
                checked={reminder.enabled}
                onChange={(e) =>
                  setReminder({ ...reminder, enabled: e.target.checked })
                }
              />
              I'd like a daily reminder
            </label>
            <label>
              Preferred local time
              <input
                type="time"
                value={reminder.time}
                onChange={(e) =>
                  setReminder({ ...reminder, time: e.target.value })
                }
              />
            </label>
            <p className="muted">
              Preference only. This app does not send background push
              notifications. No permission request or fake reminders.
            </p>
            <button className="button secondary">Save preference</button>
          </form>
        </section>
        <section className="panel form-section">
          <h2>
            <Shield size={21} /> Your data belongs to you
          </h2>
          <p>
            Google provides your name and photo. Private habits, progress, and
            reflections stay inside your Firebase user boundary. Published
            templates, reviews, and adoption identifiers are public.
          </p>
          <p className="muted">
            On shared devices, sign out and use a private browser window. This
            app caches cloud data locally for offline use. Clear site data to
            remove that cache.
          </p>
          <button className="button secondary" onClick={download}>
            <Download size={17} />
            Export my data
          </button>
          <button
            className="text-button danger"
            onClick={async () => {
              if (
                !confirm(
                  app.user
                    ? "Permanently delete your account, private data, public templates, reviews and usage records? This cannot be undone."
                    : "Delete all guest data on this device? This cannot be undone.",
                )
              )
                return;
              try {
                await app.erase();
              } catch (e) {
                app.setError(
                  `${e.message} For account deletion, sign out and sign in again if Firebase requires a recent login, then retry.`,
                );
              }
            }}
          >
            <Trash2 size={16} />
            {app.user ? "Delete account & app data" : "Clear device data"}
          </button>
        </section>
        <section className="panel form-section">
          <h2>
            <User size={21} /> Account
          </h2>
          <p>
            {app.user
              ? app.user.displayName
              : "You are using this device without an account."}
          </p>
          {app.user ? (
            <button className="button secondary" onClick={() => app.logout()}>
              <LogOut size={17} />
              Sign out
            </button>
          ) : (
            <>
              <button className="button" onClick={() => app.login()}>
                Continue with Google
              </button>
              <button className="text-button" onClick={() => app.login(true)}>
                Use redirect sign-in
              </button>
            </>
          )}
          <Link className="text-button" to="/help">
            <HelpCircle size={17} />
            Help & feedback
          </Link>
          <button
            className="text-button"
            onClick={() => {
              localStorage.removeItem("win-onboarded");
              window.location.assign("/welcome");
            }}
          >
            Replay the welcome
          </button>
        </section>
      </div>
    </>
  );
}
export function Help() {
  return (
    <>
      <PageTitle
        back="/profile"
        eyebrow="A KINDER KIND OF CONSISTENCY"
        title="Your minimum is enough."
      />
      <div className="help-content panel form-section">
        <h2>Win Today, not finish everything.</h2>
        <p>
          T1 is the smallest meaningful promise you can keep even on a hard day.
          Achieve your T1 badge, and your habit minimum is met. T2 and T3 add
          more effort only when you want to.
        </p>
        <h3>Additional means additional.</h3>
        <p>
          If T1 is 10 push-ups and T2 is +5, a T2 badge represents 15 push-ups
          in total. You never repeat T1 inside T2.
        </p>
        <h3>How does a day count as won?</h3>
        <p>
          Achieve a T1 badge on every habit scheduled that day. An unscheduled
          rest day is not a missed day, and days without habits are not counted
          as wins.
        </p>
        <h3>Can I change my mind?</h3>
        <p>
          Yes. Pause, edit or remove habits in My space. Existing daily sessions
          keep their original requirements. Schedule changes affect today and
          future days; old schedule versions are retained.
        </p>
        <h3>What if I miss a day?</h3>
        <p>
          Come back. No penalties, no leaderboard, no broken identity. If the
          minimum is consistently difficult, make it smaller in your weekly
          review.
        </p>
        <h3>Offline & device data</h3>
        <p>
          Guest data is stored in this browser. Google sign-in enables Firestore
          sync. Import device data explicitly in My space after signing in.
          Cached cloud sessions can be continued offline. Starting a new cloud
          session needs a connection.
        </p>
        <h3>Feedback</h3>
        <p>
          This is your independently deployed app. To report a problem, export
          your data if useful and contact the person who deployed it. No
          feedback is sent to an invented inbox or fake API.
        </p>
        <Link className="button" to="/">
          Back to today
          <ArrowRight size={17} />
        </Link>
      </div>
    </>
  );
}

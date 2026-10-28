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
} from "./components";
import { Profile, SettingsPage, Help } from "./screens/Account";
import { Templates, TemplateDetail } from "./screens/Templates";
import { Week, Analytics, WeeklyReview } from "./screens/Insights";
import { NewHabit, TaskEditor, TaskFlow } from "./screens/Tasks";
import { Today } from "./screens/Today";
import { AccessProvider, StaffOnly, useAccess } from "./access";
import { UsersPage, FeedbackPage } from "./screens/Administration";
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
} from "./store";
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
} from "./domain";

function Onboarding() {
  const { login, user } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(0),
    [example, setExample] = useState(0);
  function finish() {
    localStorage.setItem("win-onboarded", "1");
    navigate("/");
  }
  return (
    <main className="onboarding">
      <div className="onboard-art">
        <div className="brand">
          <Mountain /> WIN TODAY
        </div>
        <div>
          <span className="eyebrow">A little is everything.</span>
          <h1>
            Small wins.
            <br />A better you.
          </h1>
          <p>
            You don't need to finish everything.
            <br />
            Just win today.
          </p>
        </div>
        <span className="photo-credit">Your pace. Your path.</span>
      </div>
      <section className="onboard-copy">
        <span className="eyebrow">YOUR NEXT CHAPTER · 0{step + 1} / 04</span>
        {step === 0 ? (
          <>
            <h2>
              Keep the promise.
              <br />
              <em>Not the pressure.</em>
            </h2>
            <p>
              Start realistically. Stay consistent. Become the person you want
              to be, one small win at a time.
            </p>
            <div className="principle">
              <Check /> Start small enough to show up.
              <br />
            </div>
            <div className="principle">
              <Check /> A little progress still counts.
            </div>
          </>
        ) : step === 1 ? (
          <>
            <h2>
              Three levels.
              <br />
              One continuous journey.
            </h2>
            <Progression
              task={{
                levels: [
                  [
                    {
                      id: "a",
                      amount: 1,
                      unit: "small step",
                      label: "Keep your habit alive.",
                    },
                  ],
                  [
                    {
                      id: "b",
                      amount: 1,
                      unit: "extra step",
                      label: "Only if you have the energy.",
                    },
                  ],
                  [
                    {
                      id: "c",
                      amount: 1,
                      unit: "final step",
                      label: "Go further, on your terms.",
                    },
                  ],
                ],
              }}
            />
            <p>T1 is the win. T2 and T3 are always optional.</p>
          </>
        ) : step === 2 ? (
          <>
            <h2>
              Meet your
              <br />
              minimum win.
            </h2>
            <div className="tabs">
              {[0, 1, 2].map((n) => (
                <button
                  className={example === n ? "selected" : ""}
                  onClick={() => setExample(n)}
                  key={n}
                >
                  T{n + 1}
                </button>
              ))}
            </div>
            <div className="panel example">
              <Tier level={example + 1} />
              <h3>{LEVELS[example]}</h3>
              {exemplar.levels[example].map((r) => (
                <p key={r.id}>
                  <RequirementText r={r} additional={example > 0} />
                </p>
              ))}
            </div>
            <p>
              {example === 0
                ? "Do this to achieve your T1 badge. Anything more is optional."
                : `These are additional sets, not totals. You've already earned T${example}.`}
            </p>
          </>
        ) : (
          <>
            <h2>
              A fresh start.
              <br />
              Every single day.
            </h2>
            <p>
              Save your wins across devices with Google, or start on this
              device. No leaderboard. No guilt. Just you, showing up.
            </p>
            <button
              className="button google"
              onClick={async () => {
                await login();
                if (authenticated()) finish();
              }}
            >
              Continue with Google <ArrowRight size={18} />
            </button>
            <button className="text-button" onClick={() => login(true)}>
              Use redirect sign-in instead
            </button>
            <small className="muted">
              Google sign-in requires the Firebase project to have Google
              enabled and this domain authorized.
            </small>
          </>
        )}
        <div className="onboard-footer">
          <div className="dots">
            {[0, 1, 2, 3].map((n) => (
              <button
                key={n}
                aria-label={`Step ${n + 1}`}
                className={step === n ? "active" : ""}
                onClick={() => setStep(n)}
              />
            ))}
          </div>
          <button
            className="button"
            onClick={() => (step < 3 ? setStep(step + 1) : finish())}
          >
            {step === 3
              ? user
                ? "Enter my day"
                : "Start on this device"
              : step === 0
                ? "Let's begin"
                : "Next"}
            <ArrowRight size={18} />
          </button>
          <button className="text-button" onClick={finish}>
            Skip for now
          </button>
        </div>
      </section>
    </main>
  );
}
// Auth state is observed by the provider; this check only handles the post-popup navigation.
import { auth } from "./firebase";
const authenticated = () => !!auth.currentUser;
function Shell() {
  const app = useApp(),
    location = useLocation();
  const access = useAccess();
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    if (!app.notice) return;
    const timer = setTimeout(() => app.setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [app.notice]);
  if (!app.authReady)
    return (
      <main className="loading">
        <Mountain />
        <p>Finding your path…</p>
      </main>
    );
  if (location.pathname === "/welcome")
    return (
      <>
        <Onboarding />
        {app.error && (
          <div className="toast error" role="alert">
            {app.error}
            <button aria-label="Dismiss error" onClick={() => app.setError("")}>
              <X size={18} />
            </button>
          </div>
        )}
      </>
    );
  return (
    <div className="app-shell">
      <aside className={cx("sidebar", menu && "open")}>
        <Link to="/" className="brand">
          <span className="brand-mark">
            <Mountain />
          </span>
          WIN TODAY<span className="brand-period">.</span>
        </Link>
        <span className="sidebar-caption">SMALL STEPS. REAL CHANGE.</span>
        <nav>
          {[
            [Home, "Today", "/"],
            [Calendar, "This week", "/week"],
            [BarChart3, "My progress", "/analytics"],
            [Layers, "Templates", "/templates"],
            [User, "My space", "/profile"],
            [HelpCircle, "Report or suggest", "/feedback"],
            ...(access.isStaff
              ? [
                  [Shield, "Users & roles", "/admin/users"],
                  [BookOpen, "Feedback inbox", "/admin/feedback"],
                ]
              : []),
          ].map(([Icon, title, path]) => (
            <NavLink key={path} to={path} end={path === "/" ? true : false}>
              <Icon size={20} />
              {title}
            </NavLink>
          ))}
        </nav>
        <Link className="button" to="/tasks/new">
          <Plus size={18} /> Create a habit
        </Link>
        <div className="sidebar-bottom">
          <div className="panel quiet-quote">
            “You don't need to finish everything.
            <br />
            <strong>Just win today.</strong>”
          </div>
          <Link className="account" to="/profile">
            <Avatar />
            <span>
              {app.user?.displayName?.split(" ")[0] || "Your own journey"}
              <small>{app.user ? "Personal space" : "On this device"}</small>
            </span>
            <Settings size={17} />
          </Link>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-only"
            aria-label="Toggle navigation"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <span className="topbar-word">A LITTLE PROGRESS, EVERY DAY.</span>
          <div className="topbar-actions">
            <span className="sync-state">
              {app.online ? <Cloud size={15} /> : <CloudOff size={15} />}{" "}
              {app.online
                ? app.user
                  ? app.pending
                    ? "Syncing…"
                    : "Cloud connected"
                  : "Device only"
                : "Offline"}
            </span>
            <button
              className="icon-button"
              aria-label="Toggle color theme"
              onClick={() =>
                app.setTheme(app.theme === "light" ? "dark" : "light")
              }
            >
              {app.theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <Link to="/profile">
              <Avatar small />
            </Link>
          </div>
        </header>
        {!app.online && (
          <div className="banner">
            You're offline. Cached habits are available; new cloud habit
            sessions need a connection. Changes sync when you reconnect.
          </div>
        )}
        {app.error && (
          <div className="banner error" role="alert">
            {app.error}
            <button aria-label="Dismiss error" onClick={() => app.setError("")}>
              <X size={17} />
            </button>
          </div>
        )}
        {app.notice && (
          <div className="toast" role="status">
            {app.notice}
            <button
              aria-label="Dismiss notification"
              onClick={() => app.setNotice("")}
            >
              <X size={17} />
            </button>
          </div>
        )}
        <main className="main-content">
          {app.loading ? (
            <div className="loading">
              <RefreshCw className="spin" />
              <p>Gathering your wins…</p>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<Today />} />
              <Route path="/tasks/new" element={<NewHabit />} />
              <Route path="/tasks/new/manual" element={<TaskEditor />} />
              <Route path="/tasks/:id/edit" element={<TaskEditor />} />
              <Route path="/task/:id" element={<TaskFlow />} />
              <Route path="/week" element={<Week />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/templates" element={<Templates />} />
              <Route
                path="/templates/new"
                element={<TaskEditor templateMode />}
              />
              <Route
                path="/templates/:id/edit"
                element={<TaskEditor templateMode />}
              />
              <Route path="/templates/:id" element={<TemplateDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/review" element={<WeeklyReview />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/help" element={<Help />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route
                path="/admin/users"
                element={
                  <StaffOnly>
                    <UsersPage />
                  </StaffOnly>
                }
              />
              <Route
                path="/admin/feedback"
                element={
                  <StaffOnly>
                    <FeedbackPage inbox />
                  </StaffOnly>
                }
              />
              <Route
                path="*"
                element={
                  <Empty
                    title="A little off the path"
                    action={
                      <Link className="button" to="/">
                        Back to today
                      </Link>
                    }
                  >
                    This page doesn't exist.
                  </Empty>
                }
              />
            </Routes>
          )}
        </main>
        <footer className="footer-note">
          Progress, not perfection. <span>You've got this.</span>
        </footer>
      </div>
      <nav className="bottom-nav">
        {[
          [Home, "Today", "/"],
          [BarChart3, "Progress", "/analytics"],
          [Plus, "New", "/tasks/new"],
          [Layers, "Templates", "/templates"],
          [User, "My space", "/profile"],
        ].map(([Icon, label, path]) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
            className={path === "/tasks/new" ? "new-nav" : ""}
          >
            <Icon size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <main className="loading">
        <Mountain />
        <h1>A small detour.</h1>
        <p>{this.state.error.message}</p>
        <button className="button" onClick={() => window.location.reload()}>
          Try again
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function WelcomeRedirect() {
  const location = useLocation(),
    navigate = useNavigate();
  useEffect(() => {
    if (!localStorage.getItem("win-onboarded") && location.pathname === "/")
      navigate("/welcome", { replace: true });
  }, []);
  return <Shell />;
}
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <AccessProvider>
            <WelcomeRedirect />
          </AccessProvider>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

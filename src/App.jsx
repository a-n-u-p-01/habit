import { WelcomeOnboarding } from "./WelcomeOnboarding";
import { completeWelcome, WELCOME_SIGNIN_KEY } from "./welcome.js";
import { AppLoading, ContentLoading, StartupRecovery } from "./LoadingStates";
import { startupPhase } from "./startup.js";
import { LegacyRedirect } from "./LegacyRedirect";
import { isHabitCreationPath } from "./routing.js";
import { HelpCenter } from "./HelpCenter";
import { MyHabits } from "./screens/MyHabits";
import { NameSetup } from "./ProfileName";
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
import { SettingsPage } from "./screens/Account";
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

function Shell() {
  const app = useApp(),
    location = useLocation();
  const navigate = useNavigate();
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
  useEffect(() => {
    if (app.user && sessionStorage.getItem(WELCOME_SIGNIN_KEY) === "1") {
      completeWelcome(localStorage, sessionStorage);
      navigate("/", { replace: true });
    }
  }, [app.user?.uid, navigate]);
  const startup = startupPhase(app);
  if (startup === "loading")
    return (
      <AppLoading
        fullScreen
        offline={!app.online}
        onRetry={() => window.location.reload()}
      />
    );
  if (startup === "offline" || startup === "error")
    return (
      <StartupRecovery
        offline={startup === "offline"}
        error={app.error || app.profileError}
        onRetry={() => window.location.reload()}
        onSignOut={() => app.logout()}
      />
    );
  if (startup === "name-setup") return <NameSetup />;
  if (location.pathname === "/welcome") return <WelcomeOnboarding />;
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
            [Target, "My habits", "/habits"],
            [Calendar, "This week", "/week"],
            [BarChart3, "My progress", "/analytics"],
            [Layers, "Templates", "/templates"],
            [Settings, "Settings", "/settings"],
            [HelpCircle, "Help & feedback", "/help"],
            ...(access.isStaff
              ? [
                  [Shield, "Users", "/admin/users"],
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
        <Link className="button" to="/habits/new">
          <Plus size={18} /> Create a habit
        </Link>
        <div className="sidebar-bottom">
          <div className="panel quiet-quote">
            “You don't need to finish everything.
            <br />
            <strong>Just win today.</strong>”
          </div>
          <Link className="account" to="/settings">
            <Avatar />
            <span>
              {app.user?.displayName || "Your own journey"}
              <small>{app.user ? "Settings" : "On this device"}</small>
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
            <button
              className="icon-button"
              aria-label="Toggle color theme"
              onClick={() =>
                app.setTheme(app.theme === "light" ? "dark" : "light")
              }
            >
              {app.theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <Link to="/settings">
              <Avatar small />
            </Link>
          </div>
        </header>
        {!app.online && (
          <div className="banner">
            You're offline. Habits already loaded in this tab are available; new
            cloud habit sessions need a connection. Changes sync when you
            reconnect. Keep this tab open until they sync.
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
            <ContentLoading />
          ) : (
            <Routes>
              <Route path="/" element={<Today />} />
              <Route path="/tasks/new" element={<LegacyRedirect />} />
              <Route path="/tasks/new/manual" element={<LegacyRedirect />} />
              <Route path="/tasks/:id/edit" element={<LegacyRedirect />} />
              <Route path="/task/:id" element={<LegacyRedirect />} />
              <Route path="/review" element={<LegacyRedirect />} />
              <Route path="/habits/new" element={<NewHabit />} />
              <Route path="/habits/new/manual" element={<TaskEditor />} />
              <Route path="/habits/:id/edit" element={<TaskEditor />} />
              <Route path="/habits/:id" element={<TaskFlow />} />
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
              <Route path="/profile" element={<LegacyRedirect />} />
              <Route path="/habits" element={<MyHabits />} />
              <Route path="/week/review" element={<WeeklyReview />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/help" element={<HelpCenter />} />
              <Route path="/feedback" element={<LegacyRedirect />} />
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
          [Target, "My habits", "/habits"],
          [Plus, "New", "/habits/new"],
          [Layers, "Templates", "/templates"],
          [Settings, "Settings", "/settings"],
        ].map(([Icon, label, path]) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
            className={({ isActive }) =>
              cx(
                path === "/habits/new" && "new-nav",
                isActive &&
                  !(
                    path === "/habits" && isHabitCreationPath(location.pathname)
                  ) &&
                  "active",
              )
            }
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

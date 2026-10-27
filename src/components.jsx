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
const icons = {
  Fitness: Flame,
  Study: BookOpen,
  Mindfulness: Heart,
  Creative: Sparkles,
  Career: Target,
  Life: Sun,
};
export const cx = (...x) => x.filter(Boolean).join(" ");

export function CategoryIcon({ category }) {
  const Icon = icons[category] || Mountain;
  return (
    <span className={`category-icon cat-${category}`}>
      <Icon size={19} />
    </span>
  );
}
export function Tier({ level = 1 }) {
  return <span className={`tier t${level}`}>T{level}</span>;
}
export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <Mountain size={34} />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function PageTitle({ eyebrow, title, children, back }) {
  return (
    <header className="page-title">
      {back && (
        <Link className="icon-button" to={back} aria-label="Back">
          <ArrowLeft />
        </Link>
      )}
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      {children}
    </header>
  );
}
export function Stats({ items }) {
  return (
    <div className="stats-grid">
      {items.map(([value, label]) => (
        <div key={label}>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
export function RequirementText({ r, additional = false }) {
  return (
    <>
      <strong>
        {additional ? "+ " : ""}
        {r.amount} {r.unit}
      </strong>{" "}
      {r.label}
    </>
  );
}
export function Progression({ task }) {
  return (
    <div className="progression">
      {task.levels.map((rows, i) => (
        <div className="panel progression-level" key={i}>
          <Tier level={i + 1} />
          <div>
            <h3>{LEVELS[i]}</h3>
            <small>
              {i === 0
                ? "Enough to win today"
                : `Additional effort after T${i}`}
            </small>
            {rows.map((r) => (
              <p key={r.id}>
                <RequirementText r={r} additional={i > 0} />
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
export function Avatar({ small = false }) {
  const { user } = useApp();
  return user?.photoURL ? (
    <img
      referrerPolicy="no-referrer"
      className={cx("avatar", small && "small")}
      src={user.photoURL}
      alt={user.displayName || "Profile"}
    />
  ) : (
    <span className={cx("avatar", small && "small")}>
      <User size={small ? 16 : 22} />
    </span>
  );
}

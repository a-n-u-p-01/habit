import { ConfirmationDialog } from "../ConfirmationDialog";
import { templateAuthorName } from "../template-author.js";
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
  useSearchParams,
} from "react-router-dom";
import {
  Globe,
  LockKeyhole,
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
export function Templates() {
  const app = useApp(),
    publicData = usePublicTemplates();
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get("tab");
  const tab = ["mine", "saved"].includes(requestedTab)
    ? requestedTab
    : "explore";
  const setTab = (value) => {
    const next = new URLSearchParams(params);
    if (value === "explore") next.delete("tab");
    else next.set("tab", value);
    setParams(next);
  };
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("All"),
    [sort, setSort] = useState("recommended"),
    [stats, setStats] = useState({});
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      publicData.templates.map(async (t) => {
        try {
          return [t.id, await templateStats(t.id)];
        } catch {
          return [t.id, null];
        }
      }),
    ).then((rows) => {
      if (!cancelled) setStats(Object.fromEntries(rows));
    });
    return () => {
      cancelled = true;
    };
  }, [publicData.templates]);
  const all = [...starterTemplates, ...publicData.templates],
    saved = app.savedTemplates
      .map((s) => all.find((t) => t.id === s.templateId) || s.snapshot)
      .filter(Boolean);
  let list = tab === "mine" ? app.templates : tab === "saved" ? saved : all;
  list = list.filter(
    (t) =>
      t.name.toLowerCase().includes(search.trim().toLowerCase()) &&
      (category === "All" || t.category === category),
  );
  list = [...list].sort((a, b) =>
    sort === "rating"
      ? (stats[b.id]?.rating || 0) - (stats[a.id]?.rating || 0)
      : Number(!!b.starter) - Number(!!a.starter),
  );
  async function saveTemplate(t) {
    try {
      const saved = app.savedTemplates.find((s) => s.templateId === t.id);
      await app.persist(
        "savedTemplates",
        t.id,
        { templateId: t.id, snapshot: t },
        !!saved,
      );
      app.setNotice(
        saved ? "Template removed from saved." : "Saved for later.",
      );
    } catch {}
  }
  const [publication, setPublication] = useState(null);
  function publish(template) {
    setPublication({ template, unpublish: !!template.published });
  }
  async function confirmPublication() {
    if (!publication) return;
    if (publication.unpublish) await app.unpublish(publication.template);
    else await app.publish(publication.template);
  }
  return (
    <div className="templates-page">
      <PageTitle title="Templates">
        <Link className="button compact" to="/templates/new">
          <Plus size={17} /> Create template
        </Link>
      </PageTitle>
      <p className="templates-lede">
        Choose a starting point. Adjust it to fit your routine.
      </p>
      <section className="panel template-toolbar" aria-label="Browse templates">
        <div className="template-controls">
          <div className="tabs" role="group" aria-label="Template library">
            {[
              ["explore", "Explore"],
              ["mine", "My Templates"],
              ["saved", "Saved"],
            ].map(([k, label]) => (
              <button
                className={tab === k ? "selected" : ""}
                aria-pressed={tab === k}
                onClick={() => setTab(k)}
                key={k}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="search-box">
            <Search size={18} />
            <input
              type="search"
              aria-label="Search templates"
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="template-filter-controls">
          <div className="template-select-filters">
            <select
              aria-label="Filter template category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {["All", ...CATEGORIES].map((value) => (
                <option key={value} value={value}>
                  {value === "All" ? "All categories" : value}
                </option>
              ))}
            </select>
            <select
              aria-label="Sort templates"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="recommended">Recommended</option>
              <option value="rating">Highest rated</option>
            </select>
          </div>
          <div className="template-result-summary">
            <span role="status" aria-live="polite">
              {list.length} {list.length === 1 ? "template" : "templates"}
            </span>
            {(search || category !== "All") && (
              <button
                className="text-button"
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </section>
      {publicData.error && tab !== "mine" && (
        <div className="banner">
          Community library unavailable: {publicData.error}. Built-in starter
          examples remain available.
        </div>
      )}
      {publicData.loading && tab === "explore" && (
        <p className="muted">Connecting to the community library…</p>
      )}
      <div className="template-grid">
        {list.map((t) => (
          <article className="panel template-card" key={t.id}>
            <div className={`template-cover cover-${t.category}`}>
              <CategoryIcon category={t.category} />
              <span>{t.category}</span>
              <button
                className="icon-button"
                aria-label={
                  app.savedTemplates.some((s) => s.templateId === t.id)
                    ? "Unsave template"
                    : "Save template"
                }
                onClick={() => saveTemplate(t)}
              >
                <Bookmark
                  size={19}
                  fill={
                    app.savedTemplates.some((s) => s.templateId === t.id)
                      ? "currentColor"
                      : "none"
                  }
                />
              </button>
            </div>
            <div className="template-card-body">
              <span className="eyebrow">
                {t.starter
                  ? "STARTER"
                  : tab === "mine"
                    ? t.published
                      ? "PUBLISHED"
                      : "PRIVATE"
                    : "COMMUNITY"}
              </span>
              <Link
                to={
                  tab === "mine"
                    ? `/templates/${t.id}/edit`
                    : `/templates/${t.id}`
                }
              >
                <h2>{t.name}</h2>
              </Link>
              <p className="template-description">
                {t.description || "One small promise. Three ways to show up."}
              </p>
              <small>
                By {templateAuthorName(t, app.user, tab === "mine")}
              </small>
              <div className="template-minimum">
                <Tier level={1} />
                <span>
                  {t.levels?.[0]?.length || 0}{" "}
                  {t.levels?.[0]?.length === 1 ? "task" : "tasks"} for your
                  minimum
                </span>
              </div>
              <div className="template-meta">
                <span>
                  {t.starter
                    ? "Built-in starter"
                    : tab === "mine"
                      ? t.published
                        ? "Public template"
                        : "Only you can access"
                      : "Community template"}
                </span>
                {stats[t.id]?.reviews > 0 && (
                  <span>
                    <Star size={13} />
                    {Number(stats[t.id].rating).toFixed(1)} ·{" "}
                    {stats[t.id].reviews} reviews
                  </span>
                )}
              </div>
              <div
                className={cx("template-actions", tab === "mine" && "is-owned")}
              >
                {tab === "mine" ? (
                  <>
                    <Link
                      className="button compact"
                      to="/habits/new"
                      state={{ template: t, privateTemplate: true }}
                    >
                      Use <ArrowRight size={15} />
                    </Link>
                    <Link
                      className="button secondary compact"
                      to={`/templates/${t.id}/edit`}
                    >
                      <Edit3 size={15} />
                      Edit
                    </Link>
                    <button
                      className="button secondary compact"
                      onClick={() => publish(t)}
                    >
                      {t.published ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      className="icon-button danger"
                      aria-label="Delete template"
                      onClick={async () => {
                        if (
                          !confirm(
                            "Delete this personal template? Existing habit copies will remain.",
                          )
                        )
                          return;
                        try {
                          if (t.published) await app.unpublish(t);
                          await app.persist("templates", t.id, {}, true);
                        } catch (e) {
                          app.setError(e.message);
                        }
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      className="button secondary compact"
                      to={`/templates/${t.id}`}
                    >
                      View details
                    </Link>
                    <Link
                      className="button compact"
                      to="/habits/new"
                      state={{ template: t }}
                    >
                      Use
                      <ArrowRight size={15} />
                    </Link>
                  </>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      {!list.length && (
        <Empty
          title={
            tab === "mine" ? "Your ideas belong here" : "No blueprints found"
          }
          action={
            <Link className="button secondary" to="/templates/new">
              Create a template
              <Plus size={17} />
            </Link>
          }
        >
          {tab === "saved"
            ? "Save a template to find it here."
            : "Try a different filter, or make your own."}
        </Empty>
      )}
      {publication && (
        <ConfirmationDialog
          title={
            publication.unpublish ? "Unpublish template?" : "Publish template?"
          }
          description={
            publication.unpublish
              ? "This removes the template from the community library. Existing saved copies and habits will remain."
              : "The template’s tasks, description, your app username and author ID will be publicly visible."
          }
          icon={publication.unpublish ? LockKeyhole : Globe}
          confirmLabel={
            publication.unpublish ? "Unpublish template" : "Publish template"
          }
          onConfirm={confirmPublication}
          onClose={() => setPublication(null)}
          disabled={!app.user || !app.online}
        >
          <div className="publication-template-preview">
            <CategoryIcon category={publication.template.category} />
            <div>
              <strong>{publication.template.name}</strong>
              <span>
                {publication.unpublish
                  ? "Currently published"
                  : `By ${app.user?.displayName || "your app username"}`}
              </span>
            </div>
          </div>
          {!publication.unpublish && (
            <p className="publication-privacy-note">
              Your private habits and progress are not published.
            </p>
          )}
          {!app.user && (
            <p className="publication-connection-note">
              Sign in to manage publication.{" "}
              <Link to="/settings" onClick={() => setPublication(null)}>
                Open Settings
              </Link>
            </p>
          )}
          {app.user && !app.online && (
            <p className="publication-connection-note" role="status">
              Reconnect to change publication.
            </p>
          )}
        </ConfirmationDialog>
      )}
    </div>
  );
}
export { TemplateDetails as TemplateDetail } from "../TemplateDetails";

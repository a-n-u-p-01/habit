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
export function Templates() {
  const app = useApp(),
    publicData = usePublicTemplates(),
    location = useLocation();
  const [tab, setTab] = useState(
      new URLSearchParams(location.search).get("tab") || "explore",
    ),
    [search, setSearch] = useState(""),
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
      t.name.toLowerCase().includes(search.toLowerCase()) &&
      (category === "All" || t.category === category),
  );
  list = [...list].sort((a, b) =>
    sort === "popular"
      ? (stats[b.id]?.uses || 0) - (stats[a.id]?.uses || 0)
      : sort === "rating"
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
  async function publish(t) {
    try {
      await (t.published ? app.unpublish(t) : app.publish(t));
    } catch (e) {
      app.setError(e.message);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="BORROW A LITTLE INSPIRATION"
        title="Your next small beginning."
      >
        <Link className="button compact" to="/templates/new">
          <Plus size={17} /> Create template
        </Link>
      </PageTitle>
      <div className="template-intro panel">
        <Layers size={34} />
        <div>
          <h2>Good habits don't need a grand plan.</h2>
          <p>Start with a blueprint. Make it yours. Keep the minimum kind.</p>
        </div>
      </div>
      <div className="template-controls">
        <div className="tabs">
          {[
            ["explore", "Explore"],
            ["mine", "My Templates"],
            ["saved", "Saved"],
          ].map(([k, label]) => (
            <button
              className={tab === k ? "selected" : ""}
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
            aria-label="Search templates"
            placeholder="Find a small beginning…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="filter-row">
        <div className="chips">
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              className={category === c ? "active" : ""}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <select
          aria-label="Sort templates"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="recommended">Recommended starters</option>
          <option value="popular">Most used</option>
          <option value="rating">Highest rated</option>
        </select>
      </div>
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
                  ? "CURATED STARTER"
                  : tab === "mine"
                    ? t.published
                      ? "PUBLIC TEMPLATE"
                      : "PERSONAL TEMPLATE"
                    : "COMMUNITY BLUEPRINT"}
              </span>
              <Link to={`/templates/${t.id}`}>
                <h2>{t.name}</h2>
              </Link>
              <p>
                {t.description || "One small promise. Three ways to show up."}
              </p>
              <small>By {t.authorName || app.user?.displayName || "You"}</small>
              <div className="template-meta">
                <span>
                  <Star size={15} />
                  {stats[t.id]?.reviews
                    ? `${Number(stats[t.id].rating).toFixed(1)} (${stats[t.id].reviews})`
                    : "Not rated yet"}
                </span>
                <span>
                  {stats[t.id]
                    ? `${stats[t.id].uses} uses`
                    : t.starter
                      ? "Built-in example"
                      : "—"}
                </span>
              </div>
              <div className="template-actions">
                {tab === "mine" ? (
                  <>
                    <Link
                      className="button secondary compact"
                      to={`/templates/${t.id}/edit`}
                    >
                      <Edit3 size={15} />
                      Edit
                    </Link>
                    <button
                      className="button compact"
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
                            "Delete this personal template? Existing task copies will remain.",
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
                      View progression
                    </Link>
                    <Link
                      className="button compact"
                      to="/tasks/new"
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
    </>
  );
}
export function TemplateDetail() {
  const app = useApp(),
    { id } = useParams();
  const initial =
    starterTemplates.find((t) => t.id === id) ||
    app.templates.find((t) => t.id === id) ||
    app.savedTemplates.find((s) => s.templateId === id)?.snapshot;
  const [template, setTemplate] = useState(initial),
    [loading, setLoading] = useState(!initial),
    [reviews, setReviews] = useState([]),
    [stats, setStats] = useState(null),
    [rating, setRating] = useState(5),
    [text, setText] = useState(""),
    [recommend, setRecommend] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    if (initial) return;
    loadPublicTemplate(id)
      .then((t) => {
        if (!cancelled) {
          setTemplate(t);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  useEffect(() => {
    if (id.startsWith("starter-")) return;
    templateStats(id)
      .then(setStats)
      .catch((e) => setError(e.message));
    return listenReviews(id, setReviews, (e) => setError(e.message));
  }, [id]);
  useEffect(() => {
    const own = reviews.find((r) => r.authorId === app.user?.uid);
    if (own) {
      setRating(own.rating);
      setText(own.text);
      setRecommend(own.recommend);
    }
  }, [reviews, app.user?.uid]);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await reviewTemplate(id, app.user, rating, text.trim(), recommend);
      setStats(await templateStats(id));
      app.setNotice("Your review was saved. Thank you for helping others.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <div className="loading">Finding your blueprint…</div>;
  if (!template)
    return (
      <Empty
        title="Template unavailable"
        action={
          <Link to="/templates" className="button">
            Explore templates
          </Link>
        }
      >
        {error || "The author may have unpublished it."}
      </Empty>
    );
  return (
    <>
      <PageTitle
        back="/templates"
        eyebrow={template.category}
        title={template.name}
      />
      <div className="detail-layout">
        <section>
          <p className="lede">{template.description}</p>
          <p className="muted">
            By {template.authorName || app.user?.displayName || "You"} ·{" "}
            {stats?.reviews
              ? `${stats.rating.toFixed(1)} stars · ${stats.reviews} reviews`
              : "No reviews yet"}{" "}
            {stats ? `· ${stats.uses} uses` : ""}
          </p>
          <Progression task={template} />
          <Link className="button full" to="/tasks/new" state={{ template }}>
            Customize & use template
            <ArrowRight size={18} />
          </Link>
          <p className="muted">
            You'll choose your own schedule and can change every requirement.
          </p>
        </section>
        <section className="panel form-section">
          <h2>Community reflections</h2>
          {template.starter ? (
            <p className="muted">
              This built-in example isn't a published community template.
              Customize it to get started.
            </p>
          ) : (
            <>
              {error && <p className="inline-error">{error}</p>}
              {reviews.length ? (
                reviews
                  .sort((a, b) => b.updatedAt - a.updatedAt)
                  .map((r) => (
                    <article className="review-card" key={r.id}>
                      <strong>{r.authorName}</strong>
                      <span className="stars">
                        {"★".repeat(r.rating)}
                        {"☆".repeat(5 - r.rating)}
                      </span>
                      <p>{r.text}</p>
                      <small>
                        {r.recommend
                          ? "Would recommend"
                          : "Shared their experience"}
                      </small>
                    </article>
                  ))
              ) : (
                <p className="muted">
                  Be the first to share what worked for you.
                </p>
              )}
              {reviews.length === 100 && (
                <small>
                  Showing up to 100 reviews. Rating above reflects all reviews.
                </small>
              )}
              {app.user ? (
                <form onSubmit={submit} className="review-form">
                  <h3>
                    {reviews.some((r) => r.authorId === app.user.uid)
                      ? "Update your review"
                      : "Share your experience"}
                  </h3>
                  <div className="star-picker">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        type="button"
                        key={n}
                        aria-label={`Rate ${n} stars`}
                        aria-pressed={rating === n}
                        onClick={() => setRating(n)}
                      >
                        <Star fill={n <= rating ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                  <label>
                    Your experience
                    <textarea
                      required
                      minLength={3}
                      maxLength={1000}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Was the minimum achievable? What helped?"
                    />
                  </label>
                  <label className="confirm-row">
                    <input
                      type="checkbox"
                      checked={recommend}
                      onChange={(e) => setRecommend(e.target.checked)}
                    />
                    I'd recommend this template
                  </label>
                  <button className="button" disabled={busy}>
                    {busy ? "Saving…" : "Save review"}
                  </button>
                </form>
              ) : (
                <button
                  className="button secondary"
                  onClick={() => app.login()}
                >
                  Sign in to leave a review
                </button>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}

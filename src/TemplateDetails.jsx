import { AppLoading } from "./LoadingStates";
import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Star,
  ChevronDown,
  CalendarDays,
  User,
} from "lucide-react";
import {
  useApp,
  loadPublicTemplate,
  templateStats,
  listenReviews,
  reviewTemplate,
} from "./store";
import { starterTemplates, WEEKDAYS } from "./domain";
import { Empty, PageTitle, RequirementText, Tier } from "./components";
import { templateAuthorName } from "./template-author.js";

export function TemplateDetails() {
  const { id } = useParams();
  const { user } = useApp();
  return (
    <TemplateDetailsContent key={`${id}:${user?.uid || "guest"}`} id={id} />
  );
}
function TemplateDetailsContent({ id }) {
  const app = useApp();
  const own = app.templates.find((row) => row.id === id);
  const starter = starterTemplates.find((row) => row.id === id);
  const initial =
    starter ||
    own ||
    app.savedTemplates.find((row) => row.templateId === id)?.snapshot;
  const [template, setTemplate] = useState(initial);
  const [loading, setLoading] = useState(!initial);
  const [checking, setChecking] = useState(
    !starter && !(own && !own.published),
  );
  const [publicAvailable, setPublicAvailable] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewReadError, setReviewReadError] = useState(false);
  const [stats, setStats] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [rating, setRating] = useState(5),
    [text, setText] = useState(""),
    [recommend, setRecommend] = useState(true),
    [busy, setBusy] = useState(false);
  const reviewEdited = useRef(false),
    saveLock = useRef(false),
    composer = useRef(null);
  useEffect(() => {
    let active = true;
    if (starter || (own && !own.published)) {
      setLoading(false);
      setChecking(false);
      return;
    }
    loadPublicTemplate(id)
      .then((value) => {
        if (active) {
          if (value) setTemplate(value);
          setPublicAvailable(!!value);
        }
      })
      .catch((error) => {
        if (active)
          setLoadError(
            `Community template could not be refreshed: ${error.message}`,
          );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setChecking(false);
        }
      });
    return () => {
      active = false;
    };
  }, [id]);
  useEffect(() => {
    if (!publicAvailable) return;
    let active = true;
    setReviewsLoading(true);
    templateStats(id)
      .then((value) => {
        if (active) setStats(value);
      })
      .catch(() => {});
    const unsubscribe = listenReviews(
      id,
      (rows) => {
        if (active) {
          setReviews(rows);
          setReviewsLoading(false);
          setReviewReadError(false);
        }
      },
      (error) => {
        if (active) {
          setReviewError(`Could not load reviews: ${error.message}`);
          setReviewReadError(true);
          setReviewsLoading(false);
        }
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [id, publicAvailable]);
  useEffect(() => {
    const review = reviews.find((row) => row.authorId === app.user?.uid);
    if (review && !reviewEdited.current) {
      setRating(review.rating);
      setText(review.text);
      setRecommend(review.recommend);
    }
  }, [reviews, app.user?.uid]);
  async function submit(event) {
    event.preventDefault();
    if (saveLock.current || !app.user || !app.online || !publicAvailable)
      return;
    if (text.trim().length < 3) {
      setReviewError("Write at least 3 characters.");
      return;
    }
    saveLock.current = true;
    setBusy(true);
    setReviewError("");
    try {
      await reviewTemplate(id, app.user, rating, text.trim(), recommend);
      reviewEdited.current = false;
      if (composer.current) composer.current.open = false;
      app.setNotice("Review saved.");
      try {
        setStats(await templateStats(id));
      } catch {}
    } catch (error) {
      setReviewError(error.message);
    } finally {
      saveLock.current = false;
      setBusy(false);
    }
  }
  if (loading) return <AppLoading />;
  if (!template)
    return (
      <Empty
        title="Template unavailable"
        action={
          <Link className="button" to="/templates">
            Explore templates
          </Link>
        }
      >
        {loadError || "This template may have been unpublished."}
      </Empty>
    );
  const author = templateAuthorName(template, app.user, !!own);
  const ownReview = reviews.some((row) => row.authorId === app.user?.uid);
  const sorted = [...reviews].sort(
    (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
  );
  return (
    <div className="template-detail-page">
      <PageTitle
        back="/templates"
        eyebrow={template.category}
        title={template.name}
      >
        <Link
          className="button"
          to="/habits/new"
          state={{ template, privateTemplate: !!own }}
        >
          Use template
          <ArrowRight size={16} />
        </Link>
      </PageTitle>
      <div className="template-detail-summary">
        {template.description && <p>{template.description}</p>}
        <div className="template-author-line">
          <span className="template-author-icon">
            <User size={14} />
          </span>
          <span>
            By <strong>{author}</strong>
          </span>
          <span className="template-visibility">
            {template.starter
              ? "Built-in starter"
              : own && !own.published
                ? "Private template"
                : publicAvailable
                  ? "Community template"
                  : "Saved copy"}
          </span>
          {stats?.reviews > 0 && (
            <span className="template-detail-rating">
              <Star size={13} />
              {Number(stats.rating).toFixed(1)} · {stats.reviews} reviews
            </span>
          )}
        </div>
      </div>
      {loadError && (
        <p className="banner" role="status">
          {loadError}
          {initial ? " Showing your saved copy." : ""}
        </p>
      )}
      <div className="template-detail-workspace">
        <section
          className="panel template-tier-panel"
          aria-label="Template tasks"
        >
          <header>
            <h2>Tasks by tier</h2>
            <span>T1 is the minimum</span>
          </header>
          {template.levels.map((rows, index) => (
            <section className="template-tier-section" key={index}>
              <div className="template-tier-heading">
                <Tier level={index + 1} />
                <h3>
                  {index === 0
                    ? "Daily minimum"
                    : `Extra tasks after T${index}`}
                </h3>
                <small>
                  {rows.length} {rows.length === 1 ? "task" : "tasks"}
                </small>
              </div>
              <ul>
                {rows.map((row) => (
                  <li key={row.id}>
                    <RequirementText r={row} additional={index > 0} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </section>
        <aside className="template-detail-aside">
          <section className="panel template-schedule-panel">
            <header>
              <CalendarDays size={17} />
              <h2>Suggested days</h2>
            </header>
            <div
              className="template-schedule-days"
              aria-label="Template suggested days"
            >
              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                <span
                  key={day}
                  className={
                    template.weekdays?.includes(day) ? "is-scheduled" : ""
                  }
                  aria-label={`${WEEKDAYS[day]}${template.weekdays?.includes(day) ? ", scheduled" : ", not scheduled"}`}
                >
                  {WEEKDAYS[day]}
                </span>
              ))}
            </div>
            <p>You can change the schedule before adding this habit.</p>
          </section>
          {checking && (
            <p className="template-detail-loading" role="status">
              Checking community availability…
            </p>
          )}
          {publicAvailable && (
            <section className="panel template-reviews-panel">
              <header>
                <h2>Reviews</h2>
                <span>{stats?.reviews ?? reviews.length}</span>
              </header>
              {reviewError && (
                <p className="inline-error" role="alert">
                  {reviewError}
                </p>
              )}
              {reviewsLoading ? (
                <p className="template-no-reviews" role="status">
                  Loading reviews…
                </p>
              ) : sorted.length ? (
                <div className="template-review-list">
                  {sorted.map((review) => (
                    <article className="review-card" key={review.id}>
                      <div>
                        <strong>
                          {review.authorName || "Author unavailable"}
                        </strong>
                        <span
                          className="template-review-stars"
                          aria-label={`${review.rating} out of 5 stars`}
                        >
                          {"★".repeat(Math.max(0, Math.min(5, review.rating)))}
                        </span>
                      </div>
                      <p>{review.text}</p>
                      {review.recommend && (
                        <small>Recommends this template</small>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                !reviewReadError && (
                  <p className="template-no-reviews">No reviews yet.</p>
                )
              )}
              {reviews.length === 100 && (
                <small className="template-review-limit">
                  Showing up to 100 reviews.
                </small>
              )}
              {app.user ? (
                <details className="template-review-composer" ref={composer}>
                  <summary>
                    {ownReview ? "Edit your review" : "Write a review"}
                    <ChevronDown size={15} />
                  </summary>
                  <form className="review-form" onSubmit={submit}>
                    <p className="template-review-privacy">
                      Public as <strong>{app.user.displayName}</strong>. Don’t
                      include private information.
                    </p>
                    <div
                      className="star-picker"
                      role="group"
                      aria-label="Your rating"
                    >
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          type="button"
                          key={value}
                          aria-label={`Rate ${value} stars`}
                          aria-pressed={rating === value}
                          disabled={busy || !app.online}
                          onClick={() => {
                            reviewEdited.current = true;
                            setRating(value);
                          }}
                        >
                          <Star
                            size={22}
                            fill={value <= rating ? "currentColor" : "none"}
                          />
                        </button>
                      ))}
                    </div>
                    <label>
                      Your experience
                      <textarea
                        aria-label="Your experience"
                        required
                        minLength={3}
                        maxLength={1000}
                        rows={3}
                        value={text}
                        disabled={busy || !app.online}
                        onChange={(event) => {
                          reviewEdited.current = true;
                          setText(event.target.value);
                        }}
                        placeholder="What worked well? What would you change?"
                      />
                    </label>
                    <label className="confirm-row">
                      <input
                        type="checkbox"
                        checked={recommend}
                        disabled={busy || !app.online}
                        onChange={(event) => {
                          reviewEdited.current = true;
                          setRecommend(event.target.checked);
                        }}
                      />
                      I’d recommend this template
                    </label>
                    {!app.online && (
                      <p className="template-review-privacy">
                        Reconnect to save a review.
                      </p>
                    )}
                    <button className="button" disabled={busy || !app.online}>
                      {busy ? "Saving…" : "Save review"}
                    </button>
                  </form>
                </details>
              ) : (
                <button
                  className="button secondary template-review-login"
                  disabled={!app.online}
                  onClick={() => app.login()}
                >
                  Sign in to review
                </button>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

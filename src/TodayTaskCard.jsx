import { useEffect, useRef, useState } from "react";
import { Check, ArrowRight, Trophy } from "lucide-react";
import { CategoryIcon, Tier, RequirementText, cx } from "./components";
import { achieved, LEVELS } from "./domain";
import { useApp } from "./store";

// Today is the action surface: no route change, checklist, or modal required.
export function TodayTaskCard({ task, progress, day }) {
  const app = useApp();
  const [busy, setBusy] = useState(false);
  const [settling, setSettling] = useState(false);
  const unlockTimer = useRef(null);
  useEffect(() => () => clearTimeout(unlockTimer.current), []);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const locked = useRef(false);
  const completed = achieved(progress);
  const nextLevel = completed + 1;
  const snapshot = progress?.snapshot || task;
  const remaining =
    completed < 3
      ? snapshot.levels[completed].filter((r) => !progress?.checks?.[r.id])
      : [];

  async function win() {
    if (locked.current || completed === 3) return;
    locked.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    // Capture the displayed target: retries/double clicks must never award
    // an unintended extra level when another device has already won this one.
    const target = nextLevel;
    try {
      await app.winLevel(task, target, day);
      setMessage(
        target === 1
          ? "T1 badge achieved. Your minimum is enough — the rest is optional."
          : target === 2
            ? "T2 badge achieved. A little extra, on your terms."
            : "T3 badge achieved. You’re done for today.",
      );
    } catch (e) {
      setError(
        e.code === "permission-denied"
          ? "Firebase denied this save. Check that the supplied Firestore rules are published for this project, then retry."
          : e.message || "This badge could not be saved. Please try again.",
      );
    } finally {
      setBusy(false);
      setSettling(true);
      unlockTimer.current = setTimeout(() => {
        locked.current = false;
        setSettling(false);
      }, 400);
    }
  }

  return (
    <article
      className={cx(
        "task-card",
        "today-task-card",
        completed > 0 && "task-won",
        completed === 3 && "all-tiers-won",
      )}
      aria-label={snapshot.name}
      aria-busy={busy}
    >
      <div className="today-task-heading">
        <CategoryIcon category={snapshot.category} />
        <div className="task-copy">
          <h3>{snapshot.name}</h3>
          <p className="inline-level-status">
            {completed > 0 ? (
              <>
                <Check size={14} /> T{completed} badge achieved
              </>
            ) : (
              "Ready for your T1 badge"
            )}
          </p>
        </div>
        {completed > 0 && <Tier level={completed} />}
      </div>
      {completed < 3 ? (
        <div className="today-task-next">
          <div className="inline-next-copy">
            <h4>
              Next: T{nextLevel} badge
              {completed > 0 && (
                <span className="optional-label">Optional</span>
              )}
            </h4>
            <ul className="inline-next-requirements">
              {remaining.map((r) => (
                <li key={r.id}>
                  <RequirementText r={r} additional={nextLevel > 1} />
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            className={cx(
              "button",
              "inline-win-button",
              completed > 0 && "secondary",
            )}
            disabled={busy || settling}
            onClick={win}
            aria-label={`Achieve T${nextLevel} badge for ${snapshot.name}`}
          >
            {busy ? "Saving…" : `Achieve T${nextLevel} badge`}
            {!busy && <ArrowRight size={17} />}
          </button>
        </div>
      ) : (
        <div className="inline-full-win">
          <Trophy size={18} />
          <span>T3 badge achieved. Nothing more to do today.</span>
        </div>
      )}
      {error && (
        <p className="inline-card-error" role="alert">
          {error}
        </p>
      )}
      <p
        className="inline-win-message"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {message}
      </p>
    </article>
  );
}

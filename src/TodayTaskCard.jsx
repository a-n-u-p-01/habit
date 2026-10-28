import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { CategoryIcon, Tier, cx } from "./components";
import { achieved } from "./domain";
import { HabitCompletionDialog } from "./HabitCompletionDialog";

export function TodayTaskCard({ task, progress, day, suggested = false }) {
  const card = useRef(null);
  const [selection, setSelection] = useState(null);
  const [message, setMessage] = useState("");
  const completed = achieved(progress);
  const snapshot = progress?.snapshot || task;
  function open() {
    if (completed >= 3) return;
    setMessage("");
    // Freeze exactly what the user is about to review, without creating a
    // progress record or changing any checks merely by opening the dialog.
    setSelection(
      JSON.parse(
        JSON.stringify({
          task,
          snapshot,
          checks: progress?.checks || {},
          target: completed + 1,
          day,
        }),
      ),
    );
  }
  function finish(target) {
    setSelection(null);
    setMessage(
      target === 1
        ? "T1 complete. Your minimum is done."
        : `T${target} complete. ${target === 3 ? "All done for today." : "The next extra is optional."}`,
    );
    if (target === 3)
      requestAnimationFrame(() => card.current?.focus({ preventScroll: true }));
  }
  return (
    <article
      ref={card}
      tabIndex={-1}
      className={cx(
        "task-card",
        "today-task-card",
        "compact-habit-card",
        suggested && completed === 0 && "suggested-habit",
        completed > 0 && "task-won",
        completed === 3 && "all-tiers-won",
      )}
      aria-label={snapshot.name}
    >
      <div className="today-task-heading">
        <CategoryIcon category={snapshot.category} />
        <div className="task-copy">
          {suggested && completed === 0 && (
            <span className="next-step-label">Next small step</span>
          )}
          <h3>{snapshot.name}</h3>
          <p className="inline-level-status">
            {completed > 0 ? (
              <>
                <Check size={14} /> Minimum done <Tier level={completed} />
              </>
            ) : (
              "T1 is your minimum"
            )}
          </p>
        </div>
        <div className="habit-card-action">
          {completed < 3 ? (
            <>
              <button
                type="button"
                className={cx("button", completed > 0 && "secondary")}
                aria-label={`Complete T${completed + 1} for ${snapshot.name}`}
                aria-haspopup="dialog"
                onClick={open}
              >
                Complete T{completed + 1}
              </button>
              {completed > 0 && (
                <span className="habit-card-optional">Optional</span>
              )}
            </>
          ) : (
            <span className="inline-full-win">
              <Check size={17} /> All done
            </span>
          )}
        </div>
      </div>
      <p
        className="inline-win-message visually-hidden"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {message}
      </p>
      {selection && (
        <HabitCompletionDialog
          {...selection}
          onClose={() => setSelection(null)}
          onComplete={finish}
        />
      )}
    </article>
  );
}

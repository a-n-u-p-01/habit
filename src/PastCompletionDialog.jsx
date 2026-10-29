import React, { useEffect, useId, useRef, useState } from "react";
import { X, CalendarDays } from "lucide-react";
import { useApp } from "./store";
import { achieved, parseDate } from "./domain";
import { pastEntryInfo } from "./history";
import { RequirementText, Tier } from "./components";

export function PastCompletionDialog({ task, day, progress, onClose }) {
  const app = useApp();
  const dialog = useRef(null),
    locked = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const [target, setTarget] = useState(Math.min(3, achieved(progress) + 1));
  const [confirmed, setConfirmed] = useState(false);
  const [requirementsConfirmed, setRequirementsConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Freeze the requirements the user reviewed. The store rechecks them at save.
  const [info] = useState(() => pastEntryInfo(task, progress, day));
  const dateLabel = parseDate(day).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const shortDateLabel = parseDate(day).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  useEffect(() => {
    const node = dialog.current;
    node.showModal();
    return () => node.close();
  }, []);
  function close() {
    dialog.current.close();
    onClose();
  }
  async function submit(event) {
    event.preventDefault();
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await app.logPastCompletion(task.id, day, target, {
        confirmed,
        confirmCurrentRequirements: requirementsConfirmed,
        expectedSnapshot: info.snapshot,
      });
      app.setNotice(`Completion recorded for ${dateLabel}. Logged later.`);
      close();
    } catch (e) {
      setError(
        e.message || "The correction could not be saved. Please try again.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="past-completion-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) close();
      }}
    >
      <form onSubmit={submit}>
        <header className="past-dialog-header">
          <div>
            <span className="past-dialog-caption">PAST COMPLETION</span>
            <h2 id={titleId}>{info.snapshot?.name || task.name}</h2>
          </div>
          <button
            type="button"
            className="past-dialog-close"
            aria-label="Close dialog"
            title="Close"
            disabled={busy}
            onClick={close}
          >
            <X size={18} />
          </button>
          <p className="past-entry-date">
            <CalendarDays size={14} />
            {shortDateLabel}
          </p>
          <p className="past-dialog-description" id={descriptionId}>
            Today stays unchanged. Existing wins are kept.
          </p>
        </header>
        <div className="past-dialog-body">
          {!info.eligible ? (
            <p role="alert">{info.reason}</p>
          ) : (
            <>
              {info.needsRequirementsConfirmation && (
                <p className="banner past-requirements-warning">
                  Original tasks weren’t saved for this date. These are the
                  current tasks—confirm they match before saving.
                </p>
              )}
              <label className="past-tier-picker">
                Highest tier completed
                <select
                  aria-label="Highest tier completed"
                  value={target}
                  disabled={busy}
                  onChange={(event) => {
                    setTarget(Number(event.target.value));
                    setConfirmed(false);
                    setRequirementsConfirmed(false);
                  }}
                >
                  {[1, 2, 3]
                    .filter((level) => level > achieved(progress))
                    .map((level) => (
                      <option key={level} value={level}>
                        T{level}
                        {level === 1
                          ? " — Minimum"
                          : level === 2
                            ? " — T1 + T2"
                            : " — All tiers"}
                      </option>
                    ))}
                </select>
              </label>
              <div className="past-entry-requirements">
                {info.snapshot.levels.slice(0, target).map((rows, index) => (
                  <section key={index}>
                    <h3>
                      <Tier level={index + 1} />
                      {index === 0 ? "Minimum tasks" : "Extra tasks"}
                    </h3>
                    <ul>
                      {rows.map((row) => (
                        <li key={row.id}>
                          <RequirementText r={row} additional={index > 0} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
              {info.needsRequirementsConfirmation && (
                <label className="confirm-row past-confirmation">
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={requirementsConfirmed}
                    onChange={(event) =>
                      setRequirementsConfirmed(event.target.checked)
                    }
                  />
                  <span>
                    These requirements match what this habit required on{" "}
                    {dateLabel}.
                  </span>
                </label>
              )}
              <label className="confirm-row past-confirmation">
                <input
                  type="checkbox"
                  aria-label={`I completed all the requirements shown on ${dateLabel}.`}
                  disabled={busy}
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                <span>I completed these tasks on {shortDateLabel}.</span>
              </label>
            </>
          )}
          {app.user && !app.online && (
            <p className="past-dialog-message" role="status">
              Reconnect to save this entry to your account.
            </p>
          )}
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="past-entry-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={close}
          >
            Cancel
          </button>
          {info.eligible && (
            <button
              className="button"
              aria-label="Save past completion"
              disabled={
                busy ||
                !confirmed ||
                (info.needsRequirementsConfirmation &&
                  !requirementsConfirmed) ||
                (!!app.user && !app.online)
              }
            >
              {busy ? "Saving…" : "Save completion"}
            </button>
          )}
        </footer>
      </form>
    </dialog>
  );
}

import React, { useEffect, useId, useRef, useState } from "react";
import { useApp } from "./store";
import { achieved, parseDate } from "./domain";
import { pastEntryInfo } from "./history";
import { RequirementText, Tier } from "./components";

export function PastCompletionDialog({ task, day, progress, onClose }) {
  const app = useApp();
  const dialog = useRef(null),
    locked = useRef(false);
  const titleId = useId();
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
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) close();
      }}
    >
      <form onSubmit={submit}>
        <span className="eyebrow">LOG A COMPLETED HABIT</span>
        <h2 id={titleId}>{info.snapshot?.name || task.name}</h2>
        <p className="past-entry-date">{dateLabel}</p>
        {!info.eligible ? (
          <p role="alert">{info.reason}</p>
        ) : (
          <>
            <p>
              Only record work you actually completed on this date. Today's
              progress will not change.
            </p>
            {info.needsRequirementsConfirmation && (
              <p className="banner">
                No original requirements were saved for this date. The current
                requirements are shown below; review them carefully.
              </p>
            )}
            <label>
              Highest tier completed
              <select
                aria-label="Highest tier completed"
                value={target}
                disabled={busy}
                onChange={(e) => {
                  setTarget(Number(e.target.value));
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
                          ? " — Minimum + T2 extras"
                          : " — Minimum + T2 + T3 extras"}
                    </option>
                  ))}
              </select>
            </label>
            <div className="past-entry-requirements">
              {info.snapshot.levels.slice(0, target).map((rows, index) => (
                <section key={index}>
                  <h3>
                    <Tier level={index + 1} />{" "}
                    {index === 0 ? "Minimum" : "Additional effort"}
                  </h3>
                  <ul>
                    {rows.map((r) => (
                      <li key={r.id}>
                        <RequirementText r={r} additional={index > 0} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            {info.needsRequirementsConfirmation && (
              <label className="confirm-row">
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={requirementsConfirmed}
                  onChange={(e) => setRequirementsConfirmed(e.target.checked)}
                />
                <span>
                  These requirements match what this habit required on{" "}
                  {dateLabel}.
                </span>
              </label>
            )}
            <label className="confirm-row">
              <input
                type="checkbox"
                disabled={busy}
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>
                I completed all the requirements shown on {dateLabel}.
              </span>
            </label>
            <p className="muted">
              Saved as Logged later. Existing wins will not be removed.
            </p>
          </>
        )}
        {app.user && !app.online && (
          <p role="status">
            Reconnect to save a correction to your cloud account.
          </p>
        )}
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="past-entry-actions">
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
              disabled={
                busy ||
                !confirmed ||
                (info.needsRequirementsConfirmation &&
                  !requirementsConfirmed) ||
                (!!app.user && !app.online)
              }
            >
              {busy ? "Saving…" : "Save past completion"}
            </button>
          )}
        </div>
      </form>
    </dialog>
  );
}

import React, { useEffect, useId, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { RequirementText, Tier } from "./components";
import { dateKey } from "./domain";
import { useApp } from "./store";

export function HabitCompletionDialog({
  task,
  snapshot,
  checks,
  target,
  day,
  onClose,
  onComplete,
}) {
  const app = useApp();
  const dialog = useRef(null),
    locked = useRef(false);
  const titleId = useId(),
    confirmationId = useId();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const node = dialog.current;
    node.showModal();
    return () => node.close();
  }, []);
  function close() {
    if (locked.current) return;
    dialog.current.close();
    onClose();
  }
  async function submit(event) {
    event.preventDefault();
    if (!confirmed || locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      if (day !== dateKey())
        throw new Error(
          "The date has changed. Reopen Today before completing this habit.",
        );
      // The reviewed tier is fixed at modal opening. A retry or another device
      // must never turn this confirmation into an unintended next-tier win.
      await app.winLevel(task, target, day);
      dialog.current.close();
      onComplete(target);
    } catch (e) {
      setError(
        e.code === "permission-denied"
          ? "This completion could not be saved. Check your connection and deployed Firestore rules, then retry."
          : e.message || "Could not save. Please try again.",
      );
      setBusy(false);
      locked.current = false;
    }
  }
  return (
    <dialog
      ref={dialog}
      className="habit-completion-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <form onSubmit={submit}>
        <header className="completion-modal-header">
          <div className="completion-tier-label">
            <Tier level={target} />
            <span>{target === 1 ? "YOUR MINIMUM" : "OPTIONAL EXTRA"}</span>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close completion"
            disabled={busy}
            onClick={close}
          >
            <X size={20} />
          </button>
        </header>
        <h2 id={titleId}>{snapshot.name}</h2>
        <p className="completion-modal-intro">
          {target === 1
            ? "Finish these tasks, then confirm below."
            : `These are additional tasks after T${target - 1}. Only complete them if you want to.`}
        </p>
        <ul className="completion-task-list">
          {snapshot.levels[target - 1].map((r, index) => (
            <li key={r.id}>
              <span className="completion-task-dot" aria-hidden="true">
                {checks[r.id] ? <Check size={14} /> : index + 1}
              </span>
              <div>
                <RequirementText r={r} additional={target > 1} />
                {checks[r.id] && <small>Already marked</small>}
              </div>
            </li>
          ))}
        </ul>
        <fieldset className="completion-confirmation" disabled={busy}>
          <legend className="visually-hidden">Completion confirmation</legend>
          <label className="completion-radio-row">
            <input
              type="radio"
              name={confirmationId}
              value="completed"
              checked={confirmed}
              required
              onChange={() => setConfirmed(true)}
            />
            <span>I completed all the tasks above.</span>
          </label>
        </fieldset>
        {error && (
          <p className="inline-card-error" role="alert">
            {error}
          </p>
        )}
        <div className="completion-modal-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={close}
          >
            Cancel
          </button>
          <button className="button" disabled={busy || !confirmed}>
            {busy ? "Saving…" : "Complete"}
            {!busy && <Check size={17} />}
          </button>
        </div>
      </form>
    </dialog>
  );
}

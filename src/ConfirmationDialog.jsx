import React, { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";

export function ConfirmationDialog({
  title,
  description,
  icon: Icon,
  confirmLabel,
  onConfirm,
  onClose,
  disabled = false,
  children,
}) {
  const node = useRef(null),
    locked = useRef(false);
  const titleId = useId(),
    descriptionId = useId();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const dialog = node.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  function close() {
    if (locked.current) return;
    node.current.close();
    onClose();
  }
  async function confirm(event) {
    event.preventDefault();
    if (disabled || locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      node.current.close();
      onClose();
    } catch (error) {
      setError(
        error?.message || "This change could not be saved. Please try again.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={node}
      className="app-confirmation-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <form onSubmit={confirm}>
        <header>
          <div className="confirmation-heading">
            {Icon && (
              <span className="confirmation-icon">
                <Icon size={21} />
              </span>
            )}
            <h2 id={titleId}>{title}</h2>
          </div>
          <button
            type="button"
            className="confirmation-close"
            aria-label="Close confirmation"
            disabled={busy}
            onClick={close}
          >
            <X size={18} />
          </button>
        </header>
        <div className="confirmation-content">
          <p id={descriptionId}>{description}</p>
          {children}
          {error && (
            <p className="confirmation-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer>
          <button
            type="button"
            className="button secondary"
            autoFocus
            disabled={busy}
            onClick={close}
          >
            Cancel
          </button>
          <button className="button" disabled={busy || disabled}>
            {busy ? "Saving…" : confirmLabel}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

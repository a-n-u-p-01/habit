import React, { useEffect, useState } from "react";
import { RefreshCw, CloudOff, TriangleAlert } from "lucide-react";

export function AppLoading({ fullScreen = false, offline = false, onRetry }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 12000);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div
      className={`app-loading-state${fullScreen ? " is-fullscreen" : ""}`}
      aria-busy="true"
    >
      {fullScreen && (
        <div className="app-loading-brand">
          <img src="/icon.svg" alt="" width="42" height="42" />
          <strong>Win Today</strong>
        </div>
      )}
      <div className="app-loading-status" role="status" aria-live="polite">
        <span className="app-loading-spinner" aria-hidden="true" />
        <span>Loading…</span>
      </div>
      {slow && (
        <div className="app-loading-slow">
          <p>
            {offline
              ? "You’re offline. Reconnect to continue."
              : "This is taking longer than usual."}
          </p>
          {onRetry && (
            <button className="button secondary" onClick={onRetry}>
              <RefreshCw size={14} />
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
export function ContentLoading() {
  return (
    <div
      className="content-loading"
      role="status"
      aria-label="Loading page"
      aria-busy="true"
    >
      <span className="visually-hidden">Loading…</span>
      <div aria-hidden="true">
        <div className="loading-placeholder skeleton-title" />
        <div className="skeleton-toolbar">
          <div className="loading-placeholder" />
          <div className="loading-placeholder" />
        </div>
        <div className="skeleton-cards">
          {[0, 1, 2].map((index) => (
            <div key={index} className="skeleton-card">
              <div className="loading-placeholder" />
              <div className="loading-placeholder" />
            </div>
          ))}
        </div>
        <div className="skeleton-list">
          {[0, 1, 2].map((index) => (
            <div key={index} className="skeleton-row">
              <div className="loading-placeholder skeleton-icon" />
              <div>
                <div className="loading-placeholder" />
                <div className="loading-placeholder" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export function StartupRecovery({
  offline = false,
  error,
  onRetry,
  onSignOut,
}) {
  const Icon = offline ? CloudOff : TriangleAlert;
  return (
    <main className="startup-recovery">
      <section aria-labelledby="startup-recovery-title">
        <span className="startup-recovery-icon">
          <Icon size={23} />
        </span>
        <h1 id="startup-recovery-title">
          {offline ? "You’re offline" : "Couldn’t load your account"}
        </h1>
        <p role="alert">
          {offline
            ? "Reconnect to load your account."
            : "Try loading the page again."}
        </p>
        <div className="startup-recovery-actions">
          <button className="button" onClick={onRetry}>
            <RefreshCw size={15} />
            Try again
          </button>
          {!offline && onSignOut && (
            <button className="button secondary" onClick={onSignOut}>
              Sign out
            </button>
          )}
        </div>
        {error && (
          <details>
            <summary>Error details</summary>
            <p>{error}</p>
          </details>
        )}
      </section>
    </main>
  );
}

import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  Target,
  CalendarDays,
  CheckCircle2,
  Settings,
  Sun,
  Moon,
  Monitor,
  Cloud,
  CloudOff,
  LogOut,
  Trash2,
  ChevronRight,
  Shield,
  HelpCircle,
} from "lucide-react";
import { ProfileNameForm } from "../ProfileName";
import { useApp } from "../store";
import { Avatar, PageTitle } from "../components";

// Keep existing bookmarks working without maintaining a second account hub.
export function Profile() {
  return <Navigate to="/settings" replace />;
}

export function SettingsPage() {
  const app = useApp();
  const [busy, setBusy] = useState("");
  async function perform(key, action) {
    if (busy) return;
    setBusy(key);
    try {
      await action();
    } catch (error) {
      app.setError(error.message);
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="minimal-settings settings-list-page">
      <PageTitle title="Settings" />
      <div className="settings-workspace-grid settings-vertical">
        <section
          className="panel essentials-card settings-account-card"
          aria-labelledby="account-heading"
        >
          <header className="essentials-heading">
            <h2 id="account-heading">Account</h2>
          </header>
          <div className="settings-account-row">
            <Avatar />
            <div>
              <strong>{app.user?.displayName || "Not signed in"}</strong>
            </div>
            {app.user && (
              <button
                className="button secondary settings-small-button"
                disabled={!!busy}
                onClick={() => perform("logout", app.logout)}
              >
                <LogOut size={15} />
                {busy === "logout" ? "Signing out…" : "Sign out"}
              </button>
            )}
          </div>
          {app.user ? (
            <ProfileNameForm key={app.user.uid} compact />
          ) : (
            <div className="settings-login">
              <button
                className="button"
                disabled={!!busy || !app.online}
                onClick={() => perform("login", () => app.login())}
              >
                Continue with Google
              </button>
            </div>
          )}
          {app.user && app.guestCount > 0 && (
            <div className="settings-conditional">
              <div>
                <strong>Unsynced device data</strong>
                <p>{app.guestCount} local records are ready to import.</p>
              </div>
              <button
                className="button secondary settings-small-button"
                disabled={!!busy || !app.online}
                onClick={() => perform("import", app.importGuest)}
              >
                {busy === "import" ? "Importing…" : "Import device data"}
              </button>
            </div>
          )}
        </section>

        <section
          className="panel essentials-card"
          aria-labelledby="appearance-heading"
        >
          <div className="settings-preference-row">
            <div>
              <h2 id="appearance-heading">Appearance</h2>
            </div>
            <div
              className="settings-theme-switch"
              role="group"
              aria-label="Color theme"
            >
              {[
                [Sun, "light", "Light"],
                [Moon, "dark", "Dark"],
                [Monitor, "system", "System"],
              ].map(([Icon, value, label]) => (
                <button
                  key={value}
                  aria-pressed={app.theme === value}
                  onClick={() => app.setTheme(value)}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>
        <section
          className="panel essentials-card"
          aria-labelledby="data-heading"
        >
          <header className="essentials-heading">
            <h2 id="data-heading">Data & privacy</h2>
            <Shield size={16} />
          </header>
          <div className="settings-data-item">
            <h3>
              <Cloud size={16} />
              Storage
            </h3>
            <p>
              {app.user
                ? "Saved changes are stored online when connected. Sign in with the same Google account on another device to access your habits, progress and reflections."
                : "Your data is saved in this browser only. Sign in to save changes online and access them on other devices."}
            </p>
            {!app.user && app.guestCount > 0 && (
              <p className="settings-storage-import-note">
                Import existing device data after signing in.
              </p>
            )}
          </div>
          <div className="settings-data-item">
            <h3>
              <Shield size={16} />
              Privacy
            </h3>
            <p>
              Your habits and progress are private. Templates and reviews are
              public only when you share them.
            </p>
          </div>
          {app.oldCacheCleared === false && (
            <div className="settings-conditional">
              <div>
                <strong>Older offline cache detected</strong>
                <p>
                  Keep older tabs open until pending changes finish saving, then
                  close them before removing this cache.
                </p>
              </div>
              <button
                className="button secondary settings-small-button"
                disabled={!!busy || !app.online || app.pending}
                onClick={() => perform("cache", app.removeLegacyCache)}
              >
                {busy === "cache" ? "Removing…" : "Remove older cloud cache"}
              </button>
            </div>
          )}
          <details className="settings-danger">
            <summary>
              {app.user ? "Delete account & data" : "Clear device data"}
              <ChevronRight size={15} />
            </summary>
            <p>
              {app.user
                ? "Permanently removes your account, private data, public templates, reviews and usage records. This cannot be undone."
                : "Permanently removes all guest data in this browser. This cannot be undone."}
            </p>
            <button
              className="text-button danger"
              disabled={!!busy || (!!app.user && !app.online)}
              onClick={() => {
                if (
                  window.confirm(
                    app.user
                      ? "Permanently delete your account and all app data? This cannot be undone."
                      : "Delete all guest data on this device? This cannot be undone.",
                  )
                )
                  perform("erase", app.erase);
              }}
            >
              <Trash2 size={15} />
              {busy === "erase"
                ? "Deleting…"
                : app.user
                  ? "Delete account & app data"
                  : "Clear device data"}
            </button>
          </details>
        </section>
      </div>
      <footer className="settings-support">
        <Link to="/help">
          <HelpCircle size={14} />
          Help & feedback
          <ChevronRight size={13} />
        </Link>
      </footer>
    </div>
  );
}

export function Help({ embedded = false }) {
  return (
    <div className="help-workspace">
      {!embedded && (
        <>
          <PageTitle eyebrow="QUICK GUIDE" title="Help & guide" />
          <p className="help-lede">
            The essentials for tracking habits, saving progress, and getting
            unstuck.
          </p>
        </>
      )}
      <div className="help-guide-grid">
        <section
          className="panel help-guide-card"
          aria-labelledby="daily-guide-heading"
        >
          <header>
            <CheckCircle2 size={19} />
            <h2 id="daily-guide-heading">Your daily flow</h2>
          </header>
          <ol className="help-step-list">
            <li>
              <strong>Create a manageable habit</strong>
              <p>
                Choose its scheduled days and define the tasks for each tier.
                Make T1 small enough for a busy day.
              </p>
            </li>
            <li>
              <strong>Complete and confirm</strong>
              <p>
                On Today, open the completion action for a habit. Confirm only
                what you actually finished, then save.
              </p>
            </li>
            <li>
              <strong>Know when your day is won</strong>
              <p>
                Complete T1 for every habit scheduled that day. Days with no
                scheduled habits are rest days, not wins or misses.
              </p>
            </li>
          </ol>
          <Link className="help-inline-link" to="/">
            Go to Today <ArrowRight size={14} />
          </Link>
        </section>
        <section
          className="panel help-guide-card"
          aria-labelledby="tiers-guide-heading"
        >
          <header>
            <Target size={19} />
            <h2 id="tiers-guide-heading">How tiers work</h2>
          </header>
          <div className="help-tier-list">
            {[
              [
                "T1",
                "Your minimum win",
                "Finish every T1 task to achieve the habit for the day.",
              ],
              [
                "T2",
                "An optional extra",
                "Complete T1 first, then the additional T2 tasks.",
              ],
              [
                "T3",
                "Go further if you want",
                "Complete T1 and T2, then the additional T3 tasks.",
              ],
            ].map(([tier, title, copy]) => (
              <div key={tier}>
                <span className={`help-tier ${tier.toLowerCase()}`}>
                  {tier}
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="help-note">
            Example: T1 = 10 push-ups and T2 = 5 more means 15 total. You don’t
            repeat T1 to earn T2.
          </p>
        </section>
        <section
          className="panel help-guide-card"
          aria-labelledby="questions-guide-heading"
        >
          <header>
            <HelpCircle size={19} />
            <h2 id="questions-guide-heading">Common questions</h2>
          </header>
          <div className="help-faq-list">
            <details>
              <summary>
                How do I record a weekly reflection?
                <ChevronRight size={15} />
              </summary>
              <p>
                Open <Link to="/week/review">Weekly reflection</Link>, choose
                the week, and write what worked, what was difficult, or one next
                step. Save before leaving. Saved reflections can be reopened
                from its week selector.
              </p>
            </details>
            <details>
              <summary>
                Why won’t my changes save?
                <ChevronRight size={15} />
              </summary>
              <p>
                Check your connection, complete required fields, and read any
                error shown on the page. Cloud actions need a signed-in account.
                If it still fails,{" "}
                <Link to="/help?section=feedback">report the problem</Link> with
                the page, steps and error message—never a password.
              </p>
            </details>
            <details>
              <summary>
                Where can I follow up on feedback?
                <ChevronRight size={15} />
              </summary>
              <p>
                Open{" "}
                <Link to="/help?section=submissions">Your submissions</Link> to
                see Open, In progress or Resolved status. Reports are visible
                only to you and the admin team. Sign in to send or track
                feedback.
              </p>
            </details>

            <details>
              <summary>
                Forgot to record a completed habit?
                <ChevronRight size={15} />
              </summary>
              <p>
                Open <Link to="/week">This week</Link> and select the past
                habit’s completion action. You can log the previous seven
                calendar days when the habit was scheduled. Confirm the
                requirements you actually completed.
              </p>
            </details>
            <details>
              <summary>
                Need to change or pause a habit?
                <ChevronRight size={15} />
              </summary>
              <p>
                Use <Link to="/habits">My habits</Link> to edit, pause, or
                reorder it. Existing daily sessions keep their saved
                requirements; editing a habit does not rewrite those sessions.
              </p>
            </details>
            <details>
              <summary>
                Are my templates public?
                <ChevronRight size={15} />
              </summary>
              <p>
                Private templates stay in your account. Publishing a template
                makes its content and your chosen app name public. Posting a
                review also shares its content and your app name.
              </p>
            </details>
            <details>
              <summary>
                What if I miss a day?
                <ChevronRight size={15} />
              </summary>
              <p>
                Continue with today’s habits. Don’t log work you didn’t do. If
                T1 is often too much, reduce it in My habits so your minimum is
                realistic.
              </p>
            </details>
          </div>
        </section>
        <section
          className="panel help-guide-card"
          aria-labelledby="sync-guide-heading"
        >
          <header>
            <Cloud size={19} />
            <h2 id="sync-guide-heading">Keep your progress safe</h2>
          </header>
          <div className="help-safety-list">
            <div>
              <h3>Using this device only</h3>
              <p>
                Guest data lives in this browser. Clearing browser data can
                remove it. Sign in for cloud sync, then import local records
                from Settings.
              </p>
            </div>
            <div>
              <h3>Signed in or working offline</h3>
              <p>
                After you save a change, cloud syncing happens automatically
                when connected—there is no manual sync button. Loaded sessions
                can continue offline in this tab, but closing it before pending
                changes reach the cloud can lose those changes. New cloud
                sessions need a connection.
              </p>
            </div>
            <div>
              <h3>Your privacy</h3>
              <p>
                Your habits and progress are private. Admins can read your app
                profile and feedback, not your private habit records.
              </p>
            </div>
          </div>
          <Link className="help-inline-link" to="/settings">
            <Shield size={14} />
            Open privacy settings <ArrowRight size={14} />
          </Link>
        </section>
      </div>
      {!embedded && (
        <>
          <section className="help-contact-strip">
            <div>
              <strong>Still stuck or have an idea?</strong>
              <p>Send a private report or suggestion and track its status.</p>
            </div>
            <Link className="button secondary" to="/help?section=feedback">
              Report or suggest <ArrowRight size={15} />
            </Link>
          </section>
        </>
      )}
    </div>
  );
}

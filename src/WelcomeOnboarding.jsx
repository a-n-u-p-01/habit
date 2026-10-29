import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mountain,
  ArrowRight,
  ArrowLeft,
  Target,
  CalendarDays,
  CheckCircle2,
  BookOpen,
  Shield,
} from "lucide-react";
import { useApp } from "./store";
import { Tier } from "./components";
import { GoogleIcon } from "./GoogleIcon";
import {
  completeWelcome,
  initialWelcomeStep,
  WELCOME_SIGNIN_KEY,
  WELCOME_STEPS,
} from "./welcome.js";

export function WelcomeOnboarding() {
  const app = useApp(),
    navigate = useNavigate();
  const [step, setStep] = useState(() => initialWelcomeStep(sessionStorage));
  const [busy, setBusy] = useState(false);
  const locked = useRef(false),
    heading = useRef(null),
    previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current !== step) {
      previousStep.current = step;
      heading.current?.focus({ preventScroll: true });
    }
  }, [step]);
  function finish() {
    completeWelcome(localStorage, sessionStorage);
    navigate("/", { replace: true });
  }
  async function signIn() {
    if (locked.current || !app.online) return;
    locked.current = true;
    setBusy(true);
    sessionStorage.setItem(WELCOME_SIGNIN_KEY, "1");
    let result;
    try {
      result = await app.login();
      if (result?.status === "signed-in") finish();
      else if (result?.status !== "redirecting")
        sessionStorage.removeItem(WELCOME_SIGNIN_KEY);
    } finally {
      if (result?.status !== "redirecting") {
        locked.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <main className="welcome-screen">
      <section className="welcome-hero" aria-label="Win Today habit builder">
        <div className="welcome-brand">
          <Mountain size={25} />
          <span>WIN TODAY</span>
        </div>
        <div className="welcome-hero-copy">
          <span>HABIT BUILDER</span>
          <h1>
            Build discipline.
            <br />
            One habit at a time.
          </h1>
          <p>
            Set your routine. Complete your daily minimum. Track your progress.
          </p>
        </div>
      </section>
      <section className="welcome-main" aria-labelledby="welcome-step-heading">
        <div className="welcome-content">
          <nav className="welcome-step-navigation" aria-label="Welcome steps">
            {WELCOME_STEPS.map((title, index) => (
              <button
                key={title}
                type="button"
                aria-label={`Step ${index + 1}: ${title}`}
                aria-current={step === index ? "step" : undefined}
                disabled={busy}
                onClick={() => setStep(index)}
              >
                <span aria-hidden="true" />
              </button>
            ))}
          </nav>
          <div className="welcome-step-copy">
            <span className="welcome-step-label">{step + 1} OF 3</span>
            <h2 id="welcome-step-heading" ref={heading} tabIndex={-1}>
              {step === 0
                ? "Build a routine you can repeat."
                : step === 1
                  ? "Start with a daily minimum."
                  : "Start building your habits."}
            </h2>
            {step === 0 ? (
              <>
                <p>
                  Choose habits that matter to you and make them part of your
                  day.
                </p>
                <div className="welcome-features">
                  {[
                    [
                      Target,
                      "Choose your habits",
                      "Use a template or create your own.",
                    ],
                    [
                      CalendarDays,
                      "Set your schedule",
                      "Pick the days that fit your routine.",
                    ],
                    [
                      CheckCircle2,
                      "Track your progress",
                      "Record completions and review your week.",
                    ],
                  ].map(([Icon, title, copy]) => (
                    <div key={title}>
                      <span className="welcome-feature-icon">
                        <Icon size={19} />
                      </span>
                      <div>
                        <h3>{title}</h3>
                        <p>{copy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : step === 1 ? (
              <>
                <p>
                  T1 is your daily goal. T2 and T3 are optional extra tasks.
                </p>
                <div className="welcome-tier-example">
                  <header>
                    <BookOpen size={17} />
                    <strong>Example: Read daily</strong>
                  </header>
                  {[
                    [1, "Read 1 page", "Minimum"],
                    [2, "Read 4 more pages", "Optional"],
                    [3, "Read 5 more pages", "Optional"],
                  ].map(([tier, title, label]) => (
                    <div key={tier}>
                      <Tier level={tier} />
                      <strong>{title}</strong>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
                <p className="welcome-tier-note">
                  Finish each tier before moving to the next. T1 is enough to
                  complete the habit.
                </p>
              </>
            ) : (
              <>
                <p>
                  {app.user
                    ? "Your account is ready. Continue to your habits."
                    : "Sign in to save your habits and progress online and access them on other devices."}
                </p>
                <div className="welcome-account-info">
                  <Shield size={20} />
                  <div>
                    <h3>
                      {app.user
                        ? `Signed in as ${app.user.displayName}`
                        : "Your habits stay private"}
                    </h3>
                    <p>
                      {app.user
                        ? "Your saved changes are stored in your account."
                        : "Only templates and reviews you choose to share are public."}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
          {app.error && (
            <p className="welcome-error" role="alert">
              {app.error}
            </p>
          )}
          <footer className="welcome-actions">
            {step < 2 ? (
              <div className="welcome-navigation-actions">
                {step > 0 && (
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy}
                    onClick={() => setStep(step - 1)}
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                )}
                <button
                  type="button"
                  className="button"
                  disabled={busy}
                  onClick={() => setStep(step + 1)}
                >
                  {step === 0 ? "Next" : "Get started"}
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : app.user ? (
              <button className="button welcome-primary" onClick={finish}>
                Go to Today
                <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="button google-signin-button"
                  disabled={busy || !app.online}
                  aria-busy={busy}
                  onClick={signIn}
                >
                  <GoogleIcon />
                  {busy ? "Signing in…" : "Continue with Google"}
                </button>
                <button
                  type="button"
                  className="welcome-guest-button"
                  disabled={busy}
                  onClick={finish}
                >
                  Continue without an account
                  <ArrowRight size={14} />
                </button>
                <p className="welcome-device-note">
                  Without an account, data stays in this browser.
                </p>
                {!app.online && (
                  <p className="welcome-offline" role="status">
                    You’re offline. You can continue without an account.
                  </p>
                )}
              </>
            )}
            {step === 2 && (
              <button
                type="button"
                className="welcome-back-button"
                disabled={busy}
                onClick={() => setStep(1)}
              >
                <ArrowLeft size={14} />
                Back
              </button>
            )}
          </footer>
        </div>
      </section>
    </main>
  );
}

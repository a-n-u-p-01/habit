import React, { useState } from "react";
import { Mountain, Shield } from "lucide-react";
import { useApp } from "./store";

export function ProfileNameForm({ setup = false, compact = false }) {
  const app = useApp();
  const [name, setName] = useState(setup ? "" : app.user?.displayName || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await app.saveProfileName(name);
      setName(result.name);
      const text = result.contentUpdated
        ? "App name saved."
        : "App name saved, but some earlier content could not be renamed. Save again when connected to retry.";
      app.setNotice(text);
      setMessage(text);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className={`profile-name-form${compact ? " compact-name-form" : ""}`}
      onSubmit={submit}
    >
      <label>
        Your app name
        <input
          aria-label="Your app name"
          autoComplete="nickname"
          minLength={2}
          maxLength={40}
          required
          disabled={busy}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Choose a nickname"
        />
      </label>
      {compact ? (
        <p className="muted">
          This name appears on templates and reviews you share.
        </p>
      ) : (
        <>
          <p className="muted">
            Use a nickname, not your full name or email. It appears in
            greetings, your profile and content you choose to share. This does
            not change your Google account.
          </p>
          {!setup && (
            <p className="muted">
              Changing it also updates your authored templates, reviews and
              reports. Other people's saved copies may retain an older name.
            </p>
          )}
        </>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <button className="button" disabled={busy || !app.online}>
        {busy ? "Saving…" : setup ? "Continue with this name" : "Save app name"}
      </button>
      {!app.online && <p role="status">Reconnect to save your app name.</p>}
    </form>
  );
}

export function NameSetup() {
  const app = useApp();
  return (
    <main className="name-setup">
      <section className="panel form-section">
        <div className="brand">
          <Mountain /> WIN TODAY
        </div>
        <span className="eyebrow">YOUR JOURNEY. YOUR CHOICE.</span>
        <h1>What should we call you?</h1>
        <p>
          Choose the name you want to use here. Your Google name and photo will
          not be used as your app identity. Existing habits stay unchanged.
        </p>
        <ProfileNameForm key={app.user.uid} setup />
        <p className="name-privacy-note">
          <Shield size={16} /> Your habits stay private. Templates and reviews
          are public only when you choose to share them.
        </p>
        <button className="text-button" onClick={() => app.logout()}>
          Sign out
        </button>
      </section>
    </main>
  );
}

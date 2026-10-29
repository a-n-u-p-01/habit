import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { startupPhase } from "../src/startup.js";
const app = {
  authReady: true,
  user: { uid: "me", nameConfirmed: true },
  profileReady: true,
  profileError: "",
  online: true,
};
test("Normal auth/profile loading never becomes an account recovery form", () => {
  assert.equal(startupPhase({ ...app, authReady: false }), "loading");
  assert.equal(startupPhase({ ...app, profileReady: false }), "loading");
});
test("Offline startup and actual profile errors are separate recovery states", () => {
  assert.equal(
    startupPhase({ ...app, profileReady: false, online: false }),
    "offline",
  );
  assert.equal(
    startupPhase({ ...app, profileError: "permission denied" }),
    "error",
  );
});
test("Guest mode and already loaded offline profiles remain usable", () => {
  assert.equal(
    startupPhase({ ...app, user: null, online: false, profileReady: false }),
    "ready",
  );
  assert.equal(startupPhase({ ...app, online: false }), "ready");
});
test("Name setup only opens after the current profile is ready", () => {
  assert.equal(
    startupPhase({
      ...app,
      user: { uid: "new", nameConfirmed: false },
      profileReady: false,
    }),
    "loading",
  );
  assert.equal(
    startupPhase({ ...app, user: { uid: "new", nameConfirmed: false } }),
    "name-setup",
  );
});
test("Initial HTML paints a themed loading indicator before React starts", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /class="boot-loading"/);
  assert.match(html, /aria-label="Loading app"/);
  assert.match(html, /prefers-reduced-motion/);
  const appSource = readFileSync(
    new URL("../src/App.jsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    appSource,
    /Opening your corner|Loading your chosen app identity|Gathering your wins|Finding your path/,
  );
  assert.match(appSource, /<ContentLoading/);
});

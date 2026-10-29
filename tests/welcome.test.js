import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  WELCOME_STEPS,
  WELCOME_COMPLETE_KEY,
  WELCOME_SIGNIN_KEY,
  completeWelcome,
  initialWelcomeStep,
} from "../src/welcome.js";
import { googleSignIn, googleSignInMessage } from "../src/google-signin.js";
const storage = () => {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) || null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
};
test("Welcome has three defined steps and resumes sign-in at the final step", () => {
  assert.equal(WELCOME_STEPS.length, 3);
  const session = storage();
  assert.equal(initialWelcomeStep(session), 0);
  session.setItem(WELCOME_SIGNIN_KEY, "1");
  assert.equal(initialWelcomeStep(session), 2);
});
test("Finishing welcome marks completion and clears only the pending sign-in flag", () => {
  const persistent = storage(),
    session = storage();
  session.setItem(WELCOME_SIGNIN_KEY, "1");
  session.setItem("other", "keep");
  completeWelcome(persistent, session);
  assert.equal(persistent.getItem(WELCOME_COMPLETE_KEY), "1");
  assert.equal(session.getItem(WELCOME_SIGNIN_KEY), null);
  assert.equal(session.getItem("other"), "keep");
});
test("Normal Google sign-in uses one popup action", async () => {
  let redirected = false;
  const user = { uid: "test-user" };
  const result = await googleSignIn({
    popup: async () => ({ user }),
    redirect: async () => {
      redirected = true;
    },
  });
  assert.equal(result.status, "signed-in");
  assert.equal(result.user, user);
  assert.equal(redirected, false);
});
test("Blocked popups automatically use redirect without requiring a second UI option", async () => {
  let calls = 0;
  const result = await googleSignIn({
    popup: async () => {
      throw { code: "auth/popup-blocked" };
    },
    redirect: async () => {
      calls++;
    },
  });
  assert.equal(result.status, "redirecting");
  assert.equal(calls, 1);
});
test("Unsupported popup environments use the same redirect fallback", async () => {
  let calls = 0;
  const result = await googleSignIn({
    popup: async () => {
      throw { code: "auth/operation-not-supported-in-this-environment" };
    },
    redirect: async () => {
      calls++;
    },
  });
  assert.equal(result.status, "redirecting");
  assert.equal(calls, 1);
});
test("User cancellation never forces a redirect", async () => {
  for (const code of [
    "auth/popup-closed-by-user",
    "auth/cancelled-popup-request",
  ]) {
    let calls = 0;
    const result = await googleSignIn({
      popup: async () => {
        throw { code };
      },
      redirect: async () => {
        calls++;
      },
    });
    assert.equal(result.status, "cancelled");
    assert.equal(calls, 0);
  }
});
test("Other sign-in failures do not trigger redirects or retry loops", async () => {
  let calls = 0;
  const error = { code: "auth/network-request-failed" };
  await assert.rejects(
    googleSignIn({
      popup: async () => {
        throw error;
      },
      redirect: async () => {
        calls++;
      },
    }),
    (failure) => failure === error,
  );
  assert.equal(calls, 0);
});
test("Redirect failures propagate once and receive user-facing copy", async () => {
  let calls = 0;
  await assert.rejects(
    googleSignIn({
      popup: async () => {
        throw { code: "auth/popup-blocked" };
      },
      redirect: async () => {
        calls++;
        throw Error("redirect unavailable");
      },
    }),
    /redirect unavailable/,
  );
  assert.equal(calls, 1);
  assert.match(
    googleSignInMessage("auth/network-request-failed"),
    /connection/,
  );
  assert.doesNotMatch(
    googleSignInMessage("auth/unauthorized-domain"),
    /Firebase|project|authorized domain/,
  );
});
test("Welcome copy has one Google action and one guest action, with no duplicate skip or developer settings", () => {
  const source = readFileSync(
    new URL("../src/WelcomeOnboarding.jsx", import.meta.url),
    "utf8",
  );
  assert.equal((source.match(/Continue with Google/g) || []).length, 1);
  assert.equal((source.match(/Continue without an account/g) || []).length, 1);
  assert.doesNotMatch(
    source,
    /Skip for now|Start on this device|Use redirect sign-in|Firebase project/,
  );
  assert.match(source, /Build discipline/);
  assert.match(source, /HABIT BUILDER/);
  assert.match(source, /<GoogleIcon/);
});

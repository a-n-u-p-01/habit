import {
  exemplar,
  dateKey,
  daysBack,
  weekDates,
  progressId,
} from "../src/domain.js";
import { encodeFirestore } from "../src/serialization.js";
// Run against Vite on port 4173 and isolated demo Auth/Firestore emulators.
// Test-only request interception connects the app to emulators without changing
// the deployed Firebase configuration or using real accounts.
import { chromium, expect } from "@playwright/test";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, collection, getDocs, getDoc } from "firebase/firestore";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";

const projectId = "demo-win-today";
const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:4173";
const password = "emulator-test-only-123";
const errors = [],
  avatarRequests = [];
const env = await initializeTestEnvironment({
  projectId,
  firestore: {
    host: "127.0.0.1",
    port: 8080,
    rules: readFileSync("firestore.rules", "utf8"),
  },
});
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
async function createAccount(name) {
  const email = `${name.toLowerCase()}@example.test`;
  const response = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-test",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  assert.equal(response.ok, true);
  const account = await response.json();
  const profile = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:update?key=emulator-test",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken: account.idToken,
        displayName: name,
        photoUrl: "https://lh3.googleusercontent.com/private-test-avatar",
      }),
    },
  );
  assert.equal(profile.ok, true);
  return { uid: account.localId, email, name };
}
async function openPage(account, path) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    serviceWorkers: "block",
  });
  await context.addInitScript(() => localStorage.setItem("win-onboarded", "1"));
  let authModule, firebaseModule;
  await context.route("**/src/firebase.js*", async (route) => {
    const moduleURL = new URL(route.request().url());
    firebaseModule = moduleURL.pathname + moduleURL.search;
    const response = await route.fetch();
    let source = await response.text();
    authModule = source.match(/from "([^"]*firebase_auth[^\"]*)"/)[1];
    source = source
      .replace(
        "getAuth, GoogleAuthProvider",
        "connectAuthEmulator, getAuth, GoogleAuthProvider",
      )
      .replace(
        "initializeFirestore,",
        "connectFirestoreEmulator, initializeFirestore,",
      )
      .replace('projectId: "habit-builder-f86b4"', `projectId: "${projectId}"`);
    source +=
      '\nconnectAuthEmulator(auth, "http://127.0.0.1:9099", {disableWarnings:true});\nconnectFirestoreEmulator(db, "127.0.0.1", 8080);\n';
    await route.fulfill({ response, body: source });
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (request) => {
    if (request.url().includes("googleusercontent.com"))
      avatarRequests.push(request.url());
  });
  await page.goto(`${baseURL}${path}`);
  if (account) {
    await page.evaluate(
      async ({ email, password, authModule, firebaseModule }) => {
        const { auth } = await import(firebaseModule);
        const { signInWithEmailAndPassword } = await import(authModule);
        await signInWithEmailAndPassword(auth, email, password);
      },
      { email: account.email, password, authModule, firebaseModule },
    );
  }
  return {
    page,
    context,
    signIn: async (account) =>
      page.evaluate(
        async ({ email, password, authModule, firebaseModule }) => {
          const { auth } = await import(firebaseModule);
          const { signOut, signInWithEmailAndPassword } = await import(
            authModule
          );
          if (auth.currentUser) await signOut(auth);
          await signInWithEmailAndPassword(auth, email, password);
        },
        { email: account.email, password, authModule, firebaseModule },
      ),
    authModule: () => authModule,
    firebaseModule: () => firebaseModule,
  };
}
try {
  await env.clearFirestore();
  await fetch(
    `http://127.0.0.1:9099/emulator/v1/projects/${projectId}/accounts`,
    { method: "DELETE" },
  );
  const fresh = await createAccount("GoogleLegalName"),
    legacy = await createAccount("LegacyGoogleName"),
    moderator = await createAccount("ModeratorGoogleName");
  const publicTemplate = (authorId, authorName, name) => ({
    name,
    description: "A kind minimum",
    category: exemplar.category,
    weekdays: exemplar.weekdays,
    levels: exemplar.levels,
    authorId,
    authorName,
    published: true,
    updatedAt: 1,
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users", legacy.uid), {
      displayName: "LegacyGoogleName",
      email: legacy.email,
      photoURL: "https://lh3.googleusercontent.com/private-test-avatar",
    });
    await setDoc(doc(db, "users", moderator.uid), {
      displayName: "Moderator",
      nameConfirmed: true,
      photoURL: "",
    });
    await setDoc(doc(db, "userRoles", moderator.uid), { role: "admin" });
    await setDoc(
      doc(db, "templates/legacy-public"),
      encodeFirestore(
        publicTemplate(legacy.uid, "LegacyGoogleName", "Legacy public habit"),
      ),
    );
    await setDoc(
      doc(db, "templates/other-public"),
      encodeFirestore(
        publicTemplate(moderator.uid, "Moderator", "Other public habit"),
      ),
    );
    await setDoc(doc(db, "reviews", `other-public_${legacy.uid}`), {
      templateId: "other-public",
      authorId: legacy.uid,
      authorName: "LegacyGoogleName",
      rating: 4,
      text: "A helpful minimum.",
      recommend: true,
      updatedAt: 1,
    });
    await setDoc(doc(db, "feedback/legacy-feedback"), {
      type: "report",
      title: "Earlier feedback",
      message: "A private report.",
      authorId: legacy.uid,
      authorName: "LegacyGoogleName",
      status: "open",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await setDoc(
      doc(db, "users", fresh.uid, "tasks/private-a"),
      encodeFirestore({
        ...exemplar,
        id: "private-a",
        name: "Only account A can see this",
        createdDay: dateKey(),
        active: true,
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        scheduleHistory: [],
      }),
    );
    await setDoc(
      doc(db, "users", legacy.uid, "templates/new-private"),
      encodeFirestore({
        ...exemplar,
        id: "new-private",
        name: "Private blueprint",
        published: false,
      }),
    );
  });
  const current = await openPage(fresh, "/profile"),
    page = current.page;
  await expect(
    page.getByRole("heading", {
      name: "What should we call you?",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Your app name", exact: true }),
  ).toHaveValue("");
  mkdirSync("screenshots", { recursive: true });
  await page.screenshot({ path: "screenshots/name-setup.png", fullPage: true });
  assert.equal(
    await page
      .locator("body")
      .innerText()
      .then((s) => s.includes("GoogleLegalName")),
    false,
  );
  await page
    .getByRole("textbox", { name: "Your app name", exact: true })
    .fill("email@example.test");
  await page
    .getByRole("button", { name: "Continue with this name", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("nickname, not an email");
  await env.withSecurityRulesDisabled(async (ctx) =>
    assert.equal(
      (await getDoc(doc(ctx.firestore(), "users", fresh.uid))).exists(),
      false,
    ),
  );
  await page
    .getByRole("textbox", { name: "Your app name", exact: true })
    .fill("Quiet fern");
  await page
    .getByRole("button", { name: "Continue with this name", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".settings-account-row strong")
      .filter({ hasText: "Quiet fern" }),
  ).toBeVisible();
  await page.goto(`${baseURL}/habits`);
  await expect(
    page.getByRole("heading", {
      name: "Only account A can see this",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto(`${baseURL}/`);
  await expect(page.locator("h1")).toContainText("Quiet");
  await page.goto(`${baseURL}/profile`);
  await page
    .getByRole("textbox", { name: "Your app name", exact: true })
    .fill("Moss trail");
  await page
    .getByRole("button", { name: "Save app name", exact: true })
    .click();
  await expect(
    page
      .locator(".settings-account-row strong")
      .filter({ hasText: "Moss trail" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page
      .locator(".settings-account-row strong")
      .filter({ hasText: "Moss trail" }),
  ).toBeVisible();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const profile = (
      await getDoc(doc(ctx.firestore(), "users", fresh.uid))
    ).data();
    assert.equal(profile.displayName, "Moss trail");
    assert.equal(profile.nameConfirmed, true);
    assert.equal(
      profile.photoURL,
      "https://lh3.googleusercontent.com/private-test-avatar",
    );
    assert.equal(Object.hasOwn(profile, "email"), false);
  });
  const providerName = await page.evaluate(async (modulePath) => {
    const { auth } = await import(modulePath);
    return auth.currentUser.displayName;
  }, current.firebaseModule());
  assert.equal(
    providerName,
    "GoogleLegalName",
    "The app nickname must not change the Google/Firebase provider identity",
  );
  // Switch identities in the same page to catch stale state and profile leakage.
  await current.signIn(legacy);
  await expect(
    page.getByRole("heading", {
      name: "What should we call you?",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Your app name", exact: true }),
  ).toHaveValue("");
  let text = await page.locator("body").innerText();
  for (const secret of [
    "GoogleLegalName",
    "LegacyGoogleName",
    "Moss trail",
    "Only account A can see this",
  ])
    assert.equal(text.includes(secret), false);
  await page
    .getByRole("textbox", { name: "Your app name", exact: true })
    .fill("River stone");
  await page
    .getByRole("button", { name: "Continue with this name", exact: true })
    .click();
  await expect(
    page
      .locator(".settings-account-row strong")
      .filter({ hasText: "River stone" }),
  ).toBeVisible();
  async function names() {
    let result;
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const refs = [
        doc(db, "templates/legacy-public"),
        doc(db, "reviews", `other-public_${legacy.uid}`),
        doc(db, "feedback/legacy-feedback"),
      ];
      result = await Promise.all(
        refs.map(async (ref) => (await getDoc(ref)).data().authorName),
      );
    });
    return result;
  }
  await expect
    .poll(names)
    .toEqual(["River stone", "River stone", "River stone"]);
  await page
    .getByRole("textbox", { name: "Your app name", exact: true })
    .fill("Moon fern");
  await page
    .getByRole("button", { name: "Save app name", exact: true })
    .click();
  await expect.poll(names).toEqual(["Moon fern", "Moon fern", "Moon fern"]);
  await page.reload();
  await expect(
    page
      .locator(".settings-account-row strong")
      .filter({ hasText: "Moon fern" }),
  ).toBeVisible();
  mkdirSync("screenshots", { recursive: true });
  await page.screenshot({
    path: "screenshots/chosen-name-profile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.ok(
    await page
      .getByRole("textbox", { name: "Your app name", exact: true })
      .evaluate((node) => parseFloat(getComputedStyle(node).fontSize) >= 16),
  );
  await page.screenshot({
    path: "screenshots/chosen-name-profile-mobile.png",
    fullPage: true,
  });
  await page.goto(`${baseURL}/templates/other-public`);
  await expect(page.locator(".review-card").first()).toContainText("Moon fern");
  await page.locator(".template-review-composer summary").click();
  await page
    .getByLabel("Your experience", { exact: true })
    .fill("Helpful and achievable. Updated with my app name.");
  await page.getByRole("button", { name: "Save review", exact: true }).click();
  await page.goto(`${baseURL}/templates?tab=mine`);
  page.on("dialog", (dialog) => dialog.accept());
  const privateCard = page.locator(".template-card").filter({
    has: page.getByRole("heading", {
      name: "Private blueprint",
      exact: true,
    }),
  });
  await privateCard
    .getByRole("button", { name: "Publish", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Publish template?" })
    .getByRole("button", { name: "Publish template", exact: true })
    .click();
  await expect(
    privateCard.getByRole("button", { name: "Unpublish", exact: true }),
  ).toBeVisible();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore(),
      profile = (await getDoc(doc(db, "users", legacy.uid))).data();
    assert.equal(Object.hasOwn(profile, "email"), false);
    assert.equal(
      profile.photoURL,
      "https://lh3.googleusercontent.com/private-test-avatar",
    );
    assert.equal(
      (await getDoc(doc(db, "templates/new-private"))).data().authorName,
      "Moon fern",
    );
    assert.equal((await getDocs(collection(db, "templateUsages"))).size, 0);
  });
  await page.goto(`${baseURL}/settings`);
  await expect(
    page.getByRole("button", { name: "Export my data", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Data & privacy", exact: true }),
  ).toBeVisible();
  const databases = await page.evaluate(async () =>
    (await indexedDB.databases()).map((database) => database.name),
  );
  assert.equal(
    databases.some((name) => name.toLowerCase().includes("firestore")),
    false,
    "Cloud data must not use a persistent Firestore database",
  );
  // Old offline caches may contain unsynced data: never erase them silently.
  await page.evaluate(
    async () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open(
          "firestore/[DEFAULT]/demo-win-today/main",
          1,
        );
        request.onupgradeneeded = () =>
          request.result.createObjectStore("unsynced");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction("unsynced", "readwrite");
          tx.objectStore("unsynced").put("keep this offline work", "sentinel");
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      }),
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Remove older cloud cache", exact: true }),
  ).toBeVisible();
  page.removeAllListeners("dialog");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "Remove older cloud cache", exact: true })
    .click();
  const oldWork = await page.evaluate(
    async () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open(
          "firestore/[DEFAULT]/demo-win-today/main",
          1,
        );
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction("unsynced", "readonly"),
            get = tx.objectStore("unsynced").get("sentinel");
          get.onsuccess = () => resolve(get.result);
          tx.oncomplete = () => db.close();
        };
      }),
  );
  assert.equal(oldWork, "keep this offline work");
  await env.withSecurityRulesDisabled(async (ctx) =>
    setDoc(doc(ctx.firestore(), "users", "unchosen-user"), {
      displayName: "Old Google Name",
      photoURL: "https://lh3.googleusercontent.com/old-avatar",
    }),
  );
  const staff = await openPage(moderator, "/admin/users");
  await expect(
    staff.page.getByRole("heading", { name: "Moon fern", exact: true }),
  ).toBeVisible();
  await expect(staff.page.getByText("name not chosen yet")).toBeVisible();
  await expect(
    staff.page.locator('.admin-user img[src*="private-test-avatar"]').first(),
  ).toBeVisible();
  text = await staff.page.locator("body").innerText();
  for (const privateIdentity of [
    legacy.email,
    fresh.email,
    "LegacyGoogleName",
    "GoogleLegalName",
  ])
    assert.equal(text.includes(privateIdentity), false);
  await page.goto(`${baseURL}/profile`);
  await page
    .locator(".minimal-settings")
    .getByRole("button", { name: "Sign out", exact: true })
    .click();
  await expect(page.locator(".sync-state")).toContainText("Device only");
  text = await page.locator("body").innerText();
  assert.equal(text.includes("Moon fern"), false);
  assert.equal(text.includes("Only account A can see this"), false);
  assert.deepEqual(errors, []);
  writeFileSync(
    "screenshots/privacy-results.json",
    JSON.stringify(
      {
        passed: true,
        checks: [
          "First login asks a blank app-name prompt",
          "Invalid email rejected",
          "Profile stores only chosen app identity",
          "Chosen name survives reload and does not change Google identity",
          "Account switch does not show another account's data",
          "Legacy Google identity never displayed",
          "Existing public templates/reviews/private feedback renamed",
          "New public content uses chosen name",
          "Admin directory excludes emails and Google names",
          "Admin directory shows Google photos",
          "New cloud writes do not create a persistent Firestore database",
          "Older offline work survives startup and cancelled cache removal",
          "Mobile name editing",
          "Sign-out discards prior account UI",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: chosen names, legacy cleanup, author-name propagation, public privacy, account switching and memory-only cloud cache.",
  );
} finally {
  await browser.close();
  await env.cleanup();
}

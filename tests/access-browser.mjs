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
const errors = [];
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
      body: JSON.stringify({ idToken: account.idToken, displayName: name }),
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
  let authModule, firebaseModule, firestoreModule;
  await context.route("**/src/firebase.js*", async (route) => {
    const moduleURL = new URL(route.request().url());
    firebaseModule = moduleURL.pathname + moduleURL.search;
    const response = await route.fetch();
    let source = await response.text();
    firestoreModule = source.match(/from "([^"]*firebase_firestore[^"]*)"/)[1];
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
    syncGroup: async (group) =>
      page.evaluate(
        async ({ group, firebaseModule, firestoreModule, uid }) => {
          const { db } = await import(firebaseModule);
          const { collection, getDocsFromServer } = await import(
            firestoreModule
          );
          await getDocsFromServer(collection(db, "users", uid, group));
          await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          );
        },
        { group, firebaseModule, firestoreModule, uid: account.uid },
      ),
  };
}
try {
  await env.clearFirestore();
  await fetch(
    `http://127.0.0.1:9099/emulator/v1/projects/${projectId}/accounts`,
    { method: "DELETE" },
  );
  const member = await createAccount("Member"),
    admin = await createAccount("Admin"),
    superAdmin = await createAccount("Super");
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const account of [member, admin, superAdmin])
      await setDoc(doc(db, "users", account.uid), {
        displayName: account.name,
        photoURL: "",
        email: account.email,
      });
    await setDoc(doc(db, "userRoles", admin.uid), { role: "admin" });
    await setDoc(doc(db, "userRoles", superAdmin.uid), { role: "super_admin" });
  });
  const guest = await openPage(null, "/feedback");
  await expect(
    guest.page.getByText(
      "Sign in to report a problem or send a suggestion to the admin team.",
    ),
  ).toBeVisible();
  await guest.page.goto(`${baseURL}/admin/users`);
  await expect(
    guest.page.getByRole("heading", { name: "Sign in required" }),
  ).toBeVisible();
  await guest.context.close();

  const normal = await openPage(member, "/feedback");
  await expect(normal.page.getByLabel("Title", { exact: true })).toBeVisible();
  await normal.page
    .getByLabel("Title", { exact: true })
    .fill("Habit save problem");
  await normal.page
    .getByLabel("Details", { exact: true })
    .fill("The save button needs clearer feedback.");
  await normal.page
    .getByRole("button", { name: "Send feedback", exact: true })
    .click();
  await expect(
    normal.page.getByRole("heading", {
      name: "Habit save problem",
      exact: true,
    }),
  ).toBeVisible();
  await normal.page
    .getByLabel("Feedback type", { exact: true })
    .selectOption("suggestion");
  await normal.page
    .getByLabel("Title", { exact: true })
    .fill("Improve reminder options");
  await normal.page
    .getByLabel("Details", { exact: true })
    .fill("Please add more reminder choices.");
  await normal.page
    .getByRole("button", { name: "Send feedback", exact: true })
    .click();
  await expect(
    normal.page.getByRole("heading", {
      name: "Improve reminder options",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    normal.page.getByRole("link", { name: "Users & roles", exact: true }),
  ).toHaveCount(0);
  await normal.page.goto(`${baseURL}/admin/users`);
  await expect(
    normal.page.getByRole("heading", { name: "Access restricted" }),
  ).toBeVisible();
  await normal.page.goto(`${baseURL}/feedback`);

  const staff = await openPage(admin, "/admin/feedback");
  await expect(
    staff.page.getByRole("heading", {
      name: "Habit save problem",
      exact: true,
    }),
  ).toBeVisible();
  await staff.page
    .getByRole("combobox", { name: "Status for Habit save problem" })
    .selectOption("resolved");
  await expect(
    normal.page
      .locator(".feedback-card")
      .filter({
        has: normal.page.getByRole("heading", {
          name: "Habit save problem",
          exact: true,
        }),
      })
      .locator(".role-badge"),
  ).toHaveText("Resolved");
  await staff.page.goto(`${baseURL}/admin/users`);
  await expect(
    staff.page.getByRole("heading", { name: "Member", exact: true }),
  ).toBeVisible();
  await expect(staff.page.locator(".admin-role select")).toHaveCount(0);

  const owner = await openPage(superAdmin, "/admin/users");
  await expect(
    owner.page.getByRole("combobox", { name: "Role for Super" }),
  ).toBeDisabled();
  owner.page.on("dialog", (dialog) => dialog.accept());
  await owner.page
    .getByRole("combobox", { name: "Role for Member", exact: true })
    .selectOption("admin");
  await expect(
    owner.page.getByRole("combobox", { name: "Role for Member", exact: true }),
  ).toHaveValue("admin");
  await expect(
    normal.page.getByRole("link", { name: "Users & roles", exact: true }),
  ).toBeVisible();
  await normal.page.goto(`${baseURL}/admin/users`);
  await expect(
    normal.page.getByRole("heading", { name: "Users & roles.", exact: true }),
  ).toBeVisible();
  await owner.page
    .getByRole("combobox", { name: "Role for Member", exact: true })
    .selectOption("user");
  await expect(
    normal.page.getByRole("heading", { name: "Access restricted" }),
  ).toBeVisible();
  await expect(
    normal.page.getByRole("link", { name: "Users & roles", exact: true }),
  ).toHaveCount(0);
  await owner.page
    .getByRole("combobox", { name: "Role for Admin", exact: true })
    .selectOption("super_admin");
  await expect(
    owner.page.getByRole("combobox", { name: "Role for Admin", exact: true }),
  ).toHaveValue("super_admin");
  await owner.page
    .getByPlaceholder("Name, email or user ID")
    .fill("member@example.test");
  await expect(owner.page.locator(".admin-user")).toHaveCount(1);
  await owner.page.getByPlaceholder("Name, email or user ID").fill("");
  mkdirSync("screenshots", { recursive: true });
  await expect(owner.page.getByText("Saving…", { exact: true })).toHaveCount(0);
  await owner.page.screenshot({
    path: "screenshots/admin-users.png",
    fullPage: true,
  });

  await normal.page.goto(`${baseURL}/feedback`);
  await normal.page.setViewportSize({ width: 390, height: 844 });
  await expect(
    normal.page.getByRole("heading", {
      name: "Report or suggest.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    normal.page.getByRole("heading", {
      name: "Habit save problem",
      exact: true,
    }),
  ).toBeVisible();
  const overflow = await normal.page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  assert.equal(overflow, false, "Feedback page should not overflow on mobile");
  await normal.page.screenshot({
    path: "screenshots/feedback-mobile.png",
    fullPage: true,
  });
  await normal.page.goto(`${baseURL}/profile`);
  await expect(
    normal.page
      .locator(".profile-menu")
      .getByRole("link", { name: "Report or suggest" }),
  ).toBeVisible();
  // The same flow must save both documents for an authenticated cloud user.
  await normal.page.goto(`${baseURL}/tasks/new`);
  await normal.page
    .getByRole("link", { name: "Create manually", exact: true })
    .click();
  await normal.page
    .getByPlaceholder("e.g. Move a little")
    .fill("Cloud reading habit");
  for (const n of [1, 2, 3]) {
    await normal.page
      .getByRole("textbox", { name: `T${n} activity 1`, exact: true })
      .fill("Reading");
  }
  while (
    await normal.page
      .locator('.weekday-picker button[aria-pressed="false"]')
      .count()
  )
    await normal.page
      .locator('.weekday-picker button[aria-pressed="false"]')
      .first()
      .click();
  await normal.page
    .getByRole("checkbox", { name: "T2 and T3 are additional amounts" })
    .check();
  await normal.page
    .getByRole("button", { name: "Save habit", exact: true })
    .click();
  await expect(
    normal.page.getByRole("heading", {
      name: "Cloud reading habit",
      exact: true,
    }),
  ).toBeVisible();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const habits = await getDocs(collection(db, "users", member.uid, "tasks"));
    const templates = await getDocs(
      collection(db, "users", member.uid, "templates"),
    );
    assert.equal(habits.size, 1);
    assert.equal(templates.size, 1);
    assert.equal(habits.docs[0].id, templates.docs[0].id);
    assert.equal(templates.docs[0].data().published, false);
    assert.deepEqual(
      habits.docs[0].data().levels,
      templates.docs[0].data().levels,
    );
    assert.equal(
      Object.hasOwn(templates.docs[0].data(), "scheduleHistory"),
      false,
    );
    assert.equal(
      (await getDocs(collection(db, "templates"))).size,
      0,
      "Manual templates must not be publicly published",
    );
  });
  await normal.page.reload();
  await normal.page.goto(`${baseURL}/templates?tab=mine`);
  const privateCard = normal.page.locator(".template-card").filter({
    has: normal.page.getByRole("heading", {
      name: "Cloud reading habit",
      exact: true,
    }),
  });
  await privateCard.getByRole("link", { name: "Use", exact: true }).click();
  await expect(
    normal.page.getByRole("heading", { name: "Customize habit", exact: true }),
  ).toBeVisible();
  await normal.page
    .getByPlaceholder("e.g. Move a little")
    .fill("Cloud reading copy");
  await normal.page
    .getByRole("checkbox", { name: "T2 and T3 are additional amounts" })
    .check();
  await normal.page
    .getByRole("button", { name: "Save habit", exact: true })
    .click();
  await expect(
    normal.page.getByRole("heading", {
      name: "Cloud reading copy",
      exact: true,
    }),
  ).toBeVisible();
  await env.withSecurityRulesDisabled(async (ctx) => {
    assert.equal(
      (await getDocs(collection(ctx.firestore(), "users", member.uid, "tasks")))
        .size,
      2,
    );
    assert.equal(
      (
        await getDocs(
          collection(ctx.firestore(), "users", member.uid, "templates"),
        )
      ).size,
      1,
    );
  });
  await normal.page
    .getByRole("button", {
      name: "Complete T1 for Cloud reading habit",
      exact: true,
    })
    .click();
  const completion = normal.page.getByRole("dialog");
  await expect(
    completion.getByRole("button", { name: "Complete", exact: true }),
  ).toBeDisabled();
  await env.withSecurityRulesDisabled(async (ctx) => {
    assert.equal(
      (
        await getDocs(
          collection(ctx.firestore(), "users", member.uid, "progress"),
        )
      ).size,
      0,
      "Opening a completion modal must not create progress",
    );
  });
  await completion
    .getByRole("radio", {
      name: "I completed all the tasks above.",
      exact: true,
    })
    .check();
  await completion
    .getByRole("button", { name: "Complete", exact: true })
    .evaluate((button) => {
      button.click();
      button.click();
    });
  await expect(completion).toHaveCount(0);
  await expect(
    normal.page
      .getByRole("article", { name: "Cloud reading habit", exact: true })
      .locator(".tier"),
  ).toHaveText("T1");
  await env.withSecurityRulesDisabled(async (ctx) => {
    assert.equal(
      (await getDocs(collection(ctx.firestore(), "users", member.uid, "wins")))
        .size,
      1,
      "One confirmation can only award its reviewed tier",
    );
  });
  // Exercise both existing-session updates and new-session creation for past dates.
  const pastDay = daysBack(2)[0],
    createdDay = daysBack(8)[0];
  const historicalSnapshot = {
    name: "Original historical requirements",
    category: exemplar.category,
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    levels: exemplar.levels,
  };
  const historicalTask = {
    ...historicalSnapshot,
    name: "Cloud historical habit",
    id: "history-old",
    createdDay,
    active: true,
    scheduleHistory: [],
    levels: exemplar.levels.map((rows) =>
      rows.map((r) => ({ ...r, amount: 999 })),
    ),
  };
  const versionedTask = {
    ...historicalTask,
    name: "Cloud versioned habit",
    id: "history-versioned",
    definitionHistory: [
      { from: createdDay, snapshot: historicalSnapshot },
      {
        from: dateKey(),
        snapshot: { ...historicalSnapshot, levels: historicalTask.levels },
      },
    ],
  };
  const pastId = progressId(historicalTask.id, pastDay);
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(
      doc(db, "users", member.uid, "tasks", historicalTask.id),
      encodeFirestore(historicalTask),
    );
    await setDoc(
      doc(db, "users", member.uid, "tasks", versionedTask.id),
      encodeFirestore(versionedTask),
    );
    await setDoc(
      doc(db, "users", member.uid, "progress", pastId),
      encodeFirestore({
        id: pastId,
        taskId: historicalTask.id,
        date: pastDay,
        snapshot: historicalSnapshot,
        checks: {},
        scheduled: true,
      }),
    );
  });
  await normal.page.goto(`${baseURL}/week`);
  await normal.page
    .getByRole("heading", { name: "Your week, in small wins.", exact: true })
    .waitFor();
  await normal.syncGroup("progress");
  if (!weekDates().includes(pastDay))
    await normal.page
      .getByRole("button", { name: "Previous week", exact: true })
      .click();
  await normal.page
    .getByRole("button", {
      name: `Log completion for Cloud historical habit on ${pastDay}`,
      exact: true,
    })
    .click();
  const lateDialog = normal.page.getByRole("dialog");
  await expect(
    lateDialog.getByRole("heading", {
      name: "Original historical requirements",
      exact: true,
    }),
  ).toBeVisible();
  await lateDialog
    .getByRole("combobox", { name: "Highest tier completed", exact: true })
    .selectOption("3");
  await lateDialog
    .getByRole("checkbox", {
      name: /^I completed all the requirements shown on/,
    })
    .check();
  await lateDialog
    .getByRole("button", { name: "Save past completion", exact: true })
    .click();
  await expect(lateDialog).toHaveCount(0);
  await normal.page
    .getByRole("button", {
      name: `Log completion for Cloud versioned habit on ${pastDay}`,
      exact: true,
    })
    .click();
  await expect(
    lateDialog.getByText(/No original requirements were saved/),
  ).toHaveCount(0);
  await lateDialog
    .getByRole("checkbox", {
      name: /^I completed all the requirements shown on/,
    })
    .check();
  await lateDialog
    .getByRole("button", { name: "Save past completion", exact: true })
    .click();
  await expect(lateDialog).toHaveCount(0);
  await expect(normal.page.locator(".late-entry-label")).toHaveCount(2);
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const saved = (
      await getDoc(doc(db, "users", member.uid, "progress", pastId))
    ).data();
    assert.deepEqual(saved.snapshot, encodeFirestore(historicalSnapshot));
    assert.equal(saved.lateRequirementsSource, "saved_session");
    assert.equal(typeof saved.lateLoggedAt, "number");
    for (const level of [1, 2, 3])
      assert.equal(
        (
          await getDoc(
            doc(db, "users", member.uid, "wins", `${pastId}_T${level}`),
          )
        ).exists(),
        true,
      );
    const newSession = (
      await getDoc(
        doc(
          db,
          "users",
          member.uid,
          "progress",
          progressId(versionedTask.id, pastDay),
        ),
      )
    ).data();
    assert.deepEqual(newSession.snapshot, encodeFirestore(historicalSnapshot));
    assert.equal(newSession.lateRequirementsSource, "saved_history");
  });
  assert.deepEqual(errors, []);
  writeFileSync(
    "screenshots/access-results.json",
    JSON.stringify(
      {
        passed: true,
        checks: [
          "Guest sign-in gate",
          "Normal user report and suggestion submission",
          "Direct admin-route guard",
          "Admin reads feedback and updates status",
          "Users can track their own feedback status",
          "Admins see users but cannot change roles",
          "Super admin grants and removes roles",
          "Live promotion and demotion",
          "Self-role changes disabled",
          "User search",
          "Mobile layout",
          "Profile feedback link",
          "Cloud manual habit and private template saved together",
          "Cloud private template reuse without duplication or public publication",
          "Cloud past-day correction preserves original session",
          "Cloud past-day creation restores historical requirements",
          "Confirmed completion modal saves only its reviewed cloud tier",
          "No browser exceptions",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: admin roles, private feedback, live revocation, and mobile browser flows.",
  );
} finally {
  await browser.close();
  await env.cleanup();
}

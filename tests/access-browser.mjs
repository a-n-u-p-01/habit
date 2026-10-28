// Run against Vite on port 4173 and isolated demo Auth/Firestore emulators.
// Test-only request interception connects the app to emulators without changing
// the deployed Firebase configuration or using real accounts.
import { chromium, expect } from "@playwright/test";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
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
  let authModule;
  await context.route("**/src/firebase.js", async (route) => {
    const response = await route.fetch();
    let source = await response.text();
    authModule = source.match(/from "([^"]*firebase_auth[^\"]*)"/)[1];
    source = source
      .replace(
        "getAuth, GoogleAuthProvider",
        "connectAuthEmulator, getAuth, GoogleAuthProvider",
      )
      .replace(
        "  initializeFirestore,",
        "  connectFirestoreEmulator, initializeFirestore,",
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
      async ({ email, password, authModule }) => {
        const { auth } = await import("/src/firebase.js");
        const { signInWithEmailAndPassword } = await import(authModule);
        await signInWithEmailAndPassword(auth, email, password);
      },
      { email: account.email, password, authModule },
    );
  }
  return { page, context };
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

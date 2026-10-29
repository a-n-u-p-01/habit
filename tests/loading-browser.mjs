// Start Vite on port 4173, then run npm run test:loading.
import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  serviceWorkers: "block",
});
const page = await context.newPage();
try {
  // Verify the actual index has an initial paint even while the React entry is unavailable.
  await page.route("**/src/main.jsx*", (route) => route.abort());
  await page.goto(baseURL + "/week/review");
  await expect(page.locator(".boot-loading")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toHaveCount(0);
  await page.unroute("**/src/main.jsx*");
  // Mount the real loading components without needing a real account or Firestore.
  await page.clock.install();
  await page.goto(baseURL + "/tests/loading-fixture.html?state=startup");
  await expect(page.locator(".app-loading-state")).toBeVisible();
  await expect(page.getByRole("button")).toHaveCount(0);
  await expect(
    page.getByText(/Opening your corner|Loading your chosen app identity/),
  ).toHaveCount(0);
  await page.clock.runFor(12001);
  await expect(
    page.getByRole("button", { name: "Try again", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  assert.equal(await page.locator("body").getAttribute("data-retried"), "true");
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(baseURL + "/tests/loading-fixture.html?state=content");
    await expect(
      page.getByRole("status", { name: "Loading page" }),
    ).toBeVisible();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".loading-placeholder")
      .first()
      .evaluate((node) => getComputedStyle(node).animationName),
    "none",
  );
  await page.goto(baseURL + "/tests/loading-fixture.html?state=offline");
  await expect(
    page.getByRole("heading", { name: "You’re offline", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toHaveCount(0);
  await page.goto(baseURL + "/tests/loading-fixture.html?state=error");
  await expect(
    page.getByRole("heading", {
      name: "Couldn’t load your account",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  console.log(
    "PASS: bootstrap first paint, quiet loading, delayed retry, placeholders, reduced motion and separate recovery states.",
  );
} finally {
  await browser.close();
}

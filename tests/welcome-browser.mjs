// Start Vite on port 4173, then run npm run test:welcome. No live Google login is attempted.
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
  await page.goto(baseURL + "/welcome");
  await expect(
    page.getByRole("heading", { name: /Build discipline/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Skip for now", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByText("Example: Read daily", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Get started", exact: true }).click();
  const google = page.getByRole("button", {
    name: "Continue with Google",
    exact: true,
  });
  const guest = page.getByRole("button", {
    name: "Continue without an account",
    exact: true,
  });
  await expect(google).toBeVisible();
  await expect(google.locator("svg path")).toHaveCount(4);
  await expect(guest).toBeVisible();
  await expect(
    page.getByText(/Use redirect sign-in|Firebase project/),
  ).toHaveCount(0);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("win-onboarded")),
    null,
  );
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
  }
  await context.setOffline(true);
  await expect(google).toBeDisabled();
  await expect(guest).toBeEnabled();
  await guest.click();
  await expect(page).toHaveURL(baseURL + "/");
  assert.equal(
    await page.evaluate(() => localStorage.getItem("win-onboarded")),
    "1",
  );
  await context.setOffline(false);
  await page.reload();
  await expect(page).toHaveURL(baseURL + "/");
  await expect(page.locator(".welcome-screen")).toHaveCount(0);
  console.log(
    "PASS: concise three-step welcome, one branded Google action, one guest action, offline guest flow and completion persistence.",
  );
} finally {
  await browser.close();
}

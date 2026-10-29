// Start Vite on port 4173, then run npm run test:reflection.
import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { weekDates } from "../src/domain.js";
const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  serviceWorkers: "block",
});
await context.addInitScript(
  ({ id }) => {
    localStorage.setItem("win-onboarded", "1");
    if (!localStorage.getItem("reflection-read-test")) {
      localStorage.setItem(
        "win-guest-v1",
        JSON.stringify({
          tasks: [],
          progress: [],
          wins: [],
          templates: [],
          savedTemplates: [],
          weeklyReviews: [
            {
              id,
              weekStart: id,
              worked: "Steady morning routine",
              hard: "Late evenings",
              next: "Read one page after breakfast",
            },
          ],
        }),
      );
      localStorage.setItem("reflection-read-test", "1");
    }
  },
  { id: weekDates()[0] },
);
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto(baseURL + "/week/review");
  const saved = page.getByRole("region", { name: "Saved weekly reflection" });
  await expect(saved).toBeVisible();
  await expect(saved.locator("textarea")).toHaveCount(0);
  await expect(saved.locator(".worked p")).toHaveText("Steady morning routine");
  await page
    .getByRole("button", { name: "Edit reflection", exact: true })
    .click();
  await page.getByLabel("What worked?").fill("Unwanted draft");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(saved.locator(".worked p")).toHaveText("Steady morning routine");
  await page
    .getByRole("button", { name: "Edit reflection", exact: true })
    .click();
  await page.getByLabel("What worked?").fill("Updated saved routine");
  await page
    .getByRole("button", { name: "Save my reflection", exact: true })
    .click();
  await expect(saved).toBeVisible();
  await expect(saved.locator(".worked p")).toHaveText("Updated saved routine");
  await expect(page.locator("textarea")).toHaveCount(0);
  await page.reload();
  await expect(saved.locator(".worked p")).toHaveText("Updated saved routine");
  await page
    .getByRole("button", { name: "Previous review week", exact: true })
    .click();
  await expect(page.getByLabel("What worked?")).toHaveValue("");
  await page
    .getByRole("button", { name: "Next review week", exact: true })
    .click();
  await expect(saved).toBeVisible();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: saved summaries, explicit editing, cancel without overwrite, save/reload and week navigation.",
  );
} finally {
  await browser.close();
}

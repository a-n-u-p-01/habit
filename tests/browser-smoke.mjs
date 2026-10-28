import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  serviceWorkers: "block",
});
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:4173");
await page.getByRole("heading", { name: "Keep the promise." }).waitFor();
await page.getByRole("button", { name: "Let's begin" }).click();
await page.getByRole("heading", { name: "Three levels." }).waitFor();
await page.getByRole("button", { name: "Next", exact: true }).click();
await page.getByRole("button", { name: "T2", exact: true }).click();
await page.getByText("These are additional sets, not totals.").waitFor();
await page.getByRole("button", { name: "Next", exact: true }).click();
await page.getByRole("button", { name: "Start on this device" }).click();
await expect(page.locator(".today-summary")).toContainText(
  "No habits scheduled",
);
await expect(
  page.getByRole("progressbar", { name: "Today's minimums completed" }),
).toHaveAttribute("value", "0");
await expect(
  page.locator(".today-hero,.reminder-card,.review-link"),
).toHaveCount(0);
await expect(
  page
    .getByRole("navigation", { name: "Habit shortcuts" })
    .getByRole("link", { name: "This week", exact: true }),
).toHaveAttribute("href", "/week");
await expect(
  page
    .getByRole("navigation", { name: "Habit shortcuts" })
    .getByRole("link", { name: "New habit", exact: true }),
).toHaveAttribute("href", "/tasks/new");
await expect(
  page
    .getByRole("navigation", { name: "Habit shortcuts" })
    .getByRole("link", { name: "Templates", exact: true }),
).toHaveAttribute("href", "/templates");
await page.getByRole("link", { name: "Create your first habit" }).click();
await page.getByRole("link", { name: "Create manually", exact: true }).click();
await page.getByPlaceholder("e.g. Move a little").fill("Morning movement");
for (let i = 1; i <= 3; i++) {
  await page
    .getByRole("textbox", { name: `T${i} activity 1`, exact: true })
    .fill("Push-ups");
  await page
    .getByRole("spinbutton", { name: `T${i} amount 1`, exact: true })
    .fill(String(i === 1 ? 10 : 5));
}
// Select all weekdays so smoke test is independent of execution day.
while (
  await page.locator('.weekday-picker button[aria-pressed="false"]').count()
)
  await page
    .locator('.weekday-picker button[aria-pressed="false"]')
    .first()
    .click();
await page
  .getByRole("checkbox", { name: "T2 and T3 are additional amounts" })
  .check();
await page.getByRole("button", { name: "Save habit", exact: true }).click();
await page.getByRole("heading", { name: "Morning movement" }).waitFor();
const card = page.getByRole("article", {
  name: "Morning movement",
  exact: true,
});
const homeUrl = page.url();
await card
  .getByRole("button", {
    name: "Mark minimum done for Morning movement",
    exact: true,
  })
  .click();
await expect(card.locator(".inline-level-status")).toContainText(
  "Minimum done",
);
await expect(card.locator(".tier")).toHaveText("T1");
await expect(card.locator(".today-task-next")).toBeHidden();
await expect(
  page.getByRole("progressbar", { name: "Today's minimums completed" }),
).toHaveAttribute("value", "1");
assert.equal(page.url(), homeUrl);
const extra = () =>
  card.getByRole("button", {
    name: "Optional extra for Morning movement",
    exact: true,
  });
await extra().click();
await expect(card.locator(".inline-next-copy")).toContainText("Next: T2");
await expect(card.locator(".inline-next-copy")).toContainText("+ 5");
await expect(card.locator(".optional-label")).toHaveText("Optional");
await page.reload();
await expect(card.locator(".inline-level-status")).toContainText(
  "Minimum done",
);
await expect(card.locator(".today-task-next")).toBeHidden();
await extra().focus();
await page.keyboard.press("Enter");
await expect(card.locator(".today-task-next")).toBeVisible();
await card
  .getByRole("button", {
    name: "Hide optional extra for Morning movement",
    exact: true,
  })
  .press("Space");
await expect(card.locator(".today-task-next")).toBeHidden();
await extra().click();
await card
  .getByRole("button", {
    name: "Achieve T2 badge for Morning movement",
    exact: true,
  })
  .dblclick();
await expect(card.locator(".tier")).toHaveText("T2");
await expect(card.locator(".today-task-next")).toBeHidden();
await extra().click();
await expect(card.locator(".inline-next-copy")).toContainText("Next: T3");
assert.equal(page.url(), homeUrl);
await card
  .getByRole("button", {
    name: "Achieve T3 badge for Morning movement",
    exact: true,
  })
  .click();
await expect(card.locator(".tier")).toHaveText("T3");
await expect(card.getByRole("button")).toHaveCount(0);
await expect(card.locator(".inline-full-win")).toContainText(
  "Nothing more to do today",
);
assert.equal(page.url(), homeUrl);
await page.reload();
await expect(card.locator(".inline-level-status")).toContainText(
  "Minimum done",
);
await expect(card.locator(".tier")).toHaveText("T3");
// Backward-compatible deep link still offers the cumulative summary.
const taskId = await page.evaluate(
  () => JSON.parse(localStorage.getItem("win-guest-v1")).tasks[0].id,
);
await page.goto(`http://127.0.0.1:4173/task/${taskId}`);
await page.getByText("20 reps", { exact: true }).waitFor();
await page.reload();
await page.getByText("20 reps", { exact: true }).waitFor();
await page.getByRole("link", { name: "Done for today", exact: true }).click();
await page
  .getByRole("heading", { name: "You kept your promises today." })
  .waitFor();
await expect(
  page.getByRole("button", { name: "Timeline", exact: true }),
).toHaveCount(0);
await expect(
  page.getByRole("button", { name: "Habits", exact: true }),
).toHaveCount(0);
mkdirSync("screenshots", { recursive: true });
await page.screenshot({
  path: "screenshots/desktop-today.png",
  fullPage: true,
});
await page.goto("http://127.0.0.1:4173/week");
await page
  .getByRole("heading", { name: "Your week, in small wins." })
  .waitFor();
await page.goto("http://127.0.0.1:4173/analytics");
await page
  .getByRole("heading", { name: "Look how far you've come." })
  .waitFor();
await page.goto("http://127.0.0.1:4173/templates");
await page.getByRole("heading", { name: "A little reading" }).waitFor();
await page
  .locator(".template-card")
  .filter({ has: page.getByRole("heading", { name: "A little reading" }) })
  .getByRole("link", { name: "Use", exact: true })
  .click();
await page.getByRole("heading", { name: "Customize habit" }).waitFor();
assert.equal(
  await page.getByPlaceholder("e.g. Move a little").inputValue(),
  "A little reading",
);
await page.goto("http://127.0.0.1:4173/review");
await page.getByLabel("What worked?").fill("An achievable minimum helped.");
await page.getByRole("button", { name: "Save my reflection" }).click();
await page.reload();
await expect(page.getByLabel("What worked?")).toHaveValue(
  "An achievable minimum helped.",
);
await page.goto("http://127.0.0.1:4173/settings");
await page.getByRole("button", { name: "light", exact: true }).click();
assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
await page.reload();
assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
await page.getByRole("button", { name: "dark", exact: true }).click();
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://127.0.0.1:4173");
await page.getByRole("heading", { name: "Morning movement" }).waitFor();
await page.screenshot({ path: "screenshots/mobile-today.png", fullPage: true });
for (const route of [
  "/",
  "/week",
  "/analytics",
  "/profile",
  "/settings",
  "/tasks/new",
  "/review",
  "/templates",
]) {
  await page.goto(`http://127.0.0.1:4173${route}`);
  await page.locator("h1").waitFor();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  assert.equal(overflow, false, `Mobile page overflow: ${route}`);
}
assert.deepEqual(errors, []);
writeFileSync(
  "screenshots/browser-results.json",
  JSON.stringify(
    {
      passed: true,
      checks: [
        "onboarding",
        "task-create",
        "today-has-no-timeline-or-view-switch",
        "inline-T1-win-no-navigation",
        "inline-T2-double-click-safety",
        "inline-T3-with-no-extra-action",
        "incremental-total",
        "refresh-persistence",
        "day-won",
        "optional-extras-collapsed-after-completion-and-refresh",
        "daily-progress-bar-updates",
        "today-empty-state-and-shortcuts",
        "optional-extra-keyboard-controls",
        "weekly-grid",
        "analytics",
        "template-customization",
        "weekly-review-persistence",
        "theme-persistence",
        "mobile-layout-eight-routes",
      ],
      uncaughtErrors: errors,
    },
    null,
    2,
  ),
);
console.log(
  "PASS: end-to-end guest flow, persistence, tier totals, review, theme and responsive routes.",
);
await browser.close();

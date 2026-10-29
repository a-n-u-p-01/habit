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
).toHaveAttribute("href", "/habits/new");
await expect(
  page
    .getByRole("navigation", { name: "Habit shortcuts" })
    .getByRole("link", { name: "Templates", exact: true }),
).toHaveAttribute("href", "/templates");
await page.getByRole("link", { name: "Create your first habit" }).click();
await page.getByRole("link", { name: "Create manually", exact: true }).click();
await page.getByPlaceholder("e.g. Read daily").fill("Morning movement");
for (let i = 1; i <= 3; i++) {
  await page
    .getByRole("textbox", { name: `T${i} task 1`, exact: true })
    .fill(
      ["Do 10 push-ups", "Do 5 more push-ups", "Do 5 final push-ups"][i - 1],
    );
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
  .getByRole("checkbox", {
    name: "T1 is manageable. T2 and T3 add extra tasks.",
  })
  .check();
await page.getByRole("button", { name: "Save habit", exact: true }).click();
await page.getByRole("heading", { name: "Morning movement" }).waitFor();
const card = page.getByRole("article", {
  name: "Morning movement",
  exact: true,
});
const homeUrl = page.url();
const modal = page.getByRole("dialog");
const openTier = (tier) =>
  card
    .getByRole("button", {
      name: `Complete T${tier} for Morning movement`,
      exact: true,
    })
    .click();
const confirm = async () => {
  await modal
    .getByRole("radio", {
      name: "I completed all the tasks above.",
      exact: true,
    })
    .check();
  await modal.getByRole("button", { name: "Complete", exact: true }).click();
  await expect(modal).toHaveCount(0);
};
await openTier(1);
await expect(modal.locator(".completion-task-list")).toContainText(
  "Do 10 push-ups",
);
await expect(
  modal.getByRole("button", { name: "Complete", exact: true }),
).toBeDisabled();
await confirm();
await expect(card.locator(".inline-level-status")).toContainText(
  "Minimum done",
);
await expect(card.locator(".tier")).toHaveText("T1");
await expect(card.locator(".habit-card-optional")).toHaveText("Optional");
await expect(
  page.getByRole("progressbar", { name: "Today's minimums completed" }),
).toHaveAttribute("value", "1");
assert.equal(page.url(), homeUrl);
await card
  .getByRole("button", {
    name: "Complete T2 for Morning movement",
    exact: true,
  })
  .focus();
await page.keyboard.press("Enter");
await expect(modal.locator(".completion-task-list")).toContainText(
  "Do 5 more push-ups",
);
await page.keyboard.press("Escape");
await expect(modal).toHaveCount(0);
await expect(
  card.getByRole("button", {
    name: "Complete T2 for Morning movement",
    exact: true,
  }),
).toBeFocused();
await page.reload();
await expect(card.locator(".tier")).toHaveText("T1");
await openTier(2);
await expect(modal.getByRole("radio")).not.toBeChecked();
await modal.getByRole("radio").check();
await modal
  .getByRole("button", { name: "Complete", exact: true })
  .evaluate((button) => {
    button.click();
    button.click();
  });
await expect(modal).toHaveCount(0);
await expect(card.locator(".tier")).toHaveText("T2");
assert.equal(page.url(), homeUrl);
await openTier(3);
await expect(modal.getByRole("radio")).not.toBeChecked();
await confirm();
await expect(card.locator(".tier")).toHaveText("T3");
await expect(card.getByRole("button")).toHaveCount(0);
await expect(card.locator(".inline-full-win")).toContainText("All done");
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
await page.goto(`http://127.0.0.1:4173/habits/${taskId}`);
await page.getByText("Do 10 push-ups", { exact: true }).first().waitFor();
await page.reload();
await page.getByText("Do 10 push-ups", { exact: true }).first().waitFor();
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
await page.getByRole("heading", { name: "This week" }).waitFor();
await page.goto("http://127.0.0.1:4173/analytics");
await page.getByRole("heading", { name: "My progress" }).waitFor();
await page.goto("http://127.0.0.1:4173/templates");
await page.getByRole("heading", { name: "A little reading" }).waitFor();
await page
  .locator(".template-card")
  .filter({ has: page.getByRole("heading", { name: "A little reading" }) })
  .getByRole("link", { name: "Use", exact: true })
  .click();
await page.getByRole("heading", { name: "Customize habit" }).waitFor();
assert.equal(
  await page.getByPlaceholder("e.g. Read daily").inputValue(),
  "A little reading",
);
await page.goto("http://127.0.0.1:4173/week/review");
await page.getByLabel("What worked?").fill("An achievable minimum helped.");
await page.getByRole("button", { name: "Save my reflection" }).click();
await page.reload();
await expect(
  page.getByRole("region", { name: "Saved weekly reflection" }),
).toBeVisible();
await page
  .getByRole("button", { name: "Edit reflection", exact: true })
  .click();
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
  "/habits/new",
  "/week/review",
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
        "modal-T1-confirmation-no-navigation",
        "modal-T2-double-click-safety",
        "modal-T3-all-done",
        "incremental-total",
        "refresh-persistence",
        "day-won",
        "compact-optional-tier-action",
        "daily-progress-bar-updates",
        "today-empty-state-and-shortcuts",
        "modal-keyboard-controls-and-focus-return",
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

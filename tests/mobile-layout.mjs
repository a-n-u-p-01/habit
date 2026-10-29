import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { starterTemplates, dateKey, progressId } from "../src/domain.js";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  serviceWorkers: "block",
});
const today = dateKey();
const tasks = starterTemplates.map((t, i) => ({
  ...t,
  id: `phone-task-${i}`,
  name: ["Morning movement", "Read a few pages", "A mindful minute"][i],
  createdDay: today,
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  scheduleHistory: [],
  active: true,
}));
const first = tasks[0];
const row = {
  id: progressId(first.id, today),
  taskId: first.id,
  date: today,
  scheduled: true,
  snapshot: {
    name: first.name,
    category: first.category,
    weekdays: first.weekdays,
    levels: first.levels,
  },
  checks: Object.fromEntries(first.levels[0].map((r) => [r.id, true])),
  createdAt: Date.now(),
};
await context.addInitScript(
  ({ tasks, row }) => {
    if (!localStorage.getItem("phone-test-seeded")) {
      localStorage.setItem("win-onboarded", "1");
      localStorage.setItem("win-theme", "dark");
      localStorage.setItem(
        "win-guest-v1",
        JSON.stringify({
          tasks,
          progress: [row],
          wins: [],
          templates: [],
          savedTemplates: [],
          weeklyReviews: [],
        }),
      );
      localStorage.setItem("phone-test-seeded", "1");
    }
  },
  { tasks, row },
);
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const routes = [
  "/",
  "/week",
  "/analytics",
  "/tasks/new",
  "/tasks/new/manual",
  "/task/phone-task-1",
  "/templates",
  "/templates/starter-reading",
  "/profile",
  "/habits",
  "/review",
  "/settings",
  "/help",
  "/welcome",
];
const sizes = [320, 360, 390, 430, 760];
let count = 0;
mkdirSync("screenshots", { recursive: true });
for (const theme of ["dark", "light"]) {
  await page.goto("http://127.0.0.1:4173/settings");
  await page.getByRole("button", { name: theme, exact: true }).click();
  for (const width of sizes) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of routes) {
      await page.goto(`http://127.0.0.1:4173${route}`);
      await page.locator("h1:visible,h2:visible").first().waitFor();
      if (route === "/") {
        await expect(page.locator(".today-summary")).toContainText("1/3");
        await expect(
          page.locator(".today-hero,.reminder-card,.review-link"),
        ).toHaveCount(0);
        await expect(page.locator(".today-task-next")).toHaveCount(0);
        await expect(
          page.getByRole("button", {
            name: "Complete T2 for Morning movement",
            exact: true,
          }),
        ).toHaveAttribute("aria-haspopup", "dialog");
        assert.deepEqual(
          await page.locator(".today-task-card h3").allTextContents(),
          tasks.map((t) => t.name),
        );
        const controls = await page
          .locator(".today-shortcuts a,.habit-card-action .button")
          .evaluateAll((nodes) =>
            nodes.map((node) => node.getBoundingClientRect().height),
          );
        assert.ok(
          controls.every((height) => height >= 44),
          "Today shortcuts and completion controls need 44px touch targets",
        );
      }
      const metrics = await page.evaluate(() => {
        const visible = (e) =>
          e.getClientRects().length > 0 &&
          getComputedStyle(e).visibility !== "hidden";
        const inputs = [
          ...document.querySelectorAll(
            "input:not([type=checkbox]),textarea,select",
          ),
        ].filter(visible);
        const controls = [
          ...document.querySelectorAll(
            ".main-content .button,.main-content .icon-button,.bottom-nav a,.weekday-picker button",
          ),
        ].filter(visible);
        const prose = [
          ...document.querySelectorAll(
            ".task-copy p,.hero-content>p,.form-section label,.template-card p,.gentle-tip p,.help-content p",
          ),
        ].filter(visible);
        return {
          width: innerWidth,
          scroll: document.documentElement.scrollWidth,
          inputFonts: inputs.map((e) =>
            parseFloat(getComputedStyle(e).fontSize),
          ),
          smallControls: controls
            .filter((e) => e.getBoundingClientRect().height < 43.5)
            .map((e) => ({
              text: e.textContent.trim(),
              height: e.getBoundingClientRect().height,
            })),
          proseFonts: prose.map((e) =>
            parseFloat(getComputedStyle(e).fontSize),
          ),
        };
      });
      assert.ok(
        metrics.scroll <= width,
        `${theme} ${width}px ${route} horizontal overflow: ${JSON.stringify(metrics)}`,
      );
      assert.ok(
        metrics.inputFonts.every((f) => f >= 16),
        `${width}px ${route} input text below 16px`,
      );
      assert.deepEqual(
        metrics.smallControls,
        [],
        `${width}px ${route} touch targets under 44px`,
      );
      assert.ok(
        metrics.proseFonts.every((f) => f >= 14),
        `${width}px ${route} reading text below 14px`,
      );
      count++;
      if (
        width === 390 &&
        theme === "dark" &&
        [
          "/",
          "/tasks/new",
          "/tasks/new/manual",
          "/task/phone-task-1",
          "/templates",
        ].includes(route)
      )
        await page.screenshot({
          path: `screenshots/mobile-${route === "/" ? "today" : route === "/tasks/new" ? "habit-choice" : route === "/tasks/new/manual" ? "editor" : route === "/templates" ? "templates" : "task"}-improved.png`,
          fullPage: true,
        });
    }
  }
}
// Close-up previews use test-only starter fixtures, never real account data.
await page.goto("http://127.0.0.1:4173/settings");
await page.getByRole("button", { name: "dark", exact: true }).click();
for (const [width, name] of [
  [390, "mobile"],
  [1280, "desktop"],
]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto("http://127.0.0.1:4173");
  await page.locator(".today-task-card").first().waitFor();
  await page
    .locator(".task-list")
    .screenshot({ path: `screenshots/inline-today-${name}.png` });
}
// 200% font scaling should reflow without clipping or disabling browser zoom.
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://127.0.0.1:4173/tasks/new/manual");
await page.addStyleTag({
  content: "input,textarea,select{font-size:32px!important}",
});
assert.ok(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
);
assert.deepEqual(errors, []);
writeFileSync(
  "screenshots/mobile-layout-results.json",
  JSON.stringify(
    {
      passed: true,
      routeThemeSizeChecks: count,
      widths: sizes,
      themes: ["dark", "light"],
      minimumInputFont: 16,
      minimumTouchTarget: 44,
      uncaughtErrors: errors,
    },
    null,
    2,
  ),
);
console.log(
  `PASS: ${count} mobile route/theme/size checks; readable inputs, touch targets, no page overflow.`,
);
await browser.close();

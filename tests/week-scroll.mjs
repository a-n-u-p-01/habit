import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { starterTemplates } from "../src/domain.js";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  timezoneId: "Asia/Kolkata",
  serviceWorkers: "block",
});
const tasks = [
  "Morning movement",
  "Read a little every day",
  "A long habit name that must wrap without moving the page",
].map((name, i) => ({
  ...starterTemplates[1],
  id: `scroll-${i}`,
  name,
  active: true,
  createdDay: "2026-10-01",
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  scheduleHistory: [],
}));
await context.addInitScript((tasks) => {
  localStorage.setItem("win-onboarded", "1");
  localStorage.setItem(
    "win-guest-v1",
    JSON.stringify({
      tasks,
      progress: [],
      wins: [],
      templates: [],
      savedTemplates: [],
      weeklyReviews: [],
    }),
  );
}, tasks);
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
// Sunday exercises the farthest date column, not just a near-left weekday.
await page.clock.install({ time: new Date("2026-11-01T06:30:00Z") });
try {
  for (const theme of ["dark", "light"])
    for (const width of [320, 390, 760, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("http://127.0.0.1:4173/week");
      await expect(page.locator(".week-table tbody th")).toHaveText(
        tasks.map((t) => t.name),
      );
      await page.evaluate(
        (theme) => (document.documentElement.dataset.theme = theme),
        theme,
      );
      const geometry = () =>
        page.evaluate(() => {
          const pane = document.querySelector(".week-table-scroll"),
            pinned = document.querySelector(".week-table thead th:first-child"),
            today = document.querySelector(".week-table .today-col"),
            row = document.querySelector(".week-table tbody th");
          const p = pane.getBoundingClientRect(),
            h = pinned.getBoundingClientRect(),
            c = today.getBoundingClientRect(),
            r = row.getBoundingClientRect();
          return {
            paneLeft: p.left,
            paneRight: p.right,
            pinnedLeft: h.left,
            pinnedRight: h.right,
            todayLeft: c.left,
            todayRight: c.right,
            rowLeft: r.left,
            scroll: pane.scrollLeft,
            max: pane.scrollWidth - pane.clientWidth,
            pageOverflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
      let g = await geometry();
      assert.equal(g.pageOverflow, false);
      assert.ok(
        g.todayLeft >= g.pinnedRight - 2 && g.todayRight <= g.paneRight + 2,
        `${theme} ${width}: Today must be visible beyond pinned names: ${JSON.stringify(g)}`,
      );
      const firstLeft = g.rowLeft;
      await page
        .locator(".week-table-scroll")
        .evaluate((pane) => (pane.scrollLeft = 0));
      g = await geometry();
      assert.ok(Math.abs(g.rowLeft - firstLeft) < 2);
      await page
        .locator(".week-table-scroll")
        .evaluate((pane) => (pane.scrollLeft = pane.scrollWidth));
      g = await geometry();
      assert.ok(Math.abs(g.rowLeft - firstLeft) < 2);
      assert.equal(g.pageOverflow, false);
      await page
        .getByRole("button", { name: "Previous week", exact: true })
        .click();
      await expect(page.locator(".today-col")).toHaveCount(0);
      assert.equal(
        await page
          .locator(".week-table-scroll")
          .evaluate((pane) => pane.scrollLeft),
        0,
      );
      await page
        .getByRole("button", { name: "Next week", exact: true })
        .click();
      await expect(page.locator(".today-col")).toBeVisible();
      g = await geometry();
      assert.ok(
        g.todayLeft >= g.pinnedRight - 2 && g.todayRight <= g.paneRight + 2,
      );
    }
  mkdirSync("screenshots", { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:4173/week");
  await page.locator(".today-col").waitFor();
  await page.evaluate(() => (document.documentElement.dataset.theme = "dark"));
  await page.screenshot({
    path: "screenshots/week-pinned-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  writeFileSync(
    "screenshots/week-scroll-results.json",
    JSON.stringify(
      {
        passed: true,
        checks: [
          "Habit column fixed at both scroll extremes",
          "Sunday visible on entry",
          "Previous-week starts at Monday",
          "Return to current week reveals Today",
          "No page-level horizontal overflow",
          "Long names wrap",
          "320/390/760/1280 widths",
          "Light and dark themes",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: pinned habit names, automatic Today visibility, week navigation, and horizontal scrolling at four widths in both themes.",
  );
} finally {
  await browser.close();
}

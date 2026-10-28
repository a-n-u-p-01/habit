import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { starterTemplates, dateKey, progressId } from "../src/domain.js";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const errors = [];
const day = dateKey();
const names = ["Already done", "Read a page", "Move a little"];
const tasks = names.map((name, index) => ({
  ...starterTemplates[1],
  name,
  id: `daily-${index}`,
  active: true,
  orderIndex: index,
  createdDay: day,
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  scheduleHistory: [],
}));
const row = {
  id: progressId(tasks[0].id, day),
  taskId: tasks[0].id,
  date: day,
  scheduled: true,
  snapshot: {
    name: tasks[0].name,
    category: tasks[0].category,
    weekdays: tasks[0].weekdays,
    levels: tasks[0].levels,
  },
  checks: Object.fromEntries(tasks[0].levels[0].map((r) => [r.id, true])),
};
async function fixture(tasks, progress = []) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    serviceWorkers: "block",
  });
  await context.addInitScript(
    ({ tasks, progress }) => {
      localStorage.setItem("win-onboarded", "1");
      localStorage.setItem("win-theme", "dark");
      if (!localStorage.getItem("daily-test-seeded")) {
        localStorage.setItem(
          "win-guest-v1",
          JSON.stringify({
            tasks,
            progress,
            wins: [],
            templates: [],
            savedTemplates: [],
            weeklyReviews: [],
          }),
        );
        localStorage.setItem("daily-test-seeded", "1");
      }
    },
    { tasks, progress },
  );
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4173/");
  await page.locator(".today-summary").waitFor();
  return { context, page };
}
const stored = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("win-guest-v1")));
try {
  const { context, page } = await fixture(tasks, [row]);
  await expect(page.locator(".today-task-card h3")).toHaveText(names);
  await expect(page.locator(".suggested-habit h3")).toHaveText("Read a page");
  await expect(page.locator(".today-summary")).toContainText(
    "1 minimum done. Keep going at your own pace.",
  );
  await expect(page.locator(".minimum-completion-hint").first()).toContainText(
    "Do these first",
  );
  assert.equal(
    (await stored(page)).progress.length,
    1,
    "Opening Today must not award progress",
  );
  const before = JSON.stringify((await stored(page)).progress);
  await page
    .getByRole("button", {
      name: "Optional extra for Already done",
      exact: true,
    })
    .click();
  assert.equal(
    JSON.stringify((await stored(page)).progress),
    before,
    "Opening optional extras must not earn progress",
  );
  await page
    .getByRole("button", {
      name: "Hide optional extra for Already done",
      exact: true,
    })
    .click();
  mkdirSync("screenshots", { recursive: true });
  await page.screenshot({
    path: "screenshots/daily-loop-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "screenshots/daily-loop-mobile.png",
    fullPage: true,
  });
  for (const width of [320, 390, 760]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.ok(
      await page
        .getByRole("button", {
          name: "Mark minimum done for Read a page",
          exact: true,
        })
        .evaluate((node) => node.getBoundingClientRect().height >= 44),
    );
  }
  await page
    .getByRole("button", {
      name: "Mark minimum done for Read a page",
      exact: true,
    })
    .click();
  await expect(page.locator(".suggested-habit h3")).toHaveText("Move a little");
  await expect(page.locator(".today-summary")).toContainText(
    "2 minimums done. Keep going at your own pace.",
  );
  await expect(page.locator(".today-task-card h3")).toHaveText(names);
  await page
    .getByRole("button", {
      name: "Mark minimum done for Move a little",
      exact: true,
    })
    .click();
  await expect(page.locator(".suggested-habit")).toHaveCount(0);
  await expect(page.locator(".day-won")).toBeVisible();
  await expect(page.locator(".today-summary")).toContainText(
    "You can stop here. Anything extra is optional.",
  );
  await expect(page.locator(".today-task-card .tier")).toHaveText([
    "T1",
    "T1",
    "T1",
  ]);
  await expect(page.locator(".today-task-next:visible")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".suggested-habit")).toHaveCount(0);
  await expect(page.locator(".today-task-card h3")).toHaveText(names);
  await expect(
    page.getByRole("progressbar", { name: "Today's minimums completed" }),
  ).toHaveAttribute("value", "3");
  await context.close();

  const tomorrow = (new Date().getDay() + 1) % 7;
  const rest = await fixture(
    tasks.map((t) => ({ ...t, weekdays: [tomorrow] })),
  );
  await expect(rest.page.locator(".today-summary")).toContainText("Rest day");
  await expect(rest.page.locator(".today-summary")).toContainText(
    "Rest is part of consistency.",
  );
  await expect(
    rest.page.locator(".day-won,.suggested-habit,.today-task-card"),
  ).toHaveCount(0);
  await expect(
    rest.page.getByRole("progressbar", { name: "Today's minimums completed" }),
  ).toHaveAttribute("value", "0");
  assert.equal((await stored(rest.page)).wins.length, 0);
  await rest.context.close();

  const empty = await fixture([]);
  await expect(empty.page.locator(".today-summary")).toContainText(
    "No habits scheduled",
  );
  await expect(
    empty.page.getByRole("link", {
      name: "Create your first habit",
      exact: true,
    }),
  ).toBeVisible();
  await expect(empty.page.locator(".day-won,.suggested-habit")).toHaveCount(0);
  await empty.context.close();
  assert.deepEqual(errors, []);
  writeFileSync(
    "screenshots/daily-loop-results.json",
    JSON.stringify(
      {
        passed: true,
        checks: [
          "First unfinished habit highlighted in preserved order",
          "Opening page and extras never awards progress",
          "Real completion advances highlight",
          "Partial progress encouragement",
          "All T1 minimums win day without optional tiers",
          "Completion and order persist",
          "Rest day is not a win or failure",
          "New user empty state",
          "Mobile reflow and tap targets",
        ],
        uncaughtErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: next-habit guidance, honest completion, partial progress, day wins, rest days, and empty state.",
  );
} finally {
  await browser.close();
}

import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  starterTemplates,
  dateKey,
  daysBack,
  weekDates,
  parseDate,
  progressId,
  achieved,
} from "../src/domain.js";
const today = dateKey(),
  yesterday = daysBack(2)[0],
  createdDay = daysBack(11)[0];
const names = [
  "Changed reading",
  "Legacy breathing",
  "Created today",
  "Not scheduled yesterday",
];
const tasks = names.map((name, i) => ({
  ...starterTemplates[1],
  name,
  id: `past-${i}`,
  createdDay: i === 2 ? today : createdDay,
  active: true,
  weekdays: i === 3 ? [parseDate(today).getDay()] : [0, 1, 2, 3, 4, 5, 6],
  scheduleHistory: [],
  orderIndex: i,
}));
const original = { ...starterTemplates[1], name: "Original reading" };
const snapshot = {
  name: original.name,
  category: original.category,
  weekdays: original.weekdays,
  levels: original.levels,
};
tasks[0].levels = tasks[0].levels.map((rows) =>
  rows.map((r) => ({ ...r, amount: 99 })),
);
const p = {
  id: progressId(tasks[0].id, yesterday),
  taskId: tasks[0].id,
  date: yesterday,
  snapshot,
  checks: {},
  scheduled: true,
};
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 1000 },
  serviceWorkers: "block",
});
await context.addInitScript(
  ({ tasks, p }) => {
    localStorage.setItem("win-onboarded", "1");
    if (!localStorage.getItem("past-test-seeded")) {
      localStorage.setItem(
        "win-guest-v1",
        JSON.stringify({
          tasks,
          progress: [p],
          wins: [],
          templates: [],
          savedTemplates: [],
          weeklyReviews: [],
        }),
      );
      localStorage.setItem("past-test-seeded", "1");
    }
  },
  { tasks, p },
);
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const stored = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("win-guest-v1")));
async function weekFor(key) {
  await page.goto("http://127.0.0.1:4173/week");
  await page
    .getByRole("heading", { name: "Your week, in small wins.", exact: true })
    .waitFor();
  for (
    let offset = 0;
    !weekDates(-offset).includes(key) && offset < 3;
    offset++
  )
    await page
      .getByRole("button", { name: "Previous week", exact: true })
      .click();
}
try {
  await weekFor(yesterday);
  for (const task of tasks)
    await expect(
      page.getByRole("button", {
        name: `Log completion for ${task.name} on ${today}`,
        exact: true,
      }),
    ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: `Log completion for Created today on ${yesterday}`,
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: `Log completion for Not scheduled yesterday on ${yesterday}`,
      exact: true,
    }),
  ).toHaveCount(0);
  const first = page.getByRole("button", {
    name: `Log completion for Changed reading on ${yesterday}`,
    exact: true,
  });
  await first.focus();
  await page.keyboard.press("Enter");
  const modal = page.getByRole("dialog");
  await expect(
    modal.getByRole("heading", { name: "Original reading", exact: true }),
  ).toBeVisible();
  await expect(modal.locator(".past-entry-requirements")).toContainText(
    "2 pages",
  );
  await expect(modal.locator(".past-entry-requirements")).not.toContainText(
    "99 pages",
  );
  await expect(
    modal.getByRole("button", { name: "Save past completion", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(modal).toHaveCount(0);
  await expect(first).toBeFocused();
  assert.equal((await stored()).wins.length, 0);
  await first.click();
  await modal
    .getByRole("combobox", { name: "Highest tier completed", exact: true })
    .selectOption("2");
  await modal
    .getByRole("checkbox", {
      name: /^I completed all the requirements shown on/,
    })
    .check();
  mkdirSync("screenshots", { recursive: true });
  await page.screenshot({
    path: "screenshots/past-completion-desktop.png",
    fullPage: true,
  });
  await modal
    .getByRole("button", { name: "Save past completion", exact: true })
    .evaluate((button) => {
      button.click();
      button.click();
    });
  await expect(modal).toHaveCount(0);
  let data = await stored(),
    saved = data.progress.find((row) => row.id === p.id);
  assert.deepEqual(saved.snapshot, snapshot);
  assert.equal(achieved(saved), 2);
  assert.deepEqual(
    data.wins.filter((w) => w.taskId === tasks[0].id).map((w) => w.level),
    [1, 2],
  );
  await expect(page.getByText("Logged later", { exact: true })).toBeVisible();
  await page
    .getByRole("button", {
      name: `Log completion for Legacy breathing on ${yesterday}`,
      exact: true,
    })
    .click();
  await expect(
    modal.getByText(/No original requirements were saved/),
  ).toBeVisible();
  await modal
    .getByRole("checkbox", {
      name: /^I completed all the requirements shown on/,
    })
    .check();
  await expect(
    modal.getByRole("button", { name: "Save past completion", exact: true }),
  ).toBeDisabled();
  await modal
    .getByRole("checkbox", {
      name: /^These requirements match what this habit required on/,
    })
    .check();
  await page.setViewportSize({ width: 320, height: 844 });
  assert.ok(
    await modal.evaluate(
      (node) =>
        node.getBoundingClientRect().left >= 0 &&
        node.getBoundingClientRect().right <= innerWidth,
    ),
  );
  await page.screenshot({
    path: "screenshots/past-completion-mobile.png",
    fullPage: true,
  });
  await modal
    .getByRole("button", { name: "Save past completion", exact: true })
    .click();
  await expect(modal).toHaveCount(0);
  await expect(page.locator(".late-entry-label")).toHaveCount(2);
  await expect(page.locator(".stats-grid strong").first()).toHaveText("1");
  await weekFor(yesterday);
  await expect(page.locator(".late-entry-label")).toHaveCount(2);
  const old = daysBack(9)[0];
  await weekFor(old);
  await expect(
    page.getByRole("button", {
      name: `Log completion for Changed reading on ${old}`,
      exact: true,
    }),
  ).toHaveCount(0);
  await page.goto("http://127.0.0.1:4173/");
  await expect(
    page.getByRole("progressbar", { name: "Today's minimums completed" }),
  ).toHaveAttribute("value", "0");
  assert.deepEqual(errors, []);
  writeFileSync(
    "screenshots/past-completion-results.json",
    JSON.stringify(
      {
        passed: true,
        checks: [
          "Previous seven days only",
          "No today/future/pre-creation/unscheduled actions",
          "Original snapshot shown unchanged",
          "Date-specific completion confirmation",
          "Legacy requirements require extra confirmation",
          "T2 includes T1 and T2 only",
          "Logged later labels persist",
          "Historical day statistics update",
          "Today's progress unchanged",
          "Keyboard open/Escape/focus return",
          "Mobile dialog fits",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: past-day correction, original snapshots, confirmation safeguards, history statistics and mobile dialog.",
  );
} finally {
  await browser.close();
}

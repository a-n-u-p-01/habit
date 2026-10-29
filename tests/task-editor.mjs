import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { exemplar, dateKey, daysBack, progressId } from "../src/domain.js";
const day = dateKey(),
  yesterday = daysBack(2)[0];
const legacy = {
  ...exemplar,
  id: "legacy",
  name: "Legacy movement",
  active: true,
  createdDay: daysBack(8)[0],
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  scheduleHistory: [],
};
const oldProgress = {
  id: progressId(legacy.id, yesterday),
  taskId: legacy.id,
  date: yesterday,
  scheduled: true,
  snapshot: {
    name: legacy.name,
    category: legacy.category,
    weekdays: legacy.weekdays,
    levels: legacy.levels,
  },
  checks: { ex1: true, ex2: true },
};
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  serviceWorkers: "block",
});
await context.addInitScript(
  ({ legacy, oldProgress }) => {
    localStorage.setItem("win-onboarded", "1");
    if (!localStorage.getItem("task-editor-seeded")) {
      localStorage.setItem(
        "win-guest-v1",
        JSON.stringify({
          tasks: [legacy],
          progress: [oldProgress],
          wins: [],
          templates: [],
          savedTemplates: [],
          weeklyReviews: [],
        }),
      );
      localStorage.setItem("task-editor-seeded", "1");
    }
  },
  { legacy, oldProgress },
);
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const data = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("win-guest-v1")));
const check = () =>
  page
    .getByRole("checkbox", {
      name: "T1 is manageable. T2 and T3 add extra tasks.",
    })
    .check();
try {
  await page.goto("http://127.0.0.1:4173/habits/new/manual");
  await expect(page.getByRole("spinbutton")).toHaveCount(0);
  await expect(page.getByText("Amount", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Unit", { exact: true })).toHaveCount(0);
  await expect(page.locator(".progression")).not.toContainText("1 reps");
  await page.getByPlaceholder("e.g. Read daily").fill("Daily reset");
  await page.getByRole("combobox").selectOption("Health");
  await page
    .getByRole("textbox", { name: "T1 task 1", exact: true })
    .fill("Drink a glass of water");
  for (let i = 2; i <= 7; i++) {
    await page
      .getByRole("button", { name: "Add T1 task", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: `T1 task ${i}`, exact: true })
      .fill(`Complete useful step ${i}`);
  }
  await page
    .getByRole("textbox", { name: "T2 task 1", exact: true })
    .fill("Take a short walk");
  await page
    .getByRole("textbox", { name: "T3 task 1", exact: true })
    .fill("Prepare tomorrow's water bottle");
  while (
    await page.locator('.weekday-picker button[aria-pressed="false"]').count()
  )
    await page
      .locator('.weekday-picker button[aria-pressed="false"]')
      .first()
      .click();
  await check();
  mkdirSync("screenshots", { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "screenshots/task-only-editor.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Save habit", exact: true }).click();
  await expect(
    page.getByRole("article", { name: "Daily reset", exact: true }),
  ).toBeVisible();
  let stored = await data(),
    habit = stored.tasks.find((t) => t.name === "Daily reset"),
    template = stored.templates.find((t) => t.id === habit.id);
  assert.equal(habit.levels[0].length, 7);
  assert.equal(habit.category, "Health");
  assert.equal(template.published, false);
  for (const tier of habit.levels)
    for (const row of tier)
      assert.deepEqual(Object.keys(row).sort(), ["id", "label"]);
  await page
    .getByRole("button", { name: "Complete T1 for Daily reset", exact: true })
    .click();
  const modal = page.getByRole("dialog");
  await expect(modal.locator(".completion-task-list li")).toHaveCount(7);
  await modal.getByRole("radio").check();
  await modal.getByRole("button", { name: "Complete", exact: true }).click();
  await expect(modal).toHaveCount(0);
  await page.reload();
  await expect(
    page
      .getByRole("article", { name: "Daily reset", exact: true })
      .locator(".tier"),
  ).toHaveText("T1");
  await page.goto(`http://127.0.0.1:4173/habits/${habit.id}`);
  await expect(page.locator(".summary-levels")).toContainText(
    "Drink a glass of water",
  );
  await expect(page.locator(".flow-body")).not.toContainText("undefined");
  await expect(page.locator(".flow-body")).not.toContainText("1 task");
  await page.goto("http://127.0.0.1:4173/tasks/legacy/edit");
  await expect(
    page.getByRole("textbox", { name: "T1 task 1", exact: true }),
  ).toHaveValue("10 reps Push-ups");
  await expect(
    page.getByRole("textbox", { name: "T1 task 2", exact: true }),
  ).toHaveValue("10 reps Squats");
  await expect(page.getByRole("spinbutton")).toHaveCount(0);
  await check();
  await page.getByRole("button", { name: "Save habit", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "My habits.", exact: true }),
  ).toBeVisible();
  stored = await data();
  assert.deepEqual(
    stored.progress.find((p) => p.id === oldProgress.id),
    oldProgress,
  );
  assert.equal(
    stored.tasks.find((t) => t.id === "legacy").levels[0][0].label,
    "10 reps Push-ups",
  );
  await page.goto("http://127.0.0.1:4173/templates/new");
  await page.getByPlaceholder("e.g. Read daily").fill("Evening reset");
  await page.getByRole("combobox").selectOption("Sleep");
  for (const [i, text] of [
    "Put the phone away",
    "Lay out clothes for tomorrow",
    "Write one priority for tomorrow",
  ].entries())
    await page
      .getByRole("textbox", { name: `T${i + 1} task 1`, exact: true })
      .fill(text);
  for (let i = 2; i <= 6; i++) {
    await page
      .getByRole("button", { name: "Add T3 task", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: `T3 task ${i}`, exact: true })
      .fill(`Optional step ${i}`);
  }
  await check();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "screenshots/task-only-template-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Save template", exact: true })
    .click();
  const mine = page.locator(".template-card").filter({
    has: page.getByRole("heading", { name: "Evening reset", exact: true }),
  });
  await expect(mine).toBeVisible();
  stored = await data();
  assert.equal(stored.tasks.length, 2);
  assert.equal(
    stored.templates.find((t) => t.name === "Evening reset").levels[2].length,
    6,
  );
  await mine.getByRole("link", { name: "Use", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "T1 task 1", exact: true }),
  ).toHaveValue("Put the phone away");
  await expect(page.getByRole("spinbutton")).toHaveCount(0);
  await check();
  await page.getByRole("button", { name: "Save habit", exact: true }).click();
  await expect(
    page.getByRole("article", { name: "Evening reset", exact: true }),
  ).toBeVisible();
  assert.equal((await data()).templates.length, 2);
  assert.deepEqual(errors, []);
  writeFileSync(
    "screenshots/task-editor-results.json",
    JSON.stringify(
      {
        passed: true,
        checks: [
          "Only task inputs, no amount/unit fields",
          "More than four tasks per tier",
          "New categories",
          "Private template creation",
          "All T1 tasks complete through radio modal",
          "Readable task-only summary",
          "Legacy quantities converted to meaningful text",
          "Historical snapshots unchanged",
          "Template creation and reuse",
          "Mobile form layout",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: task-only habit/template editor, larger task lists, categories, completion, legacy text and history preservation.",
  );
} finally {
  await browser.close();
}

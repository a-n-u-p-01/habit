import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { exemplar, dateKey, progressId, achieved } from "../src/domain.js";
const day = dateKey();
const tasks = ["Sleep cycle", "English", "All finished"].map((name, index) => ({
  ...exemplar,
  name,
  id: `compact-${index}`,
  active: true,
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  createdDay: day,
  scheduleHistory: [],
  orderIndex: index,
}));
tasks[0].levels = [
  [
    { id: "wake", label: "Wake up before 6am", amount: 1, unit: "time" },
    { id: "sleep", label: "Sleep before 10:30pm", amount: 1, unit: "time" },
  ],
  [
    {
      id: "extra",
      label: "Wind down without screens",
      amount: 10,
      unit: "min",
    },
  ],
  [{ id: "last", label: "Prepare for tomorrow", amount: 5, unit: "min" }],
];
const progress = tasks.slice(1).map((task, i) => ({
  id: progressId(task.id, day),
  taskId: task.id,
  date: day,
  scheduled: true,
  snapshot: {
    name: task.name,
    category: task.category,
    weekdays: task.weekdays,
    levels: task.levels,
  },
  checks: Object.fromEntries(
    task.levels
      .slice(0, i === 0 ? 1 : 3)
      .flat()
      .map((r) => [r.id, true]),
  ),
}));
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  serviceWorkers: "block",
});
await context.addInitScript(
  ({ tasks, progress }) => {
    localStorage.setItem("win-onboarded", "1");
    if (!localStorage.getItem("compact-seeded")) {
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
      localStorage.setItem("compact-seeded", "1");
    }
  },
  { tasks, progress },
);
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const data = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("win-guest-v1")));
try {
  await page.goto("http://127.0.0.1:4173/");
  const card = page.getByRole("article", { name: "Sleep cycle", exact: true });
  const open = card.getByRole("button", {
    name: "Complete T1 for Sleep cycle",
    exact: true,
  });
  await expect(open).toBeVisible();
  await expect(page.locator(".today-task-card h3")).toHaveText([
    "Sleep cycle",
    "English",
    "All finished",
  ]);
  await expect(page.locator(".today-task-next")).toHaveCount(0);
  assert.ok(
    await card.evaluate((node) => node.getBoundingClientRect().height < 170),
  );
  const positions = await card.evaluate((node) => ({
    button: node.querySelector("button").getBoundingClientRect().x,
    title: node.querySelector("h3").getBoundingClientRect().x,
  }));
  assert.ok(positions.button > positions.title);
  mkdirSync("screenshots", { recursive: true });
  await page
    .locator(".task-list")
    .screenshot({ path: "screenshots/compact-habit-cards.png" });
  const initial = JSON.stringify(await data());
  await open.click();
  const modal = page.getByRole("dialog");
  await expect(modal.locator(".completion-task-list li")).toHaveCount(2);
  await expect(modal.locator(".completion-task-list")).toContainText(
    "Wake up before 6am",
  );
  await expect(modal.locator(".completion-task-list")).toContainText(
    "Sleep before 10:30pm",
  );
  await expect(modal.getByRole("radio")).not.toBeChecked();
  await expect(
    modal.getByRole("button", { name: "Complete", exact: true }),
  ).toBeDisabled();
  await modal.locator("form").evaluate((form) => form.requestSubmit());
  assert.equal(JSON.stringify(await data()), initial);
  await modal.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(open).toBeFocused();
  assert.equal(JSON.stringify(await data()), initial);
  await open.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(modal).toHaveCount(0);
  await expect(open).toBeFocused();
  await open.click();
  await modal.getByRole("radio").check();
  assert.equal(
    JSON.stringify(await data()),
    initial,
    "Radio selection alone must not save",
  );
  await page.screenshot({
    path: "screenshots/habit-completion-modal.png",
    fullPage: true,
  });
  for (const theme of ["dark", "light"])
    for (const width of [320, 390, 760]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(
        (theme) => (document.documentElement.dataset.theme = theme),
        theme,
      );
      assert.ok(
        await modal.evaluate(
          (node) =>
            node.getBoundingClientRect().left >= 0 &&
            node.getBoundingClientRect().right <= innerWidth,
        ),
      );
      assert.ok(
        await modal
          .getByRole("button", { name: "Complete", exact: true })
          .evaluate((node) => node.getBoundingClientRect().height >= 44),
      );
    }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => (document.documentElement.dataset.theme = "dark"));
  await page.screenshot({
    path: "screenshots/habit-completion-modal-mobile.png",
    fullPage: true,
  });
  await modal
    .getByRole("button", { name: "Close completion", exact: true })
    .click();
  await open.click();
  await expect(modal.getByRole("radio")).not.toBeChecked();
  await modal.getByRole("radio").check();
  await modal
    .getByRole("button", { name: "Complete", exact: true })
    .evaluate((button) => {
      button.click();
      button.click();
    });
  await expect(modal).toHaveCount(0);
  await expect(card.locator(".tier")).toHaveText("T1");
  let saved = await data(),
    row = saved.progress.find((p) => p.taskId === tasks[0].id);
  assert.equal(achieved(row), 1);
  assert.equal(row.checks.wake, true);
  assert.equal(row.checks.sleep, true);
  assert.equal(saved.wins.length, 1);
  await card
    .getByRole("button", { name: "Complete T2 for Sleep cycle", exact: true })
    .click();
  await expect(modal.locator(".completion-task-list")).toContainText(
    "+ 10 min",
  );
  await expect(modal.getByRole("radio")).not.toBeChecked();
  await modal.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.reload();
  await expect(card.locator(".tier")).toHaveText("T1");
  assert.equal((await data()).wins.length, 1);
  await expect(
    page
      .getByRole("article", { name: "All finished", exact: true })
      .getByRole("button"),
  ).toHaveCount(0);
  assert.deepEqual(errors, []);
  writeFileSync(
    "screenshots/compact-card-results.json",
    JSON.stringify(
      {
        passed: true,
        checks: [
          "Compact card with right-side tier action",
          "Modal shows all selected-tier tasks",
          "No progress on open, radio, cancel or Escape",
          "Required confirmation before completion",
          "Confirmation resets on reopen",
          "Keyboard focus return",
          "Double-submit safety",
          "All requirements saved for only the reviewed tier",
          "Optional T2/T3 use same modal",
          "Completed cards stay compact",
          "Mobile dialog and light/dark themes",
          "Persistence",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: compact cards, task-review modal, required radio confirmation, cancellation, tier safety and responsive layout.",
  );
} finally {
  await browser.close();
}

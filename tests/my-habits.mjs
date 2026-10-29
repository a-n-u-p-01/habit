import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  starterTemplates,
  dateKey,
  daysBack,
  progressId,
} from "../src/domain.js";
const day = dateKey(),
  createdDay = daysBack(8)[0],
  yesterday = daysBack(2)[0];
const tasks = ["Reading", "Breathing", "Movement"].map((name, i) => ({
  ...starterTemplates[1],
  id: `manage-${i}`,
  name,
  active: i !== 1,
  createdDay,
  orderIndex: i,
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  scheduleHistory: [
    { from: createdDay, weekdays: [0, 1, 2, 3, 4, 5, 6], active: i !== 1 },
  ],
}));
const progress = [
  {
    id: progressId(tasks[0].id, yesterday),
    taskId: tasks[0].id,
    date: yesterday,
    scheduled: true,
    snapshot: {
      name: tasks[0].name,
      category: tasks[0].category,
      weekdays: tasks[0].weekdays,
      levels: tasks[0].levels,
    },
    checks: { r1: true },
  },
];
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 1000 },
  serviceWorkers: "block",
});
await context.addInitScript(
  ({ tasks, progress }) => {
    localStorage.setItem("win-onboarded", "1");
    if (!localStorage.getItem("manage-seeded")) {
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
      localStorage.setItem("manage-seeded", "1");
    }
  },
  { tasks, progress },
);
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const row = (id) => page.locator(`[data-habit-id="${id}"]`);
const data = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("win-guest-v1")));
try {
  await page.goto("http://127.0.0.1:4173/profile");
  await expect(page.locator(".habit-order-list,.manage-task")).toHaveCount(0);
  await page
    .locator(".profile-menu")
    .getByRole("link", { name: "My habits", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "My habits.", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".sidebar")
      .getByRole("link", { name: "My habits", exact: true }),
  ).toHaveAttribute("href", "/habits");
  await expect(page.locator(".habit-row-copy h3")).toHaveText([
    "Reading",
    "Breathing",
    "Movement",
  ]);
  await expect(page.locator(".my-habits-counts")).toContainText("2 active");
  await expect(page.locator(".my-habits-counts")).toContainText("1 paused");
  await expect(
    page.getByRole("link", { name: "New habit", exact: true }),
  ).toHaveAttribute("href", "/tasks/new");
  await row("manage-0")
    .getByRole("button", { name: "Pause", exact: true })
    .click();
  await expect(
    row("manage-0").getByRole("button", { name: "Enable", exact: true }),
  ).toBeVisible();
  await row("manage-0")
    .getByRole("button", { name: "Enable", exact: true })
    .click();
  await expect(
    row("manage-0").getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await row("manage-0")
    .getByRole("link", { name: "Edit Reading", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Back", exact: true }),
  ).toHaveAttribute("href", "/habits");
  await page.getByPlaceholder("e.g. Read daily").fill("Reading daily");
  await page
    .getByRole("checkbox", {
      name: "T1 is manageable. T2 and T3 add extra tasks.",
    })
    .check();
  await page.getByRole("button", { name: "Save habit", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "My habits.", exact: true }),
  ).toBeVisible();
  await expect(
    row("manage-0").getByRole("heading", {
      name: "Reading daily",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Move Reading daily down", exact: true })
    .click();
  await expect(page.locator(".habit-row-copy h3")).toHaveText([
    "Breathing",
    "Reading daily",
    "Movement",
  ]);
  await page.reload();
  await expect(page.locator(".habit-row-copy h3")).toHaveText([
    "Breathing",
    "Reading daily",
    "Movement",
  ]);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "Delete Reading daily", exact: true })
    .click();
  await expect(row("manage-0")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Delete Reading daily", exact: true })
    .click();
  await expect(row("manage-0")).toHaveCount(0);
  const saved = await data();
  assert.equal(saved.tasks.find((t) => t.id === "manage-0").deletedDay, day);
  assert.deepEqual(
    saved.progress,
    progress,
    "Removing a habit must preserve past progress",
  );
  mkdirSync("screenshots", { recursive: true });
  await page.screenshot({
    path: "screenshots/my-habits-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator(".bottom-nav")
    .getByRole("link", { name: "Your corner", exact: true })
    .click();
  await expect(page.locator(".habit-order-list")).toHaveCount(0);
  await expect(
    page
      .locator(".profile-menu")
      .getByRole("link", { name: "My progress", exact: true }),
  ).toHaveAttribute("href", "/analytics");
  await page
    .locator(".bottom-nav")
    .getByRole("link", { name: "My habits", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "My habits.", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".bottom-nav")
      .getByRole("link", { name: "My habits", exact: true }),
  ).toHaveClass(/active/);
  for (const width of [320, 390, 760]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "screenshots/my-habits-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  writeFileSync(
    "screenshots/my-habits-results.json",
    JSON.stringify(
      {
        passed: true,
        checks: [
          "Dedicated desktop and mobile tab",
          "Management removed from Your corner",
          "Active and paused counts",
          "Create link",
          "Pause and enable",
          "Edit and return to manager",
          "Reorder persistence",
          "Cancel and confirm deletion",
          "Past progress preserved",
          "Progress still accessible",
          "Mobile layout",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: My habits navigation, create/edit/pause/enable/reorder/delete, preserved history, and mobile access.",
  );
} finally {
  await browser.close();
}

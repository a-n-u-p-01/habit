import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { starterTemplates, dateKey, progressId } from "../src/domain.js";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 1100 },
  hasTouch: true,
  serviceWorkers: "block",
});
const day = dateKey(),
  names = ["Alpha", "Beta", "Gamma", "Delta"];
const tasks = names.map((name, i) => ({
  ...starterTemplates[1],
  id: name.toLowerCase(),
  name,
  active: i !== 1,
  orderIndex: i,
  createdDay: day,
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  scheduleHistory: [],
}));
const progress = tasks
  .filter((t) => t.active)
  .map((t) => ({
    id: progressId(t.id, day),
    taskId: t.id,
    date: day,
    scheduled: true,
    snapshot: {
      name: t.name,
      category: t.category,
      weekdays: t.weekdays,
      levels: t.levels,
    },
    checks: Object.fromEntries(t.levels[0].map((r) => [r.id, true])),
    createdAt: Date.now(),
  }));
await context.addInitScript(
  ({ tasks, progress }) => {
    if (!localStorage.getItem("order-test-seeded")) {
      localStorage.setItem("win-onboarded", "1");
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
      localStorage.setItem("order-test-seeded", "1");
    }
  },
  { tasks, progress },
);
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const order = () =>
  page
    .locator("[data-habit-id]")
    .evaluateAll((rows) => rows.map((r) => r.dataset.habitId));
const expectOrder = (ids) => expect.poll(order).toEqual(ids);
await page.goto("http://127.0.0.1:4173/habits");
await expectOrder(["alpha", "beta", "gamma", "delta"]);
await page.getByRole("button", { name: "Move Delta up", exact: true }).click();
await expectOrder(["alpha", "beta", "delta", "gamma"]);
await page.reload();
await expectOrder(["alpha", "beta", "delta", "gamma"]);
// Native keyboard sorting, including the paused habit.
await page.getByRole("button", { name: "Reorder Alpha", exact: true }).focus();
await page.keyboard.press("Space");
await expect(page.locator(".habit-sortable.is-dragging")).toHaveAttribute(
  "data-habit-id",
  "alpha",
);
for (let i = 0; i < 3; i++) {
  const previous = await page
    .locator(".habit-sortable.is-dragging")
    .evaluate((e) => e.style.transform);
  await page.keyboard.press("ArrowDown", { delay: 120 });
  await expect
    .poll(() =>
      page
        .locator(".habit-sortable.is-dragging")
        .evaluate((e) => e.style.transform),
    )
    .not.toBe(previous);
}
await expect
  .poll(() => page.locator("[id^=DndLiveRegion]").allTextContents())
  .toContainEqual(expect.stringContaining("gamma"));
await page.keyboard.press("Space");
await expectOrder(["beta", "delta", "gamma", "alpha"]);
// Pointer grip sorting on desktop.
const drag = page.getByRole("button", { name: "Reorder Gamma", exact: true }),
  target = page.getByRole("button", { name: "Reorder Beta", exact: true });
await drag.scrollIntoViewIfNeeded();
let from = await drag.boundingBox(),
  to = await target.boundingBox();
await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
await page.mouse.down();
await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 - 10, {
  steps: 3,
});
await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 18 });
await page.mouse.up();
await expectOrder(["gamma", "beta", "delta", "alpha"]);
// A real touch-pointer drag at phone width, without blocking page scrolling.
await page.setViewportSize({ width: 390, height: 1100 });
await page.locator(".habit-order-list").scrollIntoViewIfNeeded();
const phoneGrip = page.getByRole("button", {
  name: "Reorder Delta",
  exact: true,
});
const phoneTarget = page.getByRole("button", {
  name: "Reorder Beta",
  exact: true,
});
await phoneGrip.scrollIntoViewIfNeeded();
await page.evaluate(() =>
  Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))),
);
from = await phoneGrip.boundingBox();
to = await phoneTarget.boundingBox();

const cdp = await context.newCDPSession(page);
const x = from.x + from.width / 2,
  y = from.y + from.height / 2,
  ty = to.y + to.height / 2;
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchStart",
  touchPoints: [{ x, y }],
});
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchMove",
  touchPoints: [{ x, y: y - 10 }],
});
await expect(page.locator(".habit-sortable.is-dragging")).toHaveAttribute(
  "data-habit-id",
  "delta",
);
for (let i = 1; i <= 16; i++)
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x, y: y + ((ty - y) * i) / 16 }],
  });
await expect
  .poll(() => page.locator("[id^=DndLiveRegion]").allTextContents())
  .toContainEqual(expect.stringContaining("beta"));
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchEnd",
  touchPoints: [],
});
await expectOrder(["gamma", "delta", "beta", "alpha"]);
await page.reload();
await expectOrder(["gamma", "delta", "beta", "alpha"]);
// Enable/pause does not change the arranged position.
const beta = page.locator('[data-habit-id="beta"]');
await beta.getByRole("button", { name: "Enable", exact: true }).click();
await expect(
  beta.getByRole("button", { name: "Pause", exact: true }),
).toBeVisible();
await expectOrder(["gamma", "delta", "beta", "alpha"]);
const expected = ["Gamma", "Delta", "Beta", "Alpha"];
await page.goto("http://127.0.0.1:4173");
await expect
  .poll(() => page.locator(".today-task-card h3").allTextContents())
  .toEqual(expected);
await expect(page.locator(".inline-level-status").first()).toContainText(
  "Minimum done",
);
await expect(
  page.getByRole("button", { name: "Complete T2 for Gamma", exact: true }),
).toBeVisible();
await expect(
  page.getByRole("button", { name: "Timeline", exact: true }),
).toHaveCount(0);
await expect(
  page.getByRole("button", { name: "Habits", exact: true }),
).toHaveCount(0);
await page.goto("http://127.0.0.1:4173/week");
await expect
  .poll(() => page.locator(".week-table tbody th").allTextContents())
  .toEqual(expected);
await page.goto("http://127.0.0.1:4173/analytics");
await expect
  .poll(() => page.locator(".consistency>div>span").allTextContents())
  .toEqual(expected);
// Editing an existing habit must preserve its rank.
await page.goto("http://127.0.0.1:4173/tasks/beta/edit");
await page
  .getByRole("checkbox", {
    name: "T1 is manageable. T2 and T3 add extra tasks.",
  })
  .check();
await page.getByRole("button", { name: "Save habit", exact: true }).click();
await page.goto("http://127.0.0.1:4173/habits");
await expectOrder(["gamma", "delta", "beta", "alpha"]);
// The normal pointer area still permits scrolling; touch-action:none is grip-only.
assert.equal(
  await page
    .locator(".habit-drag-handle")
    .first()
    .evaluate((e) => getComputedStyle(e).touchAction),
  "none",
);
assert.notEqual(
  await page
    .locator(".habit-row-copy")
    .first()
    .evaluate((e) => getComputedStyle(e).touchAction),
  "none",
);
mkdirSync("screenshots", { recursive: true });
await page
  .locator(".habit-order-list")
  .screenshot({ path: "screenshots/habit-order-mobile.png" });
assert.deepEqual(errors, []);
writeFileSync(
  "screenshots/habit-order-results.json",
  JSON.stringify(
    {
      passed: true,
      checks: [
        "move-buttons",
        "keyboard-sort",
        "desktop-pointer-drag",
        "phone-touch-drag",
        "refresh-persistence",
        "enable-keeps-position",
        "Today-order",
        "Today-has-no-view-switch",
        "Week-order",
        "Analytics-order",
        "edit-keeps-position",
        "badge-labels",
      ],
      uncaughtErrors: errors,
    },
    null,
    2,
  ),
);
console.log(
  "PASS: habit ordering by buttons, keyboard, pointer, and touch; persistence and shared screen order.",
);
await browser.close();

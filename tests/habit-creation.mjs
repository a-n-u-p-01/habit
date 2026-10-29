import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 1000 },
  serviceWorkers: "block",
});
await context.addInitScript(() => localStorage.setItem("win-onboarded", "1"));
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const data = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("win-guest-v1") || "{}"));
async function fillManual() {
  await page.getByPlaceholder("e.g. Read daily").fill("Read one page");
  for (const n of [1, 2, 3])
    await page
      .getByRole("textbox", { name: `T${n} task 1`, exact: true })
      .fill(["Read 1 page", "Read 2 more pages", "Write one sentence"][n - 1]);
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
}
try {
  await page.goto("http://127.0.0.1:4173/habits/new");
  await expect(
    page.getByRole("heading", { name: "Start a new habit.", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Use a template", exact: true }),
  ).toHaveAttribute("href", "/templates");
  await expect(
    page.getByRole("link", { name: "Create manually", exact: true }),
  ).toHaveAttribute("href", "/habits/new/manual");
  mkdirSync("screenshots", { recursive: true });
  await page.screenshot({
    path: "screenshots/habit-create-choice.png",
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Create manually", exact: true })
    .click();
  await expect(
    page.getByText("Also saved privately in My Templates."),
  ).toBeVisible();
  await fillManual();
  await page
    .getByRole("button", { name: "Save habit", exact: true })
    .evaluate((button) => {
      button.click();
      button.click();
    });
  await expect(page.locator(".today-task-card h3")).toHaveText([
    "Read one page",
  ]);
  let stored = await data();
  assert.equal(stored.tasks.length, 1);
  assert.equal(stored.templates.length, 1);
  const task = stored.tasks[0],
    template = stored.templates[0];
  assert.equal(task.id, template.id);
  assert.equal(template.published, false);
  for (const key of ["name", "description", "category", "weekdays", "levels"])
    assert.deepEqual(template[key], task[key]);
  for (const key of [
    "active",
    "createdDay",
    "scheduleHistory",
    "orderIndex",
    "checks",
    "sourceTemplateId",
  ])
    assert.equal(Object.hasOwn(template, key), false);
  await page.reload();
  assert.equal((await data()).templates.length, 1);
  await page.goto(`http://127.0.0.1:4173/tasks/${task.id}/edit`);
  await page.getByPlaceholder("e.g. Read daily").fill("Read a little today");
  await page
    .getByRole("checkbox", {
      name: "T1 is manageable. T2 and T3 add extra tasks.",
    })
    .check();
  await page.getByRole("button", { name: "Save habit", exact: true }).click();
  await expect(page.locator(".habit-row-copy h3")).toHaveText([
    "Read a little today",
  ]);
  stored = await data();
  assert.deepEqual(
    stored.templates[0],
    template,
    "Editing a habit must not duplicate or rewrite the reusable template",
  );
  await page.goto("http://127.0.0.1:4173/templates?tab=mine");
  const personalCard = page.locator(".template-card").filter({
    has: page.getByRole("heading", { name: "Read one page", exact: true }),
  });
  await expect(
    personalCard.getByText("PERSONAL TEMPLATE", { exact: true }),
  ).toBeVisible();
  await personalCard.getByRole("link", { name: "Use", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Customize habit", exact: true }),
  ).toBeVisible();
  await page.getByPlaceholder("e.g. Read daily").fill("Read in the evening");
  await page
    .getByRole("checkbox", {
      name: "T1 is manageable. T2 and T3 add extra tasks.",
    })
    .check();
  await page.getByRole("button", { name: "Save habit", exact: true }).click();
  await expect(page.locator(".today-task-card h3")).toHaveText([
    "Read a little today",
    "Read in the evening",
  ]);
  stored = await data();
  assert.equal(
    stored.templates.length,
    1,
    "Using a template must not create another template",
  );
  assert.deepEqual(stored.templates[0], template);
  assert.notEqual(stored.tasks[1].levels[0][0].id, template.levels[0][0].id);
  await page.goto("http://127.0.0.1:4173/habits/new");
  await page.getByRole("link", { name: "Use a template", exact: true }).click();
  const starter = page.locator(".template-card").filter({
    has: page.getByRole("heading", { name: "A little reading", exact: true }),
  });
  await starter.getByRole("link", { name: "Use", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Customize habit", exact: true }),
  ).toBeVisible();
  await expect(page.getByPlaceholder("e.g. Read daily")).toHaveValue(
    "A little reading",
  );
  // A real New habit link clears the selected-template navigation state.
  // Reloading the same URL intentionally preserves it for draft customization.
  await page
    .locator(".sidebar")
    .getByRole("link", { name: "Create a habit", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Start a new habit.", exact: true }),
  ).toBeVisible();
  // Cancelling this customization must not save any additional records.
  assert.equal((await data()).tasks.length, 2);
  assert.equal((await data()).templates.length, 1);
  await page.setViewportSize({ width: 320, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: "screenshots/habit-create-choice-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  writeFileSync(
    "screenshots/habit-creation-results.json",
    JSON.stringify(
      {
        passed: true,
        checks: [
          "New habit choice",
          "Manual habit plus private template saved together",
          "Duplicate-click protection",
          "Clean reusable template fields",
          "Reload persistence",
          "Editing does not overwrite template",
          "Personal template reuse without duplicates",
          "Fresh requirement IDs for copies",
          "Starter template customization",
          "Cancel does not save",
          "Mobile choice layout",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: habit choice, manual private template creation, reuse, edits, duplicate prevention and mobile layout.",
  );
} finally {
  await browser.close();
}

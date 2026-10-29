// Start Vite on port 4173, then run npm run test:routing.
import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { dateKey, exemplar } from "../src/domain.js";
const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  serviceWorkers: "block",
});
await context.addInitScript(
  ({ task }) => {
    localStorage.setItem("win-onboarded", "1");
    if (!localStorage.getItem("route-test-seeded")) {
      localStorage.setItem(
        "win-guest-v1",
        JSON.stringify({
          tasks: [task],
          progress: [],
          wins: [],
          templates: [],
          savedTemplates: [],
          weeklyReviews: [],
        }),
      );
      localStorage.setItem("route-test-seeded", "1");
    }
  },
  {
    task: {
      ...exemplar,
      id: "route-habit",
      name: "Routing test habit",
      active: true,
      createdDay: dateKey(),
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      scheduleHistory: [],
    },
  },
);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  for (const [path, expected] of [
    ["/tasks/new", "/habits/new"],
    ["/tasks/new/manual", "/habits/new/manual"],
    ["/tasks/route-habit/edit", "/habits/route-habit/edit"],
    ["/task/route-habit", "/habits/route-habit"],
    ["/review", "/week/review"],
    ["/profile", "/settings"],
    ["/feedback", "/help?section=feedback"],
  ]) {
    await page.goto(baseURL + path);
    await expect(page).toHaveURL(baseURL + expected);
    await page.reload();
    await expect(page).toHaveURL(baseURL + expected);
    await expect(
      page.getByRole("heading", { name: "A little off the path", exact: true }),
    ).toHaveCount(0);
  }
  await page.goto(baseURL + "/habits");
  await page.goto(baseURL + "/tasks/new?source=old#editor");
  await expect(page).toHaveURL(baseURL + "/habits/new?source=old#editor");
  await page.goBack();
  await expect(page).toHaveURL(baseURL + "/habits");
  // React Router stores route state under usr; the old URL must retain it.
  await page.evaluate(
    (template) => {
      history.pushState(
        {
          usr: { template, privateTemplate: true },
          key: "legacy-template",
          idx: 1,
        },
        "",
        "/tasks/new?source=template",
      );
    },
    { ...exemplar, id: "private-template", name: "Template routed safely" },
  );
  await page.reload();
  await expect(page).toHaveURL(baseURL + "/habits/new?source=template");
  await expect(page.getByPlaceholder("e.g. Read daily")).toHaveValue(
    "Template routed safely",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseURL + "/habits/new/manual");
  await expect(page.locator('.bottom-nav a[href="/habits/new"]')).toHaveClass(
    /active/,
  );
  await expect(page.locator('.bottom-nav a[href="/habits"]')).not.toHaveClass(
    /active/,
  );
  await page.goto(baseURL + "/week/review");
  await expect(
    page.getByRole("heading", { name: "Weekly reflection", exact: true }),
  ).toBeVisible();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: canonical routes, legacy replacement redirects, refresh, Back, template state and mobile active navigation.",
  );
} finally {
  await browser.close();
}

// Start Vite on port 4173, then run npm run test:publication.
import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { CATEGORIES, exemplar } from "../src/domain.js";
import { CATEGORY_ICONS } from "../src/category-icons.js";
const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  serviceWorkers: "block",
});
await context.addInitScript(
  ({ templates }) => {
    localStorage.setItem("win-onboarded", "1");
    localStorage.setItem(
      "win-guest-v1",
      JSON.stringify({
        tasks: [],
        progress: [],
        wins: [],
        savedTemplates: [],
        weeklyReviews: [],
        templates,
      }),
    );
  },
  {
    templates: CATEGORIES.map((category, index) => ({
      ...exemplar,
      id: `icon-${index}`,
      name: `${category} template`,
      category,
      published: index === 1,
    })),
  },
);
const page = await context.newPage();
let nativePrompts = 0;
page.on("dialog", async (dialog) => {
  nativePrompts++;
  await dialog.dismiss();
});
try {
  await page.goto(baseURL + "/templates?tab=mine");
  for (const category of CATEGORIES) {
    const card = page
      .locator(".template-card")
      .filter({
        has: page.getByRole("heading", {
          name: `${category} template`,
          exact: true,
        }),
      });
    await expect(card.locator(".category-icon")).toHaveAttribute(
      "data-category-icon",
      CATEGORY_ICONS[category],
    );
  }
  const svg = await page
    .locator(".template-card .category-icon svg")
    .evaluateAll((nodes) => nodes.map((node) => node.outerHTML));
  assert.equal(new Set(svg).size, CATEGORIES.length);
  const fitness = page
    .locator(".template-card")
    .filter({
      has: page.getByRole("heading", { name: "Fitness template", exact: true }),
    });
  await fitness.getByRole("button", { name: "Publish", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Publish template?" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  await expect(
    dialog.getByRole("button", { name: "Publish template", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    fitness.getByRole("button", { name: "Publish", exact: true }),
  ).toBeFocused();
  const study = page
    .locator(".template-card")
    .filter({
      has: page.getByRole("heading", { name: "Study template", exact: true }),
    });
  await study.getByRole("button", { name: "Unpublish", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Unpublish template?" }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  assert.equal(nativePrompts, 0);
  console.log(
    "PASS: distinct category SVGs, in-app publish/unpublish confirmation, safe focus, Escape/cancel, no browser prompt.",
  );
} finally {
  await browser.close();
}

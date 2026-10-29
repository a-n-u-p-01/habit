import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CATEGORY_ICONS } from "../src/category-icons.js";
import { CATEGORIES } from "../src/domain.js";
test("Every supported category has a specific icon", () => {
  assert.deepEqual(Object.keys(CATEGORY_ICONS).sort(), [...CATEGORIES].sort());
  assert.equal(Object.values(CATEGORY_ICONS).every(Boolean), true);
});
test("Category symbols are distinct rather than repeated generic icons", () => {
  assert.equal(new Set(Object.values(CATEGORY_ICONS)).size, CATEGORIES.length);
  assert.equal(CATEGORY_ICONS.Fitness, "Dumbbell");
  assert.equal(CATEGORY_ICONS.Nutrition, "Utensils");
  assert.equal(CATEGORY_ICONS.Sleep, "BedDouble");
  assert.equal(CATEGORY_ICONS.Growth, "Sprout");
});
test("Publish controls open an in-app confirmation rather than a browser prompt", () => {
  const source = readFileSync(
    new URL("../src/screens/Templates.jsx", import.meta.url),
    "utf8",
  );
  const action = source.slice(
    source.indexOf("function publish("),
    source.indexOf("  return (", source.indexOf("function publish(")),
  );
  assert.doesNotMatch(action, /window\.confirm|window\.alert/);
  assert.match(source, /<ConfirmationDialog/);
  assert.match(source, /onConfirm=\{confirmPublication\}/);
});

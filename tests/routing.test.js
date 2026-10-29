import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { legacyRouteTarget, isHabitCreationPath } from "../src/routing.js";

test("Legacy habit creation and weekly reflection URLs have canonical destinations", () => {
  for (const [oldPath, target] of [
    ["/tasks/new", "/habits/new"],
    ["/tasks/new/manual", "/habits/new/manual"],
    ["/review", "/week/review"],
    ["/profile", "/settings"],
    ["/feedback", "/help?section=feedback"],
  ])
    assert.equal(legacyRouteTarget(oldPath), target);
});
test("Legacy edit and habit detail URLs preserve their identifiers", () => {
  assert.equal(
    legacyRouteTarget("/tasks/habit-123/edit"),
    "/habits/habit-123/edit",
  );
  assert.equal(legacyRouteTarget("/task/habit-123"), "/habits/habit-123");
  assert.equal(
    legacyRouteTarget("/tasks/habit%20one/edit"),
    "/habits/habit%20one/edit",
  );
});
test("Compatibility redirects preserve query strings, fragments and trailing slash bookmarks", () => {
  assert.equal(
    legacyRouteTarget("/tasks/new/", "?source=template", "#editor"),
    "/habits/new?source=template#editor",
  );
  assert.equal(
    legacyRouteTarget("/task/abc", "?day=2026-10-28", "#tiers"),
    "/habits/abc?day=2026-10-28#tiers",
  );
  assert.equal(
    legacyRouteTarget("/review", "?week=2026-10-26", "#notes"),
    "/week/review?week=2026-10-26#notes",
  );
  assert.equal(
    legacyRouteTarget("/feedback", "?source=settings", "#form"),
    "/help?source=settings&section=feedback#form",
  );
});
test("Canonical and unknown paths are never rewritten or caught by broad aliases", () => {
  for (const path of [
    "/habits/new",
    "/habits/abc/edit",
    "/week/review",
    "/admin/feedback",
    "/reviews",
    "/tasks/abc/other",
    "/task/abc/edit",
    "/unknown",
  ])
    assert.equal(legacyRouteTarget(path), null, path);
});
test("Creation navigation only matches its own subtree", () => {
  for (const path of ["/habits/new", "/habits/new/", "/habits/new/manual"])
    assert.equal(isHabitCreationPath(path), true, path);
  for (const path of [
    "/habits",
    "/habits/news",
    "/habits/newish/edit",
    "/week/review",
  ])
    assert.equal(isHabitCreationPath(path), false, path);
});
test("Internal UI links use canonical habit and review URLs", () => {
  const walk = (path) =>
    readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? walk(`${path}/${entry.name}`)
        : [`${path}/${entry.name}`],
    );
  for (const path of walk(new URL("../src/", import.meta.url).pathname).filter(
    (path) => path.endsWith(".jsx"),
  )) {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(
      source,
      /to=(?:\{)?["'`]\/(?:tasks\/|task\/|review["'`])/g,
      path,
    );
  }
  const source = readFileSync(
    new URL("../src/App.jsx", import.meta.url),
    "utf8",
  );
  for (const path of [
    "/habits/new",
    "/habits/new/manual",
    "/habits/:id/edit",
    "/habits/:id",
    "/week/review",
  ])
    assert.ok(source.includes(`path="${path}"`), path);
});
test("Hosting already supports direct refresh on nested routes", () => {
  const config = JSON.parse(
    readFileSync(new URL("../firebase.json", import.meta.url), "utf8"),
  );
  assert.ok(
    config.hosting.rewrites.some(
      (row) => row.source === "**" && row.destination === "/index.html",
    ),
  );
});

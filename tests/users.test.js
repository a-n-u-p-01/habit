import { test } from "node:test";
import assert from "node:assert/strict";
import {
  joinedMillis,
  paginateUsers,
  selectUsers,
  templateCounts,
  userRole,
} from "../src/users.js";
const users = [
  { id: "u1", displayName: "Zinnia", createdAt: 1000 },
  { id: "u2", displayName: "Aster", createdAt: 3000 },
  { id: "u3", displayName: "Fern" },
];
const roles = { u1: "super_admin", u2: "admin" };
test("Role labels fail safely for missing or unknown roles", () => {
  assert.equal(userRole(roles, "u1"), "super_admin");
  assert.equal(userRole(roles, "u3"), "user");
  assert.equal(userRole({ u1: "owner" }, "u1"), "user");
});
test("Public template counts group by author, not profile name", () => {
  const counts = templateCounts([
    { authorId: "u1" },
    { authorId: "u1" },
    { authorId: "u3" },
    {},
  ]);
  assert.equal(counts.u1, 2);
  assert.equal(counts.u3, 1);
  assert.equal(counts.u2, undefined);
  assert.equal(templateCounts([{ authorId: "__proto__" }])["__proto__"], 1);
});
test("Search and exact-role filters combine without mutating the source", () => {
  assert.deepEqual(
    selectUsers(users, roles, {}, { search: " U2 ", role: "admin" }).map(
      (r) => r.id,
    ),
    ["u2"],
  );
  assert.equal(
    selectUsers(users, roles, {}, { search: "Aster", role: "user" }).length,
    0,
  );
  assert.deepEqual(
    selectUsers(users, roles, {}, { role: "super_admin" }).map((r) => r.id),
    ["u1"],
  );
  assert.equal(users[0].id, "u1");
});
test("Sorting supports name, newest joined and most posted templates", () => {
  assert.deepEqual(
    selectUsers(users, roles, {}).map((r) => r.id),
    ["u2", "u3", "u1"],
  );
  assert.deepEqual(
    selectUsers(users, roles, {}, { sort: "newest" }).map((r) => r.id),
    ["u2", "u1", "u3"],
  );
  assert.deepEqual(
    selectUsers(users, roles, { u1: 10, u3: 2 }, { sort: "templates" }).map(
      (r) => r.id,
    ),
    ["u1", "u3", "u2"],
  );
});
test("Pagination clamps after live removals, supports page sizes and handles empty results", () => {
  const rows = Array.from({ length: 26 }, (_, id) => ({ id }));
  assert.deepEqual(
    paginateUsers(rows, 2, 10).rows.map((r) => r.id),
    [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
  );
  assert.equal(paginateUsers(rows, 100, 10).page, 3);
  assert.equal(paginateUsers(rows, 3, 25).page, 2);
  assert.equal(paginateUsers(rows, 3, 25).start, 26);
  assert.equal(paginateUsers(rows, 3, 25).end, 26);
  assert.deepEqual(paginateUsers([], 9, 10), {
    rows: [],
    page: 1,
    totalPages: 1,
    start: 0,
    end: 0,
  });
});
test("Unknown historical join dates are never invented from profile update dates", () => {
  assert.equal(joinedMillis(undefined), null);
  assert.equal(joinedMillis("invalid"), null);
  assert.equal(joinedMillis(0), null);
  assert.equal(joinedMillis({ toMillis: () => 1234 }), 1234);
  assert.equal(
    joinedMillis("2026-10-29T00:00:00Z"),
    Date.parse("2026-10-29T00:00:00Z"),
  );
});

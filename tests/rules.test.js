import { test, before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import { exemplar } from "../src/domain.js";
import { encodeFirestore } from "../src/serialization.js";
let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-win-today",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});
after(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
});
const task = encodeFirestore({
  ...exemplar,
  id: "a",
  active: true,
  createdDay: "2026-10-27",
  scheduleHistory: [],
});
const publicTemplate = encodeFirestore({
  name: exemplar.name,
  category: exemplar.category,
  weekdays: exemplar.weekdays,
  levels: exemplar.levels,
  authorId: "alice",
  authorName: "Alice",
  description: "A small beginning",
  published: true,
  updatedAt: 1,
});
test("Owner can write private habit; others and anonymous cannot read or write", async () => {
  const a = env.authenticatedContext("alice").firestore(),
    b = env.authenticatedContext("bob").firestore(),
    anon = env.unauthenticatedContext().firestore();
  await assertSucceeds(setDoc(doc(a, "users/alice/tasks/a"), task));
  await assertFails(getDoc(doc(b, "users/alice/tasks/a")));
  await assertFails(setDoc(doc(b, "users/alice/tasks/a"), task));
  await assertFails(getDoc(doc(anon, "users/alice/tasks/a")));
});
test("Published templates readable publicly; cannot hijack author or publish malformed levels", async () => {
  const a = env.authenticatedContext("alice").firestore(),
    b = env.authenticatedContext("bob").firestore();
  await assertSucceeds(setDoc(doc(a, "templates/t"), publicTemplate));
  await assertSucceeds(
    getDoc(doc(env.unauthenticatedContext().firestore(), "templates/t")),
  );
  await assertFails(
    setDoc(doc(b, "templates/t"), { ...publicTemplate, authorId: "bob" }),
  );
  await assertFails(
    setDoc(doc(a, "templates/bad"), {
      ...publicTemplate,
      levels: { t1: [], t2: [], t3: [] },
    }),
  );
});
test("Reviews unique per author and template, rating constrained, forgery denied", async () => {
  const a = env.authenticatedContext("alice").firestore(),
    b = env.authenticatedContext("bob").firestore();
  await setDoc(doc(a, "templates/t"), publicTemplate);
  const r = {
    templateId: "t",
    authorId: "bob",
    authorName: "Bob",
    rating: 5,
    text: "Helpful minimum.",
    recommend: true,
    updatedAt: 1,
  };
  await assertSucceeds(setDoc(doc(b, "reviews/t_bob"), r));
  await assertFails(setDoc(doc(b, "reviews/t_bob_duplicate"), r));
  await assertFails(setDoc(doc(b, "reviews/t_bob"), { ...r, rating: 6 }));
  await assertFails(setDoc(doc(a, "reviews/t_bob"), r));
  await assertFails(deleteDoc(doc(a, "reviews/t_bob")));
});
test("Cannot forge a T3 win without requirements", async () => {
  const a = env.authenticatedContext("alice").firestore();
  await setDoc(doc(a, "users/alice/tasks/a"), task);
  await setDoc(doc(a, "users/alice/progress/2026-10-27_a"), {
    id: "2026-10-27_a",
    taskId: "a",
    date: "2026-10-27",
    snapshot: encodeFirestore(exemplar),
    checks: {},
    scheduled: true,
  });
  await assertFails(
    setDoc(doc(a, "users/alice/wins/2026-10-27_a_T3"), {
      id: "2026-10-27_a_T3",
      taskId: "a",
      date: "2026-10-27",
      level: 3,
    }),
  );
  const batch = writeBatch(a);
  batch.set(
    doc(a, "users/alice/progress/2026-10-27_a"),
    { checks: { ex1: true, ex2: true } },
    { merge: true },
  );
  batch.set(doc(a, "users/alice/wins/2026-10-27_a_T1"), {
    id: "2026-10-27_a_T1",
    taskId: "a",
    date: "2026-10-27",
    level: 1,
  });
  await assertSucceeds(batch.commit());
});
test("Snapshot cannot be rewritten after starting a habit", async () => {
  const a = env.authenticatedContext("alice").firestore();
  await setDoc(doc(a, "users/alice/tasks/a"), task);
  const p = {
    id: "2026-10-27_a",
    taskId: "a",
    date: "2026-10-27",
    snapshot: encodeFirestore(exemplar),
    checks: {},
    scheduled: true,
  };
  await setDoc(doc(a, "users/alice/progress/2026-10-27_a"), p);
  await assertFails(
    setDoc(doc(a, "users/alice/progress/2026-10-27_a"), {
      ...p,
      snapshot: encodeFirestore({ ...exemplar, name: "changed" }),
    }),
  );
});

test("Maximum four requirements per tier stays within rule expression budget", async () => {
  const a = env.authenticatedContext("alice").firestore();
  const levels = [0, 1, 2].map((i) =>
    Array.from({ length: 4 }, (_, j) => ({
      id: `max-${i}-${j}`,
      label: "Movement",
      amount: 1,
      unit: "reps",
    })),
  );
  const maximal = encodeFirestore({ ...task, levels });
  await assertSucceeds(setDoc(doc(a, "users/alice/tasks/a"), maximal));
  await assertSucceeds(
    setDoc(doc(a, "templates/max"), {
      ...publicTemplate,
      levels: maximal.levels,
    }),
  );
  const p = {
    id: "2026-10-27_a",
    taskId: "a",
    date: "2026-10-27",
    snapshot: encodeFirestore({ ...exemplar, levels }),
    checks: Object.fromEntries(levels.flat().map((r) => [r.id, true])),
    scheduled: true,
  };
  await assertSucceeds(setDoc(doc(a, "users/alice/progress/2026-10-27_a"), p));
  await assertSucceeds(
    setDoc(doc(a, "users/alice/wins/2026-10-27_a_T3"), {
      id: "2026-10-27_a_T3",
      taskId: "a",
      date: "2026-10-27",
      level: 3,
    }),
  );
});

test("Saved template snapshots and private review paths accept valid owner writes", async () => {
  const a = env.authenticatedContext("alice").firestore();
  await assertSucceeds(
    setDoc(doc(a, "users/alice/savedTemplates/t"), {
      id: "t",
      templateId: "t",
      snapshot: publicTemplate,
    }),
  );
  await assertSucceeds(
    setDoc(doc(a, "users/alice/weeklyReviews/2026-10-26"), {
      id: "2026-10-26",
      weekStart: "2026-10-26",
      worked: "Small T1",
      hard: "",
      next: "",
    }),
  );
});

test("Inline multi-requirement tier wins merge safely and satisfy unchanged rules", async () => {
  const { completeNextLevel, achieved } = await import("../src/domain.js");
  const { decodeFirestore } = await import("../src/serialization.js");
  const a = env.authenticatedContext("alice").firestore();
  await setDoc(doc(a, "users/alice/tasks/a"), task);
  let p = {
    id: "2026-10-27_a",
    taskId: "a",
    date: "2026-10-27",
    snapshot: exemplar,
    checks: {},
    scheduled: true,
  };
  await setDoc(doc(a, "users/alice/progress/2026-10-27_a"), encodeFirestore(p));
  for (const target of [1, 2, 3]) {
    const next = completeNextLevel(p, target);
    const checks = Object.fromEntries(
      p.snapshot.levels[target - 1].map((r) => [r.id, true]),
    );
    const batch = writeBatch(a);
    batch.set(
      doc(a, "users/alice/progress/2026-10-27_a"),
      { checks },
      { merge: true },
    );
    const id = `2026-10-27_a_T${target}`;
    batch.set(
      doc(a, `users/alice/wins/${id}`),
      { id, taskId: "a", date: "2026-10-27", level: target },
      { merge: true },
    );
    await assertSucceeds(batch.commit());
    const stored = decodeFirestore(
      (await getDoc(doc(a, "users/alice/progress/2026-10-27_a"))).data(),
    );
    if (achieved(stored) !== target)
      throw new Error("Inline tier level was not preserved");
    if (JSON.stringify(stored.checks) !== JSON.stringify(next.checks)) {
      for (const [id, value] of Object.entries(next.checks))
        if (stored.checks[id] !== value)
          throw new Error("A requirement was lost");
    }
    p = stored;
  }
});

test("Habit reorder batch preserves fields and is owner-only without new rules", async () => {
  const a = env.authenticatedContext("alice").firestore(),
    b = env.authenticatedContext("bob").firestore();
  await setDoc(doc(a, "users/alice/tasks/a"), { ...task, orderIndex: 0 });
  await setDoc(doc(a, "users/alice/tasks/b"), {
    ...task,
    id: "b",
    active: false,
    orderIndex: 1,
  });
  const batch = writeBatch(a);
  batch.update(doc(a, "users/alice/tasks/a"), { orderIndex: 1 });
  batch.update(doc(a, "users/alice/tasks/b"), { orderIndex: 0 });
  await assertSucceeds(batch.commit());
  const moved = (await getDoc(doc(a, "users/alice/tasks/b"))).data();
  if (moved.orderIndex !== 0 || moved.active !== false)
    throw new Error("Ordering changed habit state");
  const forged = writeBatch(b);
  forged.update(doc(b, "users/alice/tasks/a"), { orderIndex: 0 });
  await assertFails(forged.commit());
});

// Roles and feedback: enforce authorization in Firestore, not only in navigation.
async function seedAccess() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const uid of ["alice", "bob", "admin", "super", "otherSuper"])
      await setDoc(doc(db, "users", uid), { displayName: uid, photoURL: "" });
    for (const [uid, role] of [
      ["admin", "admin"],
      ["super", "super_admin"],
      ["otherSuper", "super_admin"],
    ])
      await setDoc(doc(db, "userRoles", uid), { role });
  });
}
const roleWrite = (role, uid) => ({
  role,
  updatedBy: uid,
  updatedAt: serverTimestamp(),
});
const feedbackWrite = (uid, extra = {}) => ({
  type: "report",
  title: "A small problem",
  message: "Steps to reproduce the problem.",
  authorId: uid,
  authorName: uid,
  status: "open",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
});

test("Only staff can list users; staff cannot read private habits or change profiles", async () => {
  await seedAccess();
  const alice = env.authenticatedContext("alice").firestore();
  await setDoc(doc(alice, "users/alice/tasks/a"), task);
  for (const uid of ["admin", "super"]) {
    const db = env.authenticatedContext(uid).firestore();
    await assertSucceeds(getDocs(collection(db, "users")));
    await assertSucceeds(getDocs(collection(db, "userRoles")));
    await assertFails(getDoc(doc(db, "users/alice/tasks/a")));
    await assertFails(
      updateDoc(doc(db, "users/alice"), { displayName: "hijacked" }),
    );
    await assertFails(deleteDoc(doc(db, "users/alice")));
  }
  await assertFails(getDocs(collection(alice, "users")));
  await assertFails(getDocs(collection(alice, "userRoles")));
  await assertSucceeds(getDoc(doc(alice, "userRoles/alice")));
  await assertFails(getDoc(doc(alice, "userRoles/admin")));
  await assertFails(
    getDocs(collection(env.unauthenticatedContext().firestore(), "users")),
  );
});

test("Only super admins grant, change and remove roles; own role changes are denied", async () => {
  await seedAccess();
  const superDb = env.authenticatedContext("super").firestore();
  for (const uid of ["alice", "admin"]) {
    const db = env.authenticatedContext(uid).firestore();
    await assertFails(
      setDoc(doc(db, "userRoles/bob"), roleWrite("admin", uid)),
    );
    await assertFails(
      setDoc(doc(db, "userRoles", uid), roleWrite("super_admin", uid)),
    );
    await assertFails(deleteDoc(doc(db, "userRoles/admin")));
    await assertFails(
      setDoc(doc(db, "users", uid), {
        displayName: uid,
        photoURL: "",
        role: "super_admin",
      }),
    );
  }
  await assertSucceeds(
    setDoc(doc(superDb, "userRoles/alice"), roleWrite("admin", "super")),
  );
  await assertSucceeds(
    setDoc(doc(superDb, "userRoles/alice"), roleWrite("super_admin", "super")),
  );
  await assertSucceeds(deleteDoc(doc(superDb, "userRoles/alice")));
  await assertSucceeds(deleteDoc(doc(superDb, "userRoles/otherSuper")));
  await assertFails(
    setDoc(doc(superDb, "userRoles/super"), roleWrite("admin", "super")),
  );
  await assertFails(deleteDoc(doc(superDb, "userRoles/super")));
  await assertFails(
    setDoc(doc(superDb, "userRoles/bob"), roleWrite("owner", "super")),
  );
  await assertFails(
    setDoc(doc(superDb, "userRoles/bob"), roleWrite("admin", "alice")),
  );
  await assertFails(
    setDoc(doc(superDb, "userRoles/nonexistent"), roleWrite("admin", "super")),
  );
  await assertFails(
    setDoc(doc(superDb, "userRoles/bob"), {
      ...roleWrite("admin", "super"),
      extra: true,
    }),
  );
  await assertFails(
    setDoc(doc(superDb, "userRoles/bob"), {
      ...roleWrite("admin", "super"),
      updatedAt: 1,
    }),
  );
});

test("Profile email is owner-only and cannot be forged; legacy profiles still work", async () => {
  const db = env
    .authenticatedContext("alice", { email: "alice@example.test" })
    .firestore();
  await assertSucceeds(
    setDoc(doc(db, "users/alice"), { displayName: "Alice", photoURL: "" }),
  );
  await assertSucceeds(
    setDoc(doc(db, "users/alice"), {
      displayName: "Alice",
      photoURL: "",
      email: "alice@example.test",
    }),
  );
  await assertFails(
    updateDoc(doc(db, "users/alice"), { email: "admin@example.test" }),
  );
});

test("Users submit both feedback types; forged ownership, statuses and malformed content are denied", async () => {
  await seedAccess();
  const db = env.authenticatedContext("alice").firestore();
  await assertSucceeds(
    setDoc(doc(db, "feedback/report"), feedbackWrite("alice")),
  );
  await assertSucceeds(
    setDoc(
      doc(db, "feedback/suggestion"),
      feedbackWrite("alice", { type: "suggestion" }),
    ),
  );
  for (const extra of [
    { authorId: "bob" },
    { type: "other" },
    { status: "resolved" },
    { title: "" },
    { title: "a".repeat(121) },
    { message: "" },
    { message: "a".repeat(5001) },
    { createdAt: 0 },
    { updatedAt: 0 },
    { unexpected: true },
  ])
    await assertFails(
      setDoc(doc(db, "feedback/invalid"), feedbackWrite("alice", extra)),
    );
  await assertFails(
    setDoc(
      doc(env.unauthenticatedContext().firestore(), "feedback/anonymous"),
      feedbackWrite("alice"),
    ),
  );
});

test("Feedback is private to sender and staff, including list queries", async () => {
  await seedAccess();
  const db = env.authenticatedContext("alice").firestore();
  await setDoc(doc(db, "feedback/alice-report"), feedbackWrite("alice"));
  await assertSucceeds(getDoc(doc(db, "feedback/alice-report")));
  await assertSucceeds(
    getDocs(
      query(collection(db, "feedback"), where("authorId", "==", "alice")),
    ),
  );
  await assertFails(getDocs(collection(db, "feedback")));
  await assertFails(
    getDoc(
      doc(env.authenticatedContext("bob").firestore(), "feedback/alice-report"),
    ),
  );
  await assertFails(
    getDoc(
      doc(env.unauthenticatedContext().firestore(), "feedback/alice-report"),
    ),
  );
  for (const uid of ["admin", "super"]) {
    const staff = env.authenticatedContext(uid).firestore();
    await assertSucceeds(getDocs(collection(staff, "feedback")));
    await assertSucceeds(getDoc(doc(staff, "feedback/alice-report")));
  }
});

test("Staff can change status only; users cannot resolve or rewrite submissions", async () => {
  await seedAccess();
  const db = env.authenticatedContext("alice").firestore();
  await setDoc(doc(db, "feedback/report"), feedbackWrite("alice"));
  const statusWrite = (uid, status) => ({
    status,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  });
  await assertFails(
    updateDoc(doc(db, "feedback/report"), statusWrite("alice", "resolved")),
  );
  await assertFails(
    updateDoc(doc(db, "feedback/report"), { message: "rewritten" }),
  );
  for (const uid of ["admin", "super"]) {
    const staff = env.authenticatedContext(uid).firestore();
    await assertSucceeds(
      updateDoc(doc(staff, "feedback/report"), statusWrite(uid, "in_progress")),
    );
    await assertSucceeds(
      updateDoc(doc(staff, "feedback/report"), statusWrite(uid, "resolved")),
    );
    await assertFails(
      updateDoc(doc(staff, "feedback/report"), {
        ...statusWrite(uid, "open"),
        message: "tampered",
      }),
    );
    await assertFails(
      updateDoc(doc(staff, "feedback/report"), statusWrite(uid, "invalid")),
    );
    await assertFails(
      updateDoc(doc(staff, "feedback/report"), statusWrite("bob", "open")),
    );
    await assertFails(deleteDoc(doc(staff, "feedback/report")));
  }
  await assertSucceeds(deleteDoc(doc(db, "feedback/report")));
});

test("Revoking a staff role removes server access immediately", async () => {
  await seedAccess();
  const staff = env.authenticatedContext("admin").firestore();
  await assertSucceeds(getDocs(collection(staff, "users")));
  const superDb = env.authenticatedContext("super").firestore();
  await deleteDoc(doc(superDb, "userRoles/admin"));
  await assertFails(getDocs(collection(staff, "users")));
  await assertFails(getDocs(collection(staff, "feedback")));
});

import assert from "node:assert/strict";
import { buildProfilePayload } from "../src/profile.js";
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
  runTransaction,
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
  await env.withSecurityRulesDisabled(async (ctx) => {
    for (const [uid, name] of [
      ["alice", "Alice"],
      ["bob", "Bob"],
    ])
      await setDoc(doc(ctx.firestore(), "users", uid), {
        displayName: name,
        nameConfirmed: true,
        photoURL: "",
      });
  });
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
      await setDoc(doc(db, "users", uid), {
        displayName: uid,
        nameConfirmed: true,
        photoURL: "",
      });
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
    await assertSucceeds(
      getDocs(
        query(collection(db, "users"), where("nameConfirmed", "==", true)),
      ),
    );
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

test("Profiles require a chosen name and reject Google email/photo persistence", async () => {
  const db = env.authenticatedContext("alice").firestore();
  await assertSucceeds(
    setDoc(doc(db, "users/alice"), {
      displayName: "Quiet fern",
      nameConfirmed: true,
      photoURL: "",
    }),
  );
  await assertFails(
    updateDoc(doc(db, "users/alice"), { email: "alice@example.test" }),
  );
  await assertFails(
    updateDoc(doc(db, "users/alice"), {
      photoURL: "https://example.test/photo.jpg",
    }),
  );
  await assertFails(
    updateDoc(doc(db, "users/alice"), {
      photoURL: "http://lh3.googleusercontent.com/p",
    }),
  );
  await assertFails(
    updateDoc(doc(db, "users/alice"), {
      photoURL: "https://evil.com/.googleusercontent.com/p",
    }),
  );
  await assertSucceeds(
    updateDoc(doc(db, "users/alice"), {
      photoURL: "https://lh3.googleusercontent.com/a/p=s96-c",
    }),
  );
  await assertFails(
    updateDoc(doc(db, "users/alice"), { nameConfirmed: false }),
  );
  await assertFails(updateDoc(doc(db, "users/alice"), { displayName: "x" }));
  await assertFails(
    updateDoc(doc(db, "users/alice"), { displayName: "a".repeat(41) }),
  );
  await assertFails(
    updateDoc(doc(db, "users/alice"), { displayName: "email@example.test" }),
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
  await assertSucceeds(
    getDocs(
      query(collection(staff, "users"), where("nameConfirmed", "==", true)),
    ),
  );
  const superDb = env.authenticatedContext("super").firestore();
  await deleteDoc(doc(superDb, "userRoles/admin"));
  await assertFails(getDocs(collection(staff, "users")));
  await assertFails(getDocs(collection(staff, "feedback")));
});

test("Owner can atomically save a manual habit and private template", async () => {
  const db = env.authenticatedContext("alice").firestore();
  const template = {
    id: "a",
    name: task.name,
    category: task.category,
    weekdays: task.weekdays,
    levels: task.levels,
    description: "",
    published: false,
  };
  const batch = writeBatch(db);
  batch.set(doc(db, "users/alice/tasks/a"), task);
  batch.set(doc(db, "users/alice/templates/a"), template);
  await assertSucceeds(batch.commit());
  const other = env.authenticatedContext("bob").firestore();
  await assertFails(getDoc(doc(other, "users/alice/templates/a")));
});

test("If the generated template is invalid, the paired habit is not saved", async () => {
  const db = env.authenticatedContext("alice").firestore();
  const batch = writeBatch(db);
  batch.set(doc(db, "users/alice/tasks/a"), task);
  batch.set(doc(db, "users/alice/templates/a"), {
    ...task,
    published: false,
    category: "Invalid",
  });
  await assertFails(batch.commit());
  const habit = await getDoc(doc(db, "users/alice/tasks/a"));
  const template = await getDoc(doc(db, "users/alice/templates/a"));
  if (habit.exists() || template.exists())
    throw new Error("Atomic creation left a partial document");
});

test("Late completion writes tier wins atomically without changing an existing snapshot", async () => {
  const db = env.authenticatedContext("alice").firestore();
  await setDoc(doc(db, "users/alice/tasks/a"), task);
  const id = "2026-10-27_a";
  const p = {
    id,
    taskId: "a",
    date: "2026-10-27",
    scheduled: true,
    snapshot: encodeFirestore(exemplar),
    checks: {},
  };
  await setDoc(doc(db, "users/alice/progress", id), p);
  const checks = Object.fromEntries(
    exemplar.levels.flat().map((r) => [r.id, true]),
  );
  const late = {
    lateLoggedAt: Date.now(),
    lateRequirementsSource: "saved_session",
  };
  const batch = writeBatch(db);
  batch.update(doc(db, "users/alice/progress", id), { checks, ...late });
  for (const level of [1, 2, 3]) {
    const winId = `${id}_T${level}`;
    batch.set(doc(db, "users/alice/wins", winId), {
      id: winId,
      taskId: "a",
      date: p.date,
      level,
      ...late,
    });
  }
  await assertSucceeds(batch.commit());
  await assertFails(
    updateDoc(doc(db, "users/alice/progress", id), {
      snapshot: encodeFirestore({ ...exemplar, name: "Rewritten" }),
      ...late,
    }),
  );
  await assertFails(
    updateDoc(doc(db, "users/alice/progress", id), { lateLoggedAt: "invalid" }),
  );
  await assertFails(
    updateDoc(doc(db, "users/alice/progress", id), {
      lateRequirementsSource: "invented",
    }),
  );
  await assertFails(
    updateDoc(
      doc(
        env.authenticatedContext("bob").firestore(),
        "users/alice/progress",
        id,
      ),
      { checks, ...late },
    ),
  );
});

test("New late sessions accept validated metadata and cannot forge wins without checks", async () => {
  const db = env.authenticatedContext("alice").firestore();
  await setDoc(doc(db, "users/alice/tasks/a"), task);
  const id = "2026-10-27_a";
  const late = {
    lateLoggedAt: Date.now(),
    lateRequirementsSource: "saved_history",
  };
  await assertSucceeds(
    setDoc(doc(db, "users/alice/progress", id), {
      id,
      taskId: "a",
      date: "2026-10-27",
      scheduled: true,
      snapshot: encodeFirestore(exemplar),
      checks: {},
      ...late,
    }),
  );
  await assertFails(
    setDoc(doc(db, `users/alice/wins/${id}_T3`), {
      id: `${id}_T3`,
      taskId: "a",
      date: "2026-10-27",
      level: 3,
      ...late,
    }),
  );
});

test("Staff can read and list every app profile, including unchosen names; normal users cannot", async () => {
  await seedAccess();
  await env.withSecurityRulesDisabled(async (ctx) =>
    setDoc(doc(ctx.firestore(), "users/legacy"), {
      displayName: "Legacy Name",
      photoURL: "",
    }),
  );
  const staff = env.authenticatedContext("admin").firestore(),
    normal = env.authenticatedContext("alice").firestore();
  await assertSucceeds(getDoc(doc(staff, "users/legacy")));
  await assertSucceeds(getDocs(collection(staff, "users")));
  await assertFails(getDoc(doc(normal, "users/legacy")));
  await assertFails(getDocs(collection(normal, "users")));
});

test("Public authors must use their chosen name; adoption identifiers are private", async () => {
  const alice = env.authenticatedContext("alice").firestore(),
    bob = env.authenticatedContext("bob").firestore(),
    anon = env.unauthenticatedContext().firestore();
  await assertFails(
    setDoc(doc(alice, "templates/forged"), {
      ...publicTemplate,
      authorName: "Not Alice",
    }),
  );
  await setDoc(doc(alice, "templates/public"), publicTemplate);
  await setDoc(doc(bob, "templateUsages/public_bob"), {
    templateId: "public",
    userId: "bob",
  });
  await assertSucceeds(getDoc(doc(bob, "templateUsages/public_bob")));
  await assertFails(getDoc(doc(anon, "templateUsages/public_bob")));
  await assertFails(getDoc(doc(alice, "templateUsages/public_bob")));
  await assertFails(getDocs(collection(anon, "templateUsages")));
});

test("Feedback authors can update their chosen name but not its message or status", async () => {
  await seedAccess();
  const db = env.authenticatedContext("alice").firestore();
  await setDoc(doc(db, "feedback/name"), feedbackWrite("alice"));
  await updateDoc(doc(db, "users/alice"), { displayName: "Quiet fern" });
  await assertSucceeds(
    updateDoc(doc(db, "feedback/name"), {
      authorName: "Quiet fern",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(db, "feedback/name"), {
      authorName: "Impersonation",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(db, "feedback/name"), {
      message: "Changed",
      authorName: "Quiet fern",
      updatedAt: serverTimestamp(),
    }),
  );
});

test("An author can rename an orphaned legacy review but cannot rewrite its body", async () => {
  const db = env.authenticatedContext("alice").firestore();
  await env.withSecurityRulesDisabled(async (ctx) =>
    setDoc(doc(ctx.firestore(), "reviews/deleted_alice"), {
      templateId: "deleted",
      authorId: "alice",
      authorName: "Old Google Name",
      text: "Existing review",
      rating: 4,
      recommend: true,
      updatedAt: 1,
    }),
  );
  await assertSucceeds(
    updateDoc(doc(db, "reviews/deleted_alice"), {
      authorName: "Alice",
      updatedAt: 2,
    }),
  );
  await assertFails(
    updateDoc(doc(db, "reviews/deleted_alice"), {
      text: "Rewritten",
      authorName: "Alice",
      updatedAt: 3,
    }),
  );
});

test("Task-only levels support many ordered tasks and require every task for a win", async () => {
  const db = env.authenticatedContext("alice").firestore();
  const rows = [1, 2, 3].map((tier) =>
    Array.from({ length: 50 }, (_, i) => ({
      id: `task-${tier}-${i}`,
      label: `Complete step ${i + 1}`,
    })),
  );
  const large = encodeFirestore({
    ...task,
    name: "Daily routine",
    category: "Health",
    levels: rows,
  });
  await assertSucceeds(setDoc(doc(db, "users/alice/tasks/a"), large));
  await assertSucceeds(
    setDoc(doc(db, "users/alice/templates/a"), { ...large, published: false }),
  );
  await assertSucceeds(
    setDoc(doc(db, "templates/many"), {
      ...publicTemplate,
      category: "Health",
      levels: large.levels,
    }),
  );
  const id = "2026-10-27_a",
    p = {
      id,
      taskId: "a",
      date: "2026-10-27",
      scheduled: true,
      snapshot: {
        name: large.name,
        category: large.category,
        weekdays: large.weekdays,
        levels: large.levels,
      },
      checks: Object.fromEntries(rows[0].slice(0, -1).map((r) => [r.id, true])),
    };
  await assertSucceeds(setDoc(doc(db, "users/alice/progress", id), p));
  const win = (level) => ({
    id: `${id}_T${level}`,
    taskId: "a",
    date: p.date,
    level,
  });
  await assertFails(setDoc(doc(db, "users/alice/wins", `${id}_T1`), win(1)));
  const batch = writeBatch(db);
  batch.update(doc(db, "users/alice/progress", id), {
    checks: Object.fromEntries(rows[0].map((r) => [r.id, true])),
  });
  batch.set(doc(db, "users/alice/wins", `${id}_T1`), win(1));
  await assertSucceeds(batch.commit());
  await assertFails(setDoc(doc(db, "users/alice/wins", `${id}_T2`), win(2)));
});

test("Task-only schema rejects empty, nonstring, multiline and mismatched task lists", async () => {
  const db = env.authenticatedContext("alice").firestore();
  const good = { ids: ["one"], tasks: ["Read one page"] };
  for (const bad of [
    { ids: [], tasks: [] },
    { ids: ["one"], tasks: [""] },
    { ids: ["one"], tasks: ["   "] },
    { ids: ["one"], tasks: [12] },
    { ids: [12], tasks: ["Task"] },
    { ids: ["one"], tasks: [true] },
    { ids: ["one"], tasks: [{ label: "Task" }] },
    { ids: ["one"], tasks: ["a\nb"] },
    { ids: ["one"], tasks: ["x".repeat(161)] },
    { ids: ["one", "two"], tasks: ["Task"] },
  ])
    await assertFails(
      setDoc(doc(db, "users/alice/tasks/a"), {
        ...task,
        levels: {
          t1: bad,
          t2: { ids: ["two"], tasks: ["More"] },
          t3: { ids: ["three"], tasks: ["Stretch"] },
        },
      }),
    );
  await assertFails(
    setDoc(doc(db, "users/alice/tasks/a"), {
      ...task,
      levels: { t1: good, t2: good, t3: good },
    }),
  );
});

test("Editing a legacy blueprint can merge task text without changing old snapshots", async () => {
  const db = env.authenticatedContext("alice").firestore();
  await setDoc(doc(db, "users/alice/tasks/a"), task);
  const id = "2026-10-27_a",
    old = {
      id,
      taskId: "a",
      date: "2026-10-27",
      scheduled: true,
      snapshot: encodeFirestore(exemplar),
      checks: {},
    };
  await setDoc(doc(db, "users/alice/progress", id), old);
  const rows = exemplar.levels.map((tier) =>
    tier.map((r) => ({ id: r.id, label: `${r.amount} ${r.unit} ${r.label}` })),
  );
  await assertSucceeds(
    setDoc(
      doc(db, "users/alice/tasks/a"),
      encodeFirestore({ ...task, levels: rows }),
      { merge: true },
    ),
  );
  const saved = (await getDoc(doc(db, "users/alice/tasks/a"))).data();
  if (saved.levels.t1.tasks[0] !== "10 reps Push-ups")
    throw new Error("Legacy target was lost");
  const snapshot = (await getDoc(doc(db, "users/alice/progress", id))).data()
    .snapshot;
  if (JSON.stringify(snapshot) !== JSON.stringify(old.snapshot))
    throw new Error("Old snapshot was changed");
});

test("Profile join date is a server timestamp at creation and immutable afterward", async () => {
  const db = env.authenticatedContext("new-member").firestore();
  const reference = doc(db, "users/new-member");
  const profile = {
    displayName: "New member",
    nameConfirmed: true,
    photoURL: "",
  };
  await assertFails(setDoc(reference, { ...profile, createdAt: 1 }));
  await assertSucceeds(
    setDoc(reference, { ...profile, createdAt: serverTimestamp() }),
  );
  await assertSucceeds(updateDoc(reference, { displayName: "New nickname" }));
  await assertFails(updateDoc(reference, { createdAt: 1 }));
  await assertFails(setDoc(reference, profile));
  const legacy = env.authenticatedContext("alice").firestore();
  await assertFails(
    updateDoc(doc(legacy, "users/alice"), { createdAt: serverTimestamp() }),
  );
});

test("Profile setup replaces unsupported legacy fields and preserves join date and private habits", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users/alice"), {
      displayName: "Old provider name",
      nameConfirmed: false,
      photoURL: "",
      email: "legacy@example.test",
      legacyFlag: true,
      createdAt: serverTimestamp(),
    });
    await setDoc(doc(db, "users/alice/tasks/a"), task);
  });
  const db = env.authenticatedContext("alice").firestore();
  const reference = doc(db, "users/alice");
  const before = (await getDoc(reference)).data();
  await assertFails(
    setDoc(
      reference,
      {
        displayName: "Quiet fern",
        nameConfirmed: true,
        photoURL: "",
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ),
  );
  await assertSucceeds(
    runTransaction(db, async (transaction) => {
      const existing = await transaction.get(reference);
      transaction.set(
        reference,
        buildProfilePayload({
          name: "Quiet fern",
          photoURL: "",
          existing: existing.data(),
          timestamp: serverTimestamp(),
        }),
      );
    }),
  );
  const after = (await getDoc(reference)).data();
  assert.equal(after.displayName, "Quiet fern");
  assert.equal(Object.hasOwn(after, "email"), false);
  assert.equal(Object.hasOwn(after, "legacyFlag"), false);
  assert.equal(after.createdAt.toMillis(), before.createdAt.toMillis());
  assert.equal((await getDoc(doc(db, "users/alice/tasks/a"))).exists(), true);
});

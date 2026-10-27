import { test, before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, deleteDoc, writeBatch } from "firebase/firestore";
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
test("Owner can write private task; others and anonymous cannot read or write", async () => {
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
test("Snapshot cannot be rewritten after starting a task", async () => {
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

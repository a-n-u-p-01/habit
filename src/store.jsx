import { normalizeAppName, confirmedAppName } from "./profile";
import { preparePastCompletion } from "./history";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  deleteUser,
  reauthenticateWithPopup,
} from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
  runTransaction,
  getDocs,
  query,
  where,
  limit,
  serverTimestamp,
  orderBy,
  getDoc,
  getAggregateFromServer,
  count,
  average,
  startAfter,
  documentId,
  waitForPendingWrites,
  clearIndexedDbPersistence,
  terminate,
} from "firebase/firestore";
import { auth, db, google, legacyCacheStatus } from "./firebase";
import { encodeFirestore, decodeFirestore } from "./serialization";
import {
  achieved,
  progressId,
  dateKey,
  scheduled,
  completeNextLevel,
  sortHabits,
  applyHabitOrder,
} from "./domain";
const Context = createContext();
const GROUPS = [
  "tasks",
  "progress",
  "wins",
  "templates",
  "savedTemplates",
  "weeklyReviews",
];
const blank = () => Object.fromEntries(GROUPS.map((k) => [k, []]));
function loadGuest() {
  try {
    return {
      ...blank(),
      ...JSON.parse(localStorage.getItem("win-guest-v1") || "{}"),
    };
  } catch {
    return blank();
  }
}
const clean = (value) => JSON.parse(JSON.stringify(value));
export function AppProvider({ children }) {
  const [user, setUser] = useState(null),
    [authReady, setAuthReady] = useState(false),
    [data, setData] = useState(blank),
    [guest, setGuestState] = useState(loadGuest),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [online, setOnline] = useState(navigator.onLine),
    [pending, setPending] = useState(false);
  const [dataOwner, setDataOwner] = useState(null);
  const [profileState, setProfileState] = useState({
    uid: null,
    ready: false,
    value: null,
    error: "",
  });
  const [oldCacheCleared, setOldCacheCleared] = useState(null);
  useEffect(() => {
    legacyCacheStatus.then(setOldCacheCleared);
  }, []);
  const profileMatches = profileState.uid === user?.uid;
  const profileReady = !user || (profileMatches && profileState.ready);
  const appName = profileMatches ? confirmedAppName(profileState.value) : "";
  const googlePhoto = (value) =>
    typeof value === "string" &&
    value.length <= 2000 &&
    /^https:\/\/[A-Za-z0-9.-]+\.googleusercontent\.com\//.test(value)
      ? value
      : "";
  const providerPhoto = googlePhoto(user?.photoURL);
  const displayUser = user
    ? {
        uid: user.uid,
        displayName: appName || "App user",
        photoURL: profileMatches
          ? googlePhoto(profileState.value?.photoURL)
          : "",
        nameConfirmed: !!appName,
      }
    : null;
  useEffect(() => {
    if (
      !user ||
      !appName ||
      !online ||
      profileState.value?.photoURL === providerPhoto
    )
      return;
    setDoc(
      doc(db, "users", user.uid),
      {
        displayName: appName,
        nameConfirmed: true,
        photoURL: providerPhoto,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ).catch(() => {});
  }, [user?.uid, appName, providerPhoto, profileState.value?.photoURL, online]);
  useEffect(() => {
    if (!user || !pending) return;
    const warnBeforeClose = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeClose);
    return () => window.removeEventListener("beforeunload", warnBeforeClose);
  }, [user?.uid, pending]);
  const [theme, setThemeState] = useState(
    () => localStorage.getItem("win-theme") || "dark",
  );
  const guestRef = useRef(guest);
  function setGuest(update) {
    const next =
      typeof update === "function" ? update(guestRef.current) : update;
    localStorage.setItem("win-guest-v1", JSON.stringify(next));
    guestRef.current = next;
    setGuestState(next);
  }
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
    };
    apply();
    media.addEventListener("change", apply);
    localStorage.setItem("win-theme", theme);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setData(blank());
        setDataOwner(null);
        setPending(false);
        setLoading(!!u);
        setProfileState({
          uid: u?.uid || null,
          ready: !u,
          value: null,
          error: "",
        });
        setError("");
        setNotice("");
        setUser(u);
        setAuthReady(true);
      }),
    [],
  );
  useEffect(() => {
    getRedirectResult(auth).catch((e) => setError(e.message));
    const yes = () => setOnline(true),
      no = () => setOnline(false);
    window.addEventListener("online", yes);
    window.addEventListener("offline", no);
    return () => {
      window.removeEventListener("online", yes);
      window.removeEventListener("offline", no);
    };
  }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    const owner = user.uid;
    const unsubscribe = onSnapshot(
      doc(db, "users", owner),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!active || auth.currentUser?.uid !== owner) return;
        // A chosen identity is only adopted after the server acknowledges it.
        // Otherwise a fast reload could discard a memory-only pending name.
        if (snapshot.metadata.hasPendingWrites) return;
        setProfileState({
          uid: owner,
          ready: snapshot.exists() || !snapshot.metadata.fromCache,
          value: snapshot.exists() ? snapshot.data() : null,
          error: "",
        });
      },
      (e) => {
        if (active && auth.currentUser?.uid === owner)
          setProfileState({
            uid: owner,
            ready: true,
            value: null,
            error: `Your private profile could not load: ${e.message}`,
          });
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user?.uid]);
  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setData(blank());
      setLoading(false);
      setPending(false);
      return;
    }
    let active = true;
    const owner = user.uid;
    setLoading(true);
    setDataOwner(owner);
    setError("");
    const ready = new Set(),
      pendingGroups = new Set();
    const unsub = GROUPS.map((group) =>
      onSnapshot(
        collection(db, "users", user.uid, group),
        { includeMetadataChanges: true },
        (snap) => {
          if (!active || auth.currentUser?.uid !== owner) return;
          ready.add(group);
          if (snap.metadata.hasPendingWrites) pendingGroups.add(group);
          else pendingGroups.delete(group);
          setPending(pendingGroups.size > 0);
          setData((d) => ({
            ...d,
            [group]: snap.docs.map((d) => ({
              ...decodeFirestore(d.data()),
              id: d.id,
            })),
          }));
          if (ready.size === GROUPS.length) setLoading(false);
        },
        (e) => {
          if (!active || auth.currentUser?.uid !== owner) return;
          setError(
            `Cloud data: ${e.message} Check the deployed Firestore rules.`,
          );
          setLoading(false);
        },
      ),
    );
    return () => {
      active = false;
      unsub.forEach((fn) => fn());
    };
  }, [user, authReady]);
  const [orderOverride, setOrderOverride] = useState(null);
  const [reordering, setReordering] = useState(false);
  const raw = user ? (dataOwner === user.uid ? data : blank()) : guest;
  const ownerKey = user?.uid || "guest";
  const override = orderOverride?.owner === ownerKey ? orderOverride.ids : null;
  const ranks = override && new Map(override.map((id, index) => [id, index]));
  const current = {
    ...raw,
    tasks: sortHabits(
      ranks
        ? raw.tasks.map((h) =>
            ranks.has(h.id) ? { ...h, orderIndex: ranks.get(h.id) } : h,
          )
        : raw.tasks,
    ),
  };
  async function reorderHabits(ids) {
    if (reordering) return;
    const source = user ? current.tasks : guestRef.current.tasks;
    const next = applyHabitOrder(source, ids);
    if (!user) {
      setGuest((d) => ({ ...d, tasks: applyHabitOrder(d.tasks, ids) }));
      return;
    }
    if (ids.length > 450)
      throw new Error(
        "Reordering supports up to 450 habits in one atomic save.",
      );
    const owner = user.uid;
    const change = { owner, ids };
    setOrderOverride(change);
    setReordering(true);
    const batch = writeBatch(db);
    next
      .filter((h) => !h.deletedDay)
      .forEach((h) =>
        batch.update(doc(db, "users", owner, "tasks", h.id), {
          orderIndex: h.orderIndex,
          updatedAt: serverTimestamp(),
        }),
      );
    const clear = () =>
      setOrderOverride((previous) => (previous === change ? null : previous));
    const commit = batch.commit();
    if (!online) {
      commit.then(clear).catch((e) => {
        clear();
        setError(`Habit order could not sync: ${e.message}`);
      });
      setNotice(
        "Habit order saved on this device. It will sync when you reconnect.",
      );
      setReordering(false);
      return;
    }
    try {
      await commit;
      clear();
    } catch (e) {
      clear();
      setError(`Habit order was not saved: ${e.message}`);
      throw e;
    } finally {
      setReordering(false);
    }
  }
  function fail(e) {
    setError(e?.message || String(e));
    throw e;
  }
  async function persist(group, id, payload, remove = false) {
    const value = clean({ ...payload, id });
    if (group === "tasks" && !remove) {
      const existing = (user ? current.tasks : guestRef.current.tasks).find(
        (h) => h.id === id,
      );
      const greatest = Math.max(
        -1,
        ...current.tasks.map((h) =>
          Number.isFinite(h.orderIndex) ? h.orderIndex : -1,
        ),
      );
      if (Number.isFinite(existing?.orderIndex))
        value.orderIndex = existing.orderIndex;
      else if (!existing && !Number.isFinite(value.orderIndex))
        value.orderIndex = greatest + 1;
    }
    if (!user) {
      setGuest((d) => ({
        ...d,
        [group]: remove
          ? d[group].filter((x) => x.id !== id)
          : [...d[group].filter((x) => x.id !== id), value],
      }));
      return;
    }
    const ref = doc(db, "users", user.uid, group, id);
    const promise = remove
      ? deleteDoc(ref)
      : setDoc(
          ref,
          { ...encodeFirestore(value), updatedAt: serverTimestamp() },
          { merge: true },
        );
    if (!online) {
      promise.catch((e) => setError(e.message));
      setNotice("Saved on this device. Sync resumes when you reconnect.");
      return;
    }
    try {
      await promise;
    } catch (e) {
      fail(e);
    }
  }
  // One guest-state update or one Firestore batch: never save only half the pair.
  async function createHabitWithTemplate(id, payload) {
    const tasks = user ? current.tasks : guestRef.current.tasks;
    const existing = tasks.find((t) => t.id === id);
    const orderIndex = Number.isFinite(existing?.orderIndex)
      ? existing.orderIndex
      : Math.max(
          -1,
          ...tasks.map((t) =>
            Number.isFinite(t.orderIndex) ? t.orderIndex : -1,
          ),
        ) + 1;
    const task = clean({ ...payload, id, orderIndex });
    const template = clean({
      id,
      name: task.name,
      description: task.description || "",
      category: task.category,
      weekdays: task.weekdays,
      levels: task.levels,
      published: false,
    });
    if (!user) {
      setGuest((data) => ({
        ...data,
        tasks: [...data.tasks.filter((t) => t.id !== id), task],
        templates: [...data.templates.filter((t) => t.id !== id), template],
      }));
      return;
    }
    const batch = writeBatch(db);
    batch.set(doc(db, "users", user.uid, "tasks", id), {
      ...encodeFirestore(task),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, "users", user.uid, "templates", id), {
      ...encodeFirestore(template),
      updatedAt: serverTimestamp(),
    });
    const commit = batch.commit();
    if (!online) {
      commit.catch((e) =>
        setError(`Habit and template could not sync: ${e.message}`),
      );
      return;
    }
    try {
      await commit;
    } catch (e) {
      fail(e);
    }
  }
  async function saveProfileName(input) {
    if (!user) throw new Error("Sign in to choose an app name.");
    if (!online) throw new Error("Reconnect to save your app name.");
    const name = normalizeAppName(input),
      owner = user.uid;
    await runTransaction(db, async (transaction) => {
      const reference = doc(db, "users", owner);
      const existing = await transaction.get(reference);
      transaction.set(
        reference,
        {
          displayName: name,
          nameConfirmed: true,
          photoURL: providerPhoto,
          updatedAt: serverTimestamp(),
          ...(!existing.exists() ? { createdAt: serverTimestamp() } : {}),
        },
        { merge: true },
      );
    });
    // These are only the user's own existing records, never other people's
    // saved copies. Batch size and cursor keep large accounts bounded.
    let contentUpdated = true;
    for (const group of ["templates", "reviews", "feedback"]) {
      try {
        let cursor = null;
        while (true) {
          const constraints = [
            where("authorId", "==", owner),
            orderBy(documentId()),
            limit(200),
          ];
          if (cursor) constraints.push(startAfter(cursor));
          const page = await getDocs(
            query(collection(db, group), ...constraints),
          );
          const batch = writeBatch(db);
          for (const row of page.docs)
            if (row.data().authorName !== name)
              batch.update(
                row.ref,
                group === "feedback"
                  ? { authorName: name, updatedAt: serverTimestamp() }
                  : { authorName: name, updatedAt: Date.now() },
              );
          await batch.commit();
          if (page.size < 200) break;
          cursor = page.docs[page.docs.length - 1];
        }
      } catch {
        contentUpdated = false;
      }
    }
    return { contentUpdated, name };
  }
  async function removeLegacyCache() {
    if (!online) {
      setError("Reconnect and sync before removing any older offline cache.");
      return;
    }
    if (
      !window.confirm(
        "Remove the older offline cloud cache from this browser? Any unsynced work left by an older app version will be lost. Sync and close older app tabs first. Device-only guest data is not removed. This cannot be undone.",
      )
    )
      return;
    await waitForPendingWrites(db);
    await terminate(db);
    try {
      await clearIndexedDbPersistence(db);
    } catch {
      window.alert(
        "The old cache was not removed. Close other app tabs and retry after syncing their changes.",
      );
    } finally {
      window.location.reload();
    }
  }
  async function logout() {
    try {
      if (pending && !online)
        throw new Error(
          "Reconnect and let your pending changes sync before signing out.",
        );
      if (online) await waitForPendingWrites(db);
      await signOut(auth);
      // A fresh document discards the previous account's in-memory cloud cache.
      window.location.replace("/");
    } catch (e) {
      setError(e.message);
    }
  }
  async function login(redirect = false) {
    setError("");
    try {
      if (redirect) await signInWithRedirect(auth, google);
      else await signInWithPopup(auth, google);
    } catch (e) {
      setError(`Google sign-in: ${e.message}`);
    }
  }
  async function begin(task, key = dateKey()) {
    const id = progressId(task.id, key);
    const existing = current.progress.find((p) => p.id === id);
    if (existing) return existing;
    const value = clean({
      id,
      taskId: task.id,
      date: key,
      scheduled: scheduled(task, key),
      checks: {},
      snapshot: {
        name: task.name,
        category: task.category,
        levels: task.levels,
        weekdays: task.weekdays,
      },
      createdAt: Date.now(),
    });
    if (!user) {
      await persist("progress", id, value);
      return value;
    }
    try {
      return await runTransaction(db, async (tx) => {
        const ref = doc(db, "users", user.uid, "progress", id);
        const snap = await tx.get(ref);
        if (snap.exists()) return { ...decodeFirestore(snap.data()), id };
        tx.set(ref, encodeFirestore(value));
        return value;
      });
    } catch (e) {
      fail(e);
    }
  }
  async function check(p, requirementId) {
    const checks = { ...p.checks, [requirementId]: true };
    const next = { ...p, checks };
    const before = achieved(p),
      level = achieved(next);
    if (!user) {
      setGuest((d) => ({
        ...d,
        progress: [...d.progress.filter((x) => x.id !== p.id), next],
        wins:
          level > before
            ? [
                ...d.wins.filter((w) => w.id !== `${p.id}_T${level}`),
                {
                  id: `${p.id}_T${level}`,
                  taskId: p.taskId,
                  date: p.date,
                  level,
                },
              ]
            : d.wins,
      }));
      return next;
    }
    const batch = writeBatch(db);
    batch.set(
      doc(db, "users", user.uid, "progress", p.id),
      { checks: { [requirementId]: true }, updatedAt: serverTimestamp() },
      { merge: true },
    );
    if (level > before)
      batch.set(
        doc(db, "users", user.uid, "wins", `${p.id}_T${level}`),
        {
          id: `${p.id}_T${level}`,
          taskId: p.taskId,
          date: p.date,
          level,
          wonAt: serverTimestamp(),
        },
        { merge: true },
      );
    const promise = batch.commit();
    if (!online) {
      promise.catch((e) => setError(e.message));
      return next;
    }
    try {
      await promise;
      return next;
    } catch (e) {
      fail(e);
    }
  }
  async function winLevel(task, target, key = dateKey()) {
    const p =
      (!user &&
        guestRef.current.progress.find(
          (row) => row.id === progressId(task.id, key),
        )) ||
      (await begin(task, key));
    const next = completeNextLevel(p, target);
    if (next === p) return p;
    const id = `${p.id}_T${target}`;
    if (!user) {
      let result = next;
      setGuest((d) => {
        const latest = d.progress.find((row) => row.id === p.id) || p;
        result = completeNextLevel(latest, target);
        if (result === latest) return d;
        return {
          ...d,
          progress: [...d.progress.filter((row) => row.id !== p.id), result],
          wins: [
            ...d.wins.filter((w) => w.id !== id),
            { id, taskId: p.taskId, date: p.date, level: target },
          ],
        };
      });
      return result;
    }
    const checks = Object.fromEntries(
      p.snapshot.levels[target - 1].map((r) => [r.id, true]),
    );
    const batch = writeBatch(db);
    batch.set(
      doc(db, "users", user.uid, "progress", p.id),
      { checks, updatedAt: serverTimestamp() },
      { merge: true },
    );
    batch.set(
      doc(db, "users", user.uid, "wins", id),
      {
        id,
        taskId: p.taskId,
        date: p.date,
        level: target,
        wonAt: serverTimestamp(),
      },
      { merge: true },
    );
    const commit = batch.commit();
    if (!online) {
      commit.catch((e) => setError(`Offline win could not sync: ${e.message}`));
      return next;
    }
    try {
      await commit;
      return next;
    } catch (e) {
      fail(e);
    }
  }
  async function logPastCompletion(taskId, key, target, confirmation) {
    if (!user) {
      const data = guestRef.current;
      const task = data.tasks.find((row) => row.id === taskId);
      const stored = data.progress.find(
        (row) => row.id === progressId(taskId, key),
      );
      const result = preparePastCompletion(
        task,
        stored,
        key,
        target,
        confirmation,
      );
      if (result.changed)
        setGuest((data) => ({
          ...data,
          progress: [
            ...data.progress.filter((row) => row.id !== result.progress.id),
            result.progress,
          ],
          wins: [
            ...data.wins.filter(
              (row) => !result.wins.some((win) => win.id === row.id),
            ),
            ...result.wins,
          ],
        }));
      return result.progress;
    }
    if (!online)
      throw new Error("Reconnect to save a correction to your cloud account.");
    // Read the task and session together so another device cannot overwrite
    // the requirements or checks after the user has reviewed the date.
    return runTransaction(db, async (tx) => {
      const taskRef = doc(db, "users", user.uid, "tasks", taskId);
      const progressRef = doc(
        db,
        "users",
        user.uid,
        "progress",
        progressId(taskId, key),
      );
      const [taskDoc, progressDoc] = await Promise.all([
        tx.get(taskRef),
        tx.get(progressRef),
      ]);
      if (!taskDoc.exists())
        throw new Error("This habit is no longer available.");
      const task = { ...decodeFirestore(taskDoc.data()), id: taskId };
      const stored = progressDoc.exists()
        ? { ...decodeFirestore(progressDoc.data()), id: progressDoc.id }
        : null;
      const result = preparePastCompletion(
        task,
        stored,
        key,
        target,
        confirmation,
      );
      if (!result.changed) return result.progress;
      if (stored)
        tx.update(progressRef, {
          checks: result.progress.checks,
          lateLoggedAt: result.progress.lateLoggedAt,
          lateRequirementsSource: result.progress.lateRequirementsSource,
          updatedAt: serverTimestamp(),
        });
      else
        tx.set(progressRef, {
          ...encodeFirestore(result.progress),
          updatedAt: serverTimestamp(),
        });
      for (const win of result.wins)
        tx.set(doc(db, "users", user.uid, "wins", win.id), {
          ...win,
          wonAt: serverTimestamp(),
        });
      return result.progress;
    });
  }
  async function publish(template) {
    if (!user || !appName)
      throw Error("Choose your app name before publishing a template.");
    if (!online) throw Error("Reconnect to publish.");
    const ref = doc(db, "templates", template.id);
    const value = clean({
      name: template.name,
      description: template.description || "",
      category: template.category,
      levels: template.levels,
      weekdays: template.weekdays,
      authorId: user.uid,
      authorName: appName,
      published: true,
      updatedAt: Date.now(),
    });
    await setDoc(ref, encodeFirestore(value));
    await persist("templates", template.id, { ...template, published: true });
    setNotice("Your template is now public.");
  }
  async function unpublish(template) {
    if (!user) return;
    await deleteDoc(doc(db, "templates", template.id));
    await persist("templates", template.id, { ...template, published: false });
    setNotice(
      "Template unpublished. Existing copies remain with their owners.",
    );
  }
  async function importGuest() {
    if (!user || !online) throw Error("Sign in and reconnect to import.");
    for (const group of GROUPS) {
      for (let i = 0; i < guest[group].length; i += 10) {
        const batch = writeBatch(db);
        for (const item of guest[group].slice(i, i + 10)) {
          const existing = current[group].some((x) => x.id === item.id);
          if (!existing)
            batch.set(
              doc(db, "users", user.uid, group, item.id),
              encodeFirestore(clean(item)),
            );
        }
        await batch.commit();
      }
    }
    setGuest(blank());
    setNotice("Device data imported.");
  }
  async function exportData() {
    const source = user
      ? Object.fromEntries(
          await Promise.all(
            GROUPS.map(async (g) => [
              g,
              (await getDocs(collection(db, "users", user.uid, g))).docs.map(
                (d) => d.data(),
              ),
            ]),
          ),
        )
      : guest;
    return {
      exportedAt: new Date().toISOString(),
      version: 1,
      profile: user ? { name: appName, uid: user.uid } : null,
      data: source,
    };
  }
  async function erase() {
    if (!user) {
      setGuest(blank());
      return;
    }
    if (!online) throw Error("Reconnect to delete your cloud data.");
    await reauthenticateWithPopup(user, google);
    const uid = user.uid;
    const owned = await getDocs(
      query(collection(db, "templates"), where("authorId", "==", uid)),
    );
    for (const t of owned.docs) await deleteDoc(t.ref);
    const reviews = await getDocs(
      query(collection(db, "reviews"), where("authorId", "==", uid)),
    );
    for (const r of reviews.docs) await deleteDoc(r.ref);
    const usages = await getDocs(
      query(collection(db, "templateUsages"), where("userId", "==", uid)),
    );
    for (const r of usages.docs) await deleteDoc(r.ref);
    for (const g of GROUPS) {
      const rows = await getDocs(collection(db, "users", uid, g));
      for (let i = 0; i < rows.docs.length; i += 200) {
        const b = writeBatch(db);
        rows.docs.slice(i, i + 200).forEach((d) => b.delete(d.ref));
        await b.commit();
      }
    }
    const feedback = await getDocs(
      query(collection(db, "feedback"), where("authorId", "==", uid)),
    );
    for (let i = 0; i < feedback.docs.length; i += 200) {
      const batch = writeBatch(db);
      feedback.docs.slice(i, i + 200).forEach((row) => batch.delete(row.ref));
      await batch.commit();
    }
    await deleteDoc(doc(db, "users", uid));
    await deleteUser(user);
    setNotice("Account and app data deleted.");
  }
  return (
    <Context.Provider
      value={{
        ...current,
        user: displayUser,
        profileReady,
        profileError: profileMatches ? profileState.error : "",
        oldCacheCleared,
        removeLegacyCache,
        saveProfileName,
        authReady,
        loading,
        error,
        setError,
        notice,
        setNotice,
        online,
        pending,
        theme,
        setTheme: setThemeState,
        persist,
        createHabitWithTemplate,
        login,
        logout,
        begin,
        check,
        winLevel,
        logPastCompletion,
        reorderHabits,
        reordering,
        publish,
        unpublish,
        importGuest,
        guestCount: GROUPS.reduce((n, k) => n + guest[k].length, 0),
        exportData,
        erase,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useApp = () => useContext(Context);
export function usePublicTemplates() {
  const [templates, setTemplates] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(
    () =>
      onSnapshot(
        query(
          collection(db, "templates"),
          orderBy("updatedAt", "desc"),
          limit(100),
        ),
        (snap) => {
          setTemplates(
            snap.docs.map((d) => ({ ...decodeFirestore(d.data()), id: d.id })),
          );
          setLoading(false);
        },
        (e) => {
          setError(e.message);
          setLoading(false);
        },
      ),
    [],
  );
  return { templates, error, loading };
}
export async function templateStats(id) {
  const reviews = await getAggregateFromServer(
    query(collection(db, "reviews"), where("templateId", "==", id)),
    { rating: average("rating"), reviews: count() },
  );
  return reviews.data();
}
export async function reviewTemplate(
  templateId,
  user,
  rating,
  text,
  recommend,
) {
  if (!user?.nameConfirmed)
    throw Error("Choose your app name before leaving a review.");
  await setDoc(doc(db, "reviews", `${templateId}_${user.uid}`), {
    templateId,
    authorId: user.uid,
    authorName: user.displayName,
    rating,
    text,
    recommend,
    updatedAt: Date.now(),
  });
}
export function listenReviews(templateId, cb, onError) {
  return onSnapshot(
    query(
      collection(db, "reviews"),
      where("templateId", "==", templateId),
      limit(100),
    ),
    (s) => cb(s.docs.map((d) => ({ ...decodeFirestore(d.data()), id: d.id }))),
    onError,
  );
}
// Adopting a habit does not publish or collect a person's usage identifier.
export async function recordUsage() {}
export async function loadPublicTemplate(id) {
  const snapshot = await getDoc(doc(db, "templates", id));
  return snapshot.exists() ? { ...decodeFirestore(snapshot.data()), id } : null;
}

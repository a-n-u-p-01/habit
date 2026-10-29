import React, { createContext, useContext, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { useApp } from "./store";

const AccessContext = createContext(null);
export { ROLE_LABELS } from "./access-labels.js";
import { ROLE_LABELS } from "./access-labels.js";

export function AccessProvider({ children }) {
  const { user, authReady } = useApp();
  const [state, setState] = useState({
    uid: null,
    role: "user",
    ready: false,
    error: "",
  });
  useEffect(() => {
    if (!user) {
      setState({ uid: null, role: "user", ready: true, error: "" });
      return;
    }
    setState({ uid: user.uid, role: "user", ready: false, error: "" });
    return onSnapshot(
      doc(db, "userRoles", user.uid),
      (snapshot) => {
        const value = snapshot.data()?.role;
        setState({
          uid: user.uid,
          role: Object.hasOwn(ROLE_LABELS, value) ? value : "user",
          ready: true,
          error: "",
        });
      },
      () =>
        setState({
          uid: user.uid,
          role: "user",
          ready: true,
          error:
            "Unable to verify permissions. Reconnect or check the deployed Firestore rules.",
        }),
    );
  }, [user?.uid]);
  // Never carry a previous account's privileges across an account change.
  const current = state.uid === (user?.uid || null);
  const role = current ? state.role : "user";
  const ready = authReady && current && state.ready;
  return (
    <AccessContext.Provider
      value={{
        role,
        ready,
        error: current ? state.error : "",
        isStaff: ready && ["admin", "super_admin"].includes(role),
        isSuperAdmin: ready && role === "super_admin",
      }}
    >
      {children}
    </AccessContext.Provider>
  );
}
export const useAccess = () => useContext(AccessContext);

export function StaffOnly({ children }) {
  const { user, login } = useApp();
  const access = useAccess();
  if (!access.ready) return <p role="status">Checking permissions…</p>;
  if (!user)
    return (
      <section className="panel form-section">
        <h1>Sign in required</h1>
        <p>Only admins and super admins can access this page.</p>
        <button className="button" onClick={() => login()}>
          Continue with Google
        </button>
      </section>
    );
  if (!access.isStaff)
    return (
      <section className="panel form-section">
        <h1>Access restricted</h1>
        <p role={access.error ? "alert" : undefined}>
          {access.error || "Only admins and super admins can access this page."}
        </p>
      </section>
    );
  return children;
}

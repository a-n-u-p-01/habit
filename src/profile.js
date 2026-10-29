export function normalizeAppName(value) {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f-\u009f]/.test(value))
    throw new Error("Choose a name without control characters.");
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 40)
    throw new Error("Choose an app name between 2 and 40 characters.");
  if (name.includes("@"))
    throw new Error("Use a nickname, not an email address.");
  return name;
}
export function confirmedAppName(profile) {
  if (profile?.nameConfirmed !== true) return "";
  try {
    return normalizeAppName(profile.displayName);
  } catch {
    return "";
  }
}

// Replace the app profile with its supported schema; never spread legacy provider data.
export function buildProfilePayload({ name, photoURL, existing, timestamp }) {
  const safePhoto =
    typeof photoURL === "string" &&
    photoURL.length <= 2000 &&
    /^https:\/\/[A-Za-z0-9.-]+\.googleusercontent\.com\//.test(photoURL)
      ? photoURL
      : "";
  return {
    displayName: normalizeAppName(name),
    nameConfirmed: true,
    photoURL: safePhoto,
    updatedAt: timestamp,
    ...(!existing
      ? { createdAt: timestamp }
      : Object.hasOwn(existing, "createdAt")
        ? { createdAt: existing.createdAt }
        : {}),
  };
}
export function profileSaveMessage(error) {
  const code = error?.code?.split("/").at(-1);
  if (code === "permission-denied")
    return "Your app name couldn’t be saved. Account setup is blocked by the app’s access settings.";
  if (["unavailable", "deadline-exceeded"].includes(code))
    return "Couldn’t connect to save your name. Check your connection and try again.";
  if (code === "unauthenticated")
    return "Your sign-in has expired. Sign out and sign in again.";
  return error?.message || "Your app name couldn’t be saved. Please try again.";
}

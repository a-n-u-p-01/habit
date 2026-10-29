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

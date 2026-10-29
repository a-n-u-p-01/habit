// Keep private screens gated until the current account is verified.
export function startupPhase({
  authReady,
  user,
  profileReady,
  profileError,
  online,
}) {
  if (!authReady) return "loading";
  if (!user) return "ready";
  if (profileError) return "error";
  if (!profileReady) return online === false ? "offline" : "loading";
  return user.nameConfirmed ? "ready" : "name-setup";
}

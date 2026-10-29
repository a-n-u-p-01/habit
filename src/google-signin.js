export async function googleSignIn({ popup, redirect }) {
  try {
    const result = await popup();
    return { status: "signed-in", user: result.user };
  } catch (error) {
    if (
      ["auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(
        error.code,
      )
    )
      return { status: "cancelled" };
    if (
      [
        "auth/popup-blocked",
        "auth/operation-not-supported-in-this-environment",
      ].includes(error.code)
    ) {
      await redirect();
      return { status: "redirecting" };
    }
    throw error;
  }
}
export function googleSignInMessage(code) {
  if (code === "auth/network-request-failed")
    return "Couldn’t connect to Google. Check your connection and try again.";
  if (code === "auth/unauthorized-domain")
    return "Google sign-in isn’t available on this site.";
  if (code === "auth/operation-not-allowed")
    return "Google sign-in is currently unavailable.";
  if (code === "auth/operation-not-supported-in-this-environment")
    return "Google sign-in isn’t available in this browser.";
  return "Couldn’t sign in with Google. Please try again.";
}

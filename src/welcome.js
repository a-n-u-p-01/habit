export const WELCOME_COMPLETE_KEY = "win-onboarded";
export const WELCOME_SIGNIN_KEY = "win-welcome-signin";
export const WELCOME_STEPS = ["Habits", "Your minimum", "Get started"];
export function initialWelcomeStep(session) {
  return session.getItem(WELCOME_SIGNIN_KEY) === "1" ? 2 : 0;
}
export function completeWelcome(persistent, session) {
  persistent.setItem(WELCOME_COMPLETE_KEY, "1");
  session.removeItem(WELCOME_SIGNIN_KEY);
}

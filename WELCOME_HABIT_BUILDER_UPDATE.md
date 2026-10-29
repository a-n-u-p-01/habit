# Welcome: habit builder and simpler entry

Replaced the four long intro pages with three concise steps:
1. Build a routine: choose habits, set a schedule, record progress.
2. Understand the minimum: a concrete reading example makes T1 mandatory and T2/T3 optional extra tasks clear.
3. Get started: one Continue with Google button with the multicolor Google icon, plus one Continue without an account action.

The first screen now identifies Win Today as a habit builder and uses Build discipline. One habit at a time. The existing landscape image is retained with revised typography and a compact mobile hero. Desktop uses a balanced split layout; phones use a short image header and readable stacked content. Browser/PWA descriptions now match the habit-building purpose.

Removed: Use redirect sign-in instead, Firebase project setup instructions, Skip for now, duplicate Start on this device action, and the misleading demo claim that the user had already earned a tier. There is no duplicate guest action. Already signed-in users get Go to Today instead of a guest action that would not actually sign them out.

Google entry points elsewhere in the app also use the same Google icon. Sign-in uses the usual popup; a blocked/unsupported popup falls back to redirect through the same button, with no technical choice presented to the user. Closing the popup does not force a redirect. A tab-scoped pending marker resumes the final step after redirect and completes onboarding after successful sign-in; normal profile/name verification still applies. First-run completion uses replacement navigation and the existing completion flag. Guest data remains browser-only unless later imported.

Validation: all 94 unit tests passed, including nine welcome/sign-in helper tests for step/completion flags, popup success, fallback, cancellation, failure propagation and UI copy/action uniqueness. Local-module JSX/CSS checks passed with third-party imports external. Isolated Chromium CSS fixtures passed for all three steps at 280/320/390/600/760/1024/1440px in both themes, including touch-sized actions and Google-button hover contrast. The actual provided landscape was used for visual spot checks. tests/welcome-browser.mjs adds guest navigation, icon, offline and completion-persistence scenarios (npm run test:welcome); it does not attempt a real Google login. Full React/Vite and real Google OAuth/redirect workflows remain unverified due the earlier dependency-download restrictions.

All previous updates are included. No live deployment or stored habit-data changes were performed.

# Loading and refresh states

The previous profile gate showed a large account-style card (Opening your corner / chosen app identity / Sign out) during normal refresh. That pending state is now a compact, neutral Win Today loading indicator with no account actions.

Included:
- A themed pre-React first paint in index.html instead of an empty root.
- The same quiet loading style while auth/current profile checks are pending.
- Skeleton placeholders inside the existing app shell while initial account data loads.
- A delayed Try again option after 12 seconds of unusually slow loading; no forced delay or fabricated progress percentage.
- Separate genuine offline and profile-error recovery screens. Sign out is only offered on the error screen, not normal loading or offline startup.
- Initial bundle/dependency load failures replace the bootstrap spinner with a Reload action.
- Reduced-motion support and consistent loading treatment for access checks and template details.

Authentication/profile verification and name-setup gates are preserved. No private data is shown before the current account is ready. No new profile cache, offline database, network shortcut or forced refresh loop was added. Already loaded views continue to update through their existing listeners.

Validation:
- All 85 unit tests passed, including five startup-gate/initial-paint tests.
- Local-module JSX/CSS bundle passed with third-party imports external.
- Isolated Chromium CSS checks passed for startup/content/recovery states at 280/320/390/760/1280px in both themes. Reduced-motion behavior and the actual initial-HTML script-failure handler were also exercised.
- tests/loading-browser.mjs adds React-component fixture checks for bootstrap first paint, delayed retry, skeletons, reduced motion and recovery states (npm run test:loading). Full Vite/Firebase auth/refresh workflows and these Playwright component fixtures remain unverified due earlier dependency-download restrictions.

All previous project updates are included. No live deployment or stored-data changes were performed.

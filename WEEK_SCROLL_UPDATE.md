# Weekly table: pinned habits and current-day visibility

Minimal UI-only change:
- Habit names stay pinned on the left while the date columns scroll horizontally.
- Opening This week brings today's column into the available space beside the pinned names.
- Previous weeks start at the left; returning to this week reveals Today again.
- Manual scrolling is not reset by normal data updates.
- Only the table's date area scrolls; the panel legend and rest of the page remain stationary.

Existing habits, progress, previous-day corrections, My habits navigation, privacy features and completion modals are unchanged. No new Firestore rules or dependencies are needed.

Verification: dedicated scroll tests passed at 320/390/760/1280 pixels in light and dark themes, including Sunday at the far-right end, sticky names at both scroll extremes and week navigation. The 32 unit tests, past-completion flow, habit-order flow, production build and all 140 mobile checks passed.

New browser test: npm run test:week-scroll, with Vite on port 4173. Preview: screenshots/week-pinned-mobile.png. Nothing has been deployed live.

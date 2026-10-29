# My progress: consistency-focused dashboard

Replaced the oversized motivational headings and sparse charts with a concise, full-workspace dashboard.

Useful information and actions:
- Today's completed minimums, remaining scheduled habits, and a direct Continue today action.
- Selected-period days won, completed habit-days and overall habit completion rate. T1, T2 or T3 each count as one habit completion, not three separate wins.
- Days-won overview with rest days excluded and a comparison shown only when the prior period has scheduled days.
- A compact, Monday-aligned 12-week activity calendar with separate rest, uncompleted, partially completed and won states. Future cells are blank/disabled. Selecting a date shows its actual completion count; arrow keys move between dates.
- Highest tier per completed habit-day, clearly labeled; higher tiers remain optional.
- Habit consistency sorted lowest/highest, with counts and direct edit links. Full habit names remain accessible, with ellipsis preventing mobile wrapping problems.
- A specific adjustment suggestion only for an active habit with at least three past scheduled days and fewer than half completed. Today's unfinished work is excluded from that suggestion. No automatic habit changes are made.
- Links to weekly progress and weekly reflection.

Metrics retain the existing day-status/history semantics and stored historical scheduled sessions. No streaks, discipline scores, fabricated recommendations, database changes or new persistence flows were added. The 12-week calendar remains explicitly separate from the selected 7/30/90-day summary period.

Validation:
- All 69 unit tests passed, including seven new tests for completion counting, all-minimum day wins, future/rest exclusion, historical sessions, recommendation thresholds, calendar alignment and activity labels.
- Local-module JSX/CSS bundle passed with third-party imports external.
- Isolated Chromium CSS fixtures passed at 280/320/390/600/760/1024/1280/1600px in light/dark themes, using actual workspace/sidebar sizing, long habit names and representative chart/action content. No page/panel overflow; actions stay contained.
- Full Vite build and React/emulator interaction tests remain unverified due earlier dependency-download restrictions. No new full-app screenshots or live deployment were performed.

All previous project updates are included. The /analytics route and navigation label remain unchanged.

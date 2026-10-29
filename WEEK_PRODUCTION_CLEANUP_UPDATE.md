# Weekly grid cleanup

- Shortened the page title to This week and removed the introductory paragraph and persistent legend.
- Placed tier meanings and past-entry rules behind a compact accessible help control.
- Replaced green T1 checkmarks with a T1 text badge using the same shape as T2/T3.
- Added explicit column sizing, opaque sticky habit cells, isolated stacking and clipped date cells to prevent scrolled badges showing through the habit column.
- Habit names now use a flex-aligned icon and one-line ellipsis instead of uneven wrapping. Full names remain in accessible row text and hover titles.
- Kept touch-sized completion buttons, per-day status labels, and late-entry metadata. The late-entry note is now a small dot with an accessible label/tooltip.
- Simplified the review callout; existing progress calculations and seven-day logging eligibility remain unchanged.

Validation:
- All 50 unit tests passed.
- Local-module JSX/CSS bundle passed with third-party imports external.
- Chromium layout checks passed at 320, 390, 760 and 1280px, in light and dark themes, at left/middle/right scroll positions. These used a static fixture with the real project stylesheet and representative table markup, not the running React app. Checks cover fixed opaque name cells, no page-level horizontal overflow, consistent row heights and single-line names. Results: screenshots/week-css-layout-results.json.
- Full Vite build and React/emulator browser suites remain unverified due earlier dependency-download restrictions. Existing screenshot images are historical, not screenshots of this revision.

All previous Users, Settings, Help and feedback updates are included. No live deployment or data migration was performed.

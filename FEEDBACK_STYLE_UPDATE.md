# Minimal feedback page refresh

Narrowed the Report or suggest page to a centered 820px layout matching Settings. Reduced heading and card sizes, shortened privacy copy, aligned Type and Title in a two-column desktop form, and tightened the Details area and submit button. Mobile fields stack naturally. Existing feedback cards now use compact spacing and distinct resolved/in-progress badges. Status filtering and the admin inbox retain their behavior.

Only src/screens/Administration.jsx and src/styles.css changed for this refresh. All previous Users and Settings changes are included. No feedback records, permissions or submission logic were changed.

Checks: all 44 unit tests passed; local-module JSX/CSS bundle passed with third-party imports external. Full Vite build and browser/emulator tests remain unverified due the dependency-download restrictions documented in previous updates. Existing screenshots in the archive are historical, not new previews.

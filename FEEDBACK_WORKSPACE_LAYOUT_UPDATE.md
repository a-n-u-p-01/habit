# Full-workspace personal feedback layout

The Report or suggest page now uses the full existing main workspace, aligned with other app screens rather than capped at a centered 820px column. Desktop has a larger compose form on the left and a compact submission-history panel on the right. Smaller screens stack the panels, with single-column mobile fields. History rows use separators instead of nested oversized cards. No viewport-wide bleed or changes to the shared shell were introduced.

Submission, privacy, offline/error handling, status filtering and the separate admin inbox table are preserved. Empty filtered history now correctly says that no submissions match the selected status. All previous project updates are included.

Validation: all 50 unit tests passed; local-module bundle and JSX/CSS syntax check passed with external third-party imports. Full Vite build and browser/emulator checks remain unverified because of the earlier dependency-download restrictions. No new rendered screenshots were captured.

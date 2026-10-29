# Settings full-workspace layout

Removed the centered 820px width cap from Settings. The page now aligns with the existing main workspace and uses a two-column desktop layout: account/name settings on the left, appearance and data/privacy cards stacked on the right. On smaller screens the sections stack into one full-width column. Card spacing, input heights and footer alignment were adjusted to match the feedback workspace layout.

All account, theme, export, import, cache-cleanup, sign-out and deletion behavior is unchanged. All prior Users and feedback updates are included.

Checks: all 50 unit tests passed; local-module JSX/CSS bundle passed with third-party imports external. Full Vite build and browser/emulator testing remain unverified due the earlier dependency-download restrictions. No new rendered screenshots or live deployment were performed.

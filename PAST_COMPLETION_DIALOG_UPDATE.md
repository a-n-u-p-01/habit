# Minimal past-completion dialog

Refined the past-day completion dialog shown in the screenshot:
- Compact habit heading, short date and close control.
- Shorter explanatory copy; original-date confirmation and historical-requirements warning remain.
- Simpler tier labels and one grouped task list instead of oversized nested cards.
- Only the content body scrolls; Cancel and Save completion remain visible in the footer.
- Responsive width/height, 44px action targets and 16px select text on mobile.
- Existing historical snapshots, eligibility checks, duplicate-save lock, offline guard and required confirmations are unchanged. Legacy measured requirements are displayed faithfully; no past task content was rewritten.

Validation: all 62 unit tests passed; local-module JSX/CSS bundle passed with third-party imports external. Isolated Chromium native-dialog layout checks passed at 280x640, 320x568, 390x844, 760x600, 1280x720 and 1440x900 in both themes using long task lists. The dialog stays within the screen, its body scrolls, and action buttons remain visible. Full React/emulator save-flow tests remain unverified due the earlier dependency-download restrictions.

All previous updates, including canonical routing, are included. No live data or deployment changes.

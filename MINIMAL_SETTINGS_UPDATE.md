# Minimal Settings update

Replaced the oversized “Your corner” profile hub with a compact Settings page.

Kept only:
- Account identity and nickname editing; Google sign-in or sign-out.
- Light, Dark and System appearance controls.
- Data export and brief privacy guidance.
- Account/data deletion, tucked behind an expandable section with confirmation.
- Device-data import and legacy-cache cleanup only when applicable.
- Small Help and Report or suggest footer links.

Removed from this page: statistics hero, role badge, duplicate navigation list, motivational quote, welcome replay and non-functional reminder preferences. Existing reminder preferences are not erased. Other app pages and the previous Users-table update are preserved.

Sidebar, mobile navigation and account links now open Settings. Existing /profile bookmarks redirect to /settings. Theme styles match the app, with compact account rows and responsive controls.

Validation: all 44 unit tests passed; local-module bundle and JSX/CSS syntax check passed with external third-party imports. Full dependency-backed build and browser/emulator tests remain unverified due the earlier dependency-download restrictions. Browser selectors were adjusted for the new settings layout. No live deployment or user-data deletion was performed.

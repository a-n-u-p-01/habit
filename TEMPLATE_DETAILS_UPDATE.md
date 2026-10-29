# Template details and author attribution

Refined the template detail page to match the rest of the app:
- Compact header with a clear Use template action.
- Author username, template visibility and real review stats grouped beneath the description.
- One clean task-by-tier panel with counts and faithful requirement text.
- Suggested schedule card and a compact reviews panel with a collapsible Write/Edit review form.
- Responsive desktop columns and stacked phone layout, readable form fields and contained actions.

Author attribution:
- Community templates use their saved authorName (the author's chosen app name), never the current viewer's identity.
- Your own private/public templates use your current chosen app name, including templates that previously had no authorName metadata or copied another creator's name.
- Built-in starters are attributed to Win Today; unsigned local templates use You.
- Older records without usable author metadata explicitly show Author unavailable rather than inventing a username.
- No private user profile reads or broadened Firestore permissions were introduced. There is no separate unique @username field in this app; the chosen app name is the user-facing name.

Public details are refreshed when available rather than relying only on an older saved snapshot. Route/account changes remount the detail state, avoiding stale template/review fields. Private and built-in templates no longer show a public review form. Review writes still require sign-in and connectivity, retain the public-name warning and use the existing review API. Requirement content and template data are not rewritten.

Validation: all 75 unit tests passed, including six attribution tests. Local-module JSX/CSS bundle passed with third-party imports external. Isolated Chromium CSS fixtures passed at 280/320/390/600/760/1024/1280/1600px in both themes with long names, tier lists and the review form open, including actual sidebar sizing. The privacy-browser test was adjusted to open the review composer. Full React/Vite/emulator data-loading and review workflows remain unverified due earlier dependency-download restrictions.

All previous project updates are included. No live deployment or database migration was performed.

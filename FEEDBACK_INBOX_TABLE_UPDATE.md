# Admin feedback inbox table

Replaced the staff inbox cards with a responsive table; the personal Report or suggest form and personal submission cards stay unchanged.

Included:
- Submission title and ID, type, author name/ID, created date/time, last updated date/time, and editable status.
- Expandable full details in each submission row.
- Search across title, full message, submitter name/ID and submission ID.
- Combined type and status filters; newest/oldest/recently-updated/title/author sorting.
- 10/25/50-row pagination with first/previous/next/last buttons and result counts.
- Total/open/in-progress/resolved summary counts; loading/error/empty states; mobile horizontal scrolling.
- Existing staff permissions, realtime status updates, offline disabling and private feedback access remain intact.

Pagination and search are client-side over the existing realtime feedback listener, not server-side database pagination. Missing historical dates display Not recorded. No database migration or live deployment was performed.

Checks: all 50 unit tests passed, including six feedback-table data tests. Local-module bundle and JSX/CSS syntax checks passed with third-party imports external. Full Vite build and browser/emulator tests remain unverified due the dependency-download restrictions documented in earlier updates. Historical screenshots in this archive are not current previews.

This archive includes all previous Users, minimal Settings and personal feedback styling changes.

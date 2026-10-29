# Users table update

The administration page and its navigation label are now simply “Users”. The existing /admin/users route stays the same, and unrelated app pages are preserved.

## Included
- A single semantic user table with profile image (initials fallback), name, copyable user ID, role badge, join date, public template count, profile status, and role management.
- Explicit Change role button after selecting a role; confirmation before saving.
- Super-admin-only role writes, self-role-change prevention, offline and error safeguards. Admins retain read-only access. Existing Firestore role restrictions remain intact.
- Name/ID search, exact-role filter, alphabetical/newest/most-templates sorting.
- Pagination with 10, 25, or 50 rows, first/previous/next/last controls, and result counts. Search/filter/sort/page-size changes return to page one; live removals clamp the page automatically.
- Theme-aware summary cards, compact table rows, horizontal table scrolling on narrow screens, keyboard focus styles, loading/error/empty states.
- Counts use public templates grouped by authorId. Private templates and habits are not exposed. These are current published posts, not an all-time count of deleted posts.
- “Profile status” means name setup completeness, not email verification or account suspension.

## Join-date tracking and deployment
Deploy the included firestore.rules together with the application before using the updated profile flow. New app profiles store an immutable server-generated createdAt timestamp. Profile name/photo changes preserve it. This is app-profile creation time, not Google account creation time.

Existing accounts without a recorded join date display “Not recorded”. No historical dates are guessed or backfilled. No database migration or live deployment was performed here.

## Validation
- Passed: npm test, all 44 tests, including six new tests for filtering, role handling, sorting, template counts, pagination and missing dates.
- Passed: esbuild local-module bundle / JSX / CSS syntax check with third-party imports external and the existing public landscape asset external. This is not a substitute for a Vite production build.
- Added an emulator rule test for immutable join dates and updated access-browser tests for the new Users label and explicit role-save button.
- Not run: full Vite build, browser/emulator suites. npm dependency installation returned registry HTTP 403 errors; Java for Firestore emulators is also unavailable in this environment. Existing screenshots and historical test reports in the upload are not evidence for this revision.

## Scale note
Pagination is client-side over the existing realtime user/role listeners; public templates are also listened to for counts. It does not reduce database reads. Large deployments should move to server-maintained public-template counters and indexed/cursor-based user queries.

## Changed files
- src/UsersTable.jsx (new)
- src/users.js (new)
- src/access-labels.js (new, shared role labels)
- src/screens/Administration.jsx
- src/access.jsx
- src/App.jsx
- src/screens/Account.jsx
- src/store.jsx
- src/styles.css
- firestore.rules
- tests/users.test.js (new)
- tests/access-browser.mjs
- tests/rules.test.js
- package.json (adds users tests to npm test)

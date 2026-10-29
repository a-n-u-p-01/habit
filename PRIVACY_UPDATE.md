# Chosen app names and privacy update

This release merges the resumed privacy work with the latest compact habit cards. Complete T1, the task-review modal, its required radio confirmation, optional T2/T3, automatic private templates and previous-seven-day logging are retained.

## Your app name

- First sign-in asks What should we call you? with a blank nickname field. It does not prefill or display the Google account name.
- Existing accounts created by older versions choose their app name once when opening this version. Their habits, progress, templates and roles remain unchanged.
- My space is now Your corner. The Your app identity section lets signed-in users edit their name later.
- Names are 2–40 characters. Surrounding/repeated spaces are normalized. Control characters and email addresses are rejected. International nicknames are supported; names are display labels, not unique or verified account handles.
- The full chosen name is used in greetings, the account area, profile, export, reports and newly shared content. Long nicknames wrap or truncate visually rather than overflowing.
- Saving also updates the author's existing public template/review labels and private feedback author label, in bounded batches. Only author-name metadata changes, not anyone's message, rating, habit or ownership. A partial failure is reported and saving again retries.
- Other people's saved snapshots, downloaded copies, screenshots and search caches cannot be renamed or retracted by this client.

## Google identity is separate

Google remains the sign-in provider. Firebase Authentication and project owners can still have access to the Google identity information used for authentication. This update does not rename the Google account, delete provider identity, or make an account anonymous.

The application profile database no longer copies the Google email/photo/name at login. It stores a confirmed chosen name, an empty photoURL field for compatibility and an update timestamp. When an older account chooses/saves its name, the old email/photo fields are removed from that app profile. A neutral app avatar replaces the Google photo; profile images are not fetched from Google by the UI.

## Other verified privacy fixes

### In-app user directory

Staff see only profiles whose owners have confirmed an app name, with app name and UID—not Google emails or legacy unconfirmed profiles. The Firestore query and rules enforce that filtering; hiding fields in the UI alone is not the protection. Private habit/progress/reflection subcollections remain owner-only, including against in-app admins.

This directory is not Firebase Authentication's project-owner console. Existing accounts appear in the in-app directory after choosing their name. Roles stay in the separate protected userRoles collection; name edits cannot grant roles.

### Public content

- Publishing a template shows an explicit public-sharing confirmation. Review forms explain that the review and app name are public.
- Public author labels must match the author's confirmed chosen name under the rules.
- Public author UIDs remain visible for ownership, and aliases can be correlated across public posts. Nicknames are not anonymity.
- Template adoption no longer writes a public usage identifier. Legacy templateUsages records are owner-readable only, and new adoptions are not tracked by this client. Public usage counts and Most used sorting were removed rather than exposing people to calculate them. Rating/review aggregates remain.
- Existing legacy public names are updated when their owner chooses/saves an app name; this is not a global retroactive erasure of every old publication.

### Reports

Reports remain visible only to the sender and staff. A sender can update only their author-name label to their current chosen name; they cannot rewrite a submitted message or change status through that permission. Staff status permissions remain separate.

### Account transitions and shared devices

- App state is cleared and keyed by UID on sign-in/sign-out/account changes. Stale listeners cannot render another account's profile or private habits.
- The chosen name is adopted only after the server acknowledges the profile save.
- Signed-in Firestore data now uses memory-only caching, not a persistent offline Firestore database. Signing out waits for pending writes when connected and reloads the app to discard the previous account's in-memory cloud cache.
- Loaded cloud sessions can still be used offline while the tab stays open. Reconnect and let changes sync before closing/reloading. Pending changes trigger a browser close warning where supported; sign-out is blocked when known pending changes cannot sync.
- This is a deliberate privacy/usability tradeoff: a cold offline reload cannot reopen signed-in cloud data from disk, and unsynced memory-only writes do not survive closing the tab.
- Device-only guest records still use localStorage and remain until explicitly cleared or imported. Use a private window on shared devices. Remembered Google/Firebase sign-in is separate from the Firestore data cache.

### Older offline caches

Old caches might contain unsynced work, so this release does NOT delete them automatically. Settings detects an older Firestore cache where the browser supports detection. Remove older cloud cache requires an explicit destructive-action confirmation after the user has synced and closed older tabs. It waits for current pending writes, terminates the database, removes only this app's Firestore cache and reloads. If another tab prevents removal, an error is shown. Guest localStorage is not removed by that action. Cancelling leaves the older cache intact.

## Deploy both frontend and rules

1. Back up/sync important existing data and close older app tabs before switching builds.
2. In your normal deployment environment run npm ci and npm run build.
3. Publish the included latest firestore.rules with the frontend, using your existing owner-authorized deployment workflow, for example firebase deploy --only firestore:rules,hosting.
4. Refresh installed/open app tabs to load the new version. Older clients that still try to write Google profile fields can receive permission errors under the updated rules; they must update.
5. Confirm first-name setup, Your corner editing, public author labels, feedback, admin directory and a habit completion with disposable accounts before broad rollout.

No new dependencies, server or index changes are required. Nothing has been deployed to the live project by this update.

## Verification

- Production build passed.
- All 32 domain/history/profile unit tests passed.
- All 24 Firestore permission tests passed, including chosen-name enforcement, denied legacy-profile access, private usage identifiers, author-label-only updates, orphaned-review renaming, protected private data and existing tier rules.
- Authenticated emulator tests passed for admin roles, feedback, manual/private-template creation, compact-card confirmation and historical corrections.
- New npm run test:privacy passed first sign-in, blank legacy-name setup, invalid email rejection, reload persistence, same-page account switching, removal of legacy app-profile email/photo fields, author-label propagation, new public publication, export name, no Google-avatar requests, memory-only new cloud caching, preserved older unsynced cache data after startup/cancelled removal, signed-out UI and mobile profile editing.
- Compact-card, guest completion, daily guidance, habit ordering, template reuse and past-day logging browser tests passed.
- All 130 mobile route/theme/size checks passed. New identity-specific checks also cover the narrow signed-in profile form.

Browser tests expect Vite on port 4173. Auth/rules tests use isolated demo emulators, never real Google accounts or production data. Example screenshots: screenshots/name-setup.png, screenshots/chosen-name-profile.png and screenshots/chosen-name-profile-mobile.png.

## Review scope and remaining limits

This was a focused source-code privacy review, not a legal/compliance certification or an audit of live Firebase project access, logs, backups, App Check or API-key restrictions. Storage is denied by default and Firebase Analytics is not initialized by this app. Firebase/Google authentication requests and externally hosted Google Fonts still involve those services' network/privacy policies. App names do not encrypt data, remove provider identity or retract previously public copies. Self-hosted fonts and project-owner security configuration can be addressed separately if needed.

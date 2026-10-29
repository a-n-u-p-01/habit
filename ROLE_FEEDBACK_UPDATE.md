# User roles, reports and suggestions

Only user administration and feedback features have been added. Existing habit, progress and template flows are unchanged.

## Pages

- `/feedback` — signed-in users can report a problem or suggest an improvement, see their own submissions and track their status.
- `/admin/users` — admins and super admins can see and search app users. Only super admins can assign Admin or Super admin roles. Selecting User removes elevated permissions.
- `/admin/feedback` — admins and super admins can read reports/suggestions and set their status to Open, In progress or Resolved.

Links are in the sidebar and Your corner menu, including on mobile. Normal users cannot open admin pages even by entering their URLs directly.

## Access matrix

| Action | User | Admin | Super admin |
| --- | --- | --- | --- |
| Send a report or suggestion | Yes | Yes | Yes |
| Read own feedback and status | Yes | Yes | Yes |
| View all app profiles and roles | No | Yes | Yes |
| Read all feedback and update status | No | Yes | Yes |
| Grant/remove Admin and Super admin roles | No | No | Yes, for other users |
| Read another user's private habits/progress | No | No | No |

Roles are enforced by Firestore rules, not browser storage or hidden buttons. No role document means normal User access. Super admins cannot change or remove their own role through this app, reducing accidental lockout. To change your own role, another super admin must do it. Role changes are reflected live.

## One-time setup: first super admin

No account is automatically made super admin. The first privileged account must be approved by the Firebase project owner:

1. Deploy the updated Firestore rules and rebuilt app to the existing Firebase project. Keep the existing project configuration. For your normal deployment environment, use `npm ci`, `npm run build`, then `firebase deploy --only firestore:rules,hosting`. Hosting alone is insufficient: the new security rules are required.
2. Sign in to the app with the Google account that should be the first super admin. This creates/refreshes its app profile.
3. In Firebase Console → Authentication → Users, copy that account's UID.
4. In Firebase Console → Firestore Database → Data, create collection `userRoles` and document with that exact UID as its document ID.
5. Add these fields:
   - `role`: string `super_admin`
   - `updatedBy`: string `bootstrap`
   - `updatedAt`: timestamp set to the current time
6. Return to the app. Users & roles and Feedback inbox will appear. Use Users & roles for later role assignments/removals.

Do not add roles to the `users` profile collection and do not weaken the rules to bootstrap an account. The console is a trusted owner operation; clients cannot bootstrap or promote themselves.

## Data and privacy

- The user list reads confirmed chosen-name profiles from `users/{uid}`, not the Firebase Authentication admin API. It does not show email addresses or unconfirmed legacy Google profiles. Existing accounts appear after choosing their app name. Device-only guests are not registered users.
- `userRoles/{uid}` stores elevated role, last modifier UID and server timestamp. Removing this document removes elevated access. This does not delete the account.
- `feedback/{id}` stores author UID/name, type, title, message, status and server timestamps. Title limit is 120 characters; details limit is 5,000 characters. Only the sender and staff can read it.
- Staff can change feedback status, but cannot rewrite the sender's message or impersonate a sender. Normal users cannot change status. The existing account-deletion flow also removes the user's feedback.
- Account deletion is not a staff feature. An elevated role record may remain after an account is deleted; the Firebase owner may remove that orphaned role record in the console. It cannot be used by another account with a different UID.
- Private habits, progress and reflections remain owner-only. Existing public templates/reviews are unchanged.
- Writes require an internet connection. Errors preserve the feedback draft. Cloud data now stays in the current tab's memory; sync before closing. Older disk caches are removed only after explicit confirmation. Shared devices should use private browsing; device-only guest data remains local until cleared.

## Verification

Commands from the project directory:

- `npm test` — existing domain tests.
- `npm run build` — production build.
- `npm run test:rules` — existing and new Firestore authorization tests against the isolated demo project; requires Java 21+.
- Start Vite on port 4173 with `npm run dev -- --port 4173`. In a second terminal of your local development environment, run `npm run test:access` for browser tests against isolated Auth and Firestore emulators. Install the test browser first with `npx playwright install chromium` if needed. No production data or real accounts are used.
- `npm run test:browser` — existing guest-flow regression test; also expects the app on port 4173.

New browser test results and screenshots are in `screenshots/access-results.json`, `screenshots/admin-users.png` and `screenshots/feedback-mobile.png`.

The source has been updated and tested locally; nothing has been deployed to the live Firebase project.

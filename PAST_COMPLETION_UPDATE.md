# Forgot to mark a completed habit

## How to use

1. Open This week and find the date. Use Previous week if necessary.
2. Select an outlined scheduled cell from the previous seven calendar days.
3. Review the date, habit and requirements. Choose the highest tier you actually completed. T2 includes T1 plus the T2 extras; T3 includes all three tiers.
4. Confirm that you completed all the displayed requirements on that date, then select Save past completion.

The entry is labelled Logged later. That date's weekly/analytics progress is recalculated; today's completion is unchanged. Already-earned tiers are never removed. This feature adds missed completion records or higher completed tiers, rather than downgrading prior records.

Today, future dates, dates older than the seven-day correction window, dates before creation, and unscheduled days remain read-only in this correction flow. Existing scheduled sessions are honoured even if the habit has since been paused. The window is checked again when saving, using the device's local calendar date.

## Historical requirements

- Existing sessions always retain their saved original snapshot; it is never rewritten.
- New habit creation and future habit edits now record date-effective definition history, so unstarted sessions can use known historical requirements.
- Older habits may have neither a saved session nor definition history. The app cannot recover information that was never stored. In that case it clearly shows the current requirements and requires an additional confirmation that those requirements match the selected historical date. It does not silently claim that the current definition is the historical one.
- If another device changes the requirements before saving, the app asks the user to close and review the date again.

## Storage and privacy

Device-only corrections use one local-storage update. Signed-in corrections require a connection and use a Firestore transaction that re-reads the habit and progress and saves all newly earned tiers together. Retries are idempotent and preserve existing checks and wins.

The progress row and new tier wins store lateLoggedAt (device-reported epoch milliseconds) and lateRequirementsSource (saved_session, saved_history or confirmed_current). Existing backend updatedAt/wonAt timestamps also record cloud writes. Logged later is a self-reported correction label, not independent proof of when the physical activity occurred or an anti-cheat audit trail. Existing guest import/export retains these fields, even when an archived correction is older than the current editing window.

The rules validate metadata types and retain the existing owner-only access, immutable-session-snapshot and earned-tier checks. The seven-day user workflow is enforced by the UI and revalidated by the application save operation; existing owner data import/export and unrelated writes are not replaced with a blanket historical-data ban.

## Deploy the rules too

This update changes firestore.rules to permit and validate the new correction metadata on progress updates and tier wins. Publish the included rules along with the rebuilt frontend. Deploying only hosting can cause permission errors when updating an existing past session.

For your normal deployment environment: npm ci, npm run build, then firebase deploy --only firestore:rules,hosting. Nothing has been deployed live by this update.

## Verification

- Production build passed.
- All 30 domain/history unit tests passed: seven-day boundaries, creation/schedule/deletion safeguards, history restoration, immutable snapshots, explicit legacy confirmation, concurrent-definition changes, idempotent tier logging and date-specific statistics.
- All 20 Firestore rules tests passed, including metadata validation, original snapshot protection, atomic tier writes and denied cross-user access.
- Guest and authenticated emulator browser tests passed for past completion, historical requirements, label persistence and statistics.
- Keyboard opening, Escape/cancel, focus return, duplicate submission and a narrow mobile dialog were tested.
- Existing completion, habit creation/template reuse, daily guidance and habit-order flows passed.
- All 130 mobile route/theme/size checks passed.

Run npm test for unit tests. With Vite on port 4173, npm run test:past runs the new guest browser tests. Existing npm run test:access and npm run test:rules cover authenticated flows and rules with isolated demo emulators. New previews/results are in screenshots/past-completion-desktop.png, screenshots/past-completion-mobile.png and screenshots/past-completion-results.json.

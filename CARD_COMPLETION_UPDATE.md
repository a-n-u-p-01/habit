# Compact habit cards and confirmation modal

Release note: this describes the earlier card-only release. Privacy work has now been resumed and merged without changing these compact-card controls; see PRIVACY_UPDATE.md for the current identity, cache and rules changes.

This update starts from the last delivered past-completion version. The unfinished privacy/name/profile/cache changes are paused separately and are NOT included here. My space, sign-in behavior, Firebase configuration and security rules remain exactly as in that delivered version.

## Today card flow

- The card shows the habit, current status and a right-side Complete T1 action.
- Clicking it opens a small modal containing that tier's tasks.
- A real radio confirmation, I completed all the tasks above, must be selected before Complete is enabled.
- Selecting the radio alone, opening the modal, Cancel, Close and Escape do not change progress.
- After T1 the same compact card offers Complete T2, marked Optional. T3 works the same way. After T3 it shows All done with no further completion action.
- The task list is no longer expanded within the card. Existing habit order and Next small step guidance are preserved.

## Safeguards

The reviewed tier and requirements are captured when the modal opens. Confirmation is reset on reopening. A submit lock prevents repeated clicks from awarding an unintended next tier. Existing incremental tier rules, persistence and cloud sync are unchanged. A dialog left open after the local date changes asks the user to reopen Today rather than recording a stale-day completion.

The dialog uses native modal behavior with keyboard focus containment, Escape/cancel, visible radio controls and at least 44px action targets. Focus returns to the trigger on cancellation; the completed card receives focus after its final action is removed. Completion announcements remain available to screen readers.

## Verification

- Production build passed.
- All 30 domain/history tests and 20 Firestore permission tests passed.
- New npm run test:cards passed: compact layout, all tier tasks shown, required radio, no writes on opening/radio/cancel/Escape, reset on reopen, double-submit safety, persistence and responsive light/dark modal layouts.
- Authenticated emulator tests confirm that opening creates no progress and one confirmed submission saves only the reviewed tier.
- Existing guest completion, daily guidance, habit order, manual/template creation and previous-day logging flows passed.
- All 130 mobile route/theme/size checks passed.

As with the existing browser tests, start Vite on port 4173 before running npm run test:cards. Previews are in screenshots/compact-habit-cards.png, screenshots/habit-completion-modal.png and screenshots/habit-completion-modal-mobile.png.

There are no new dependencies or Firestore-rule changes for this card update. Use the existing frontend build/deploy workflow. Nothing has been deployed live.

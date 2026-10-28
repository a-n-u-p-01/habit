# Today page: action-first cleanup

This update applies the approved Today-only plan on top of the earlier roles/feedback features and Timeline removal.

## Changes

- Replaced the large landscape/motivational banner with a compact daily minimum-completion count, remaining count and accessible progress bar.
- Added compact shortcuts to This week, New habit and Templates on desktop and mobile.
- Kept a compact weekly progress preview beside the daily summary on desktop and below it on mobile.
- Kept habit cards in the user's arranged order. No automatic sorting or habit-data migration.
- Completed minimums show Minimum done with the earned tier badge. Optional T2/T3 actions are collapsed behind an accessible Optional extra control. They collapse again after another tier is earned and after a page reload.
- T1 remains the daily minimum; T2/T3 remain optional and incremental. Existing one-click completion, double-click safety, cloud sync and task detail URLs remain intact.
- Removed the repeated reminder card and reflection shortcut from Today only. Weekly review remains available elsewhere.
- Completion announcements remain available to screen readers without adding repeated text to completed cards.

## Verification

- Production build passed.
- All 21 domain tests passed.
- Guest browser flow passed, including empty-state shortcuts, progress updates, collapsed optional extras, keyboard controls, T1/T2/T3 persistence and double-click safety.
- Habit-order browser tests passed, including pointer, keyboard, touch, persistence and consistent order across pages.
- All 120 mobile route/theme/size checks passed: widths 320, 360, 390, 430 and 760 pixels, in dark and light themes. Today also checks the preserved habit order and 44px shortcut/optional-extra touch targets.

Updated previews are in screenshots/desktop-today.png, screenshots/mobile-today-improved.png and screenshots/inline-today-desktop.png.

No dependencies, Firebase rules or other page implementations were changed. No live deployment was performed. Use the existing build/deploy workflow to publish this frontend update.

## Daily habit guidance refinement

- The first unfinished habit is highlighted as Next small step without changing the saved list order. The highlight advances as minimums are completed and disappears when all are done.
- The T1 action now reads Mark minimum done. Its requirements and a reminder to do them first stay visible. This remains a user-reported completion, not automated proof of real-world activity.
- Partial progress gets encouragement; completing every scheduled T1 is still the only way to win that day. T2/T3 remain optional.
- Existing accounts with no scheduled habits see a neutral Rest day state and a link to their week. New users retain the create-first-habit empty state. No progress or win is awarded for opening the page, expanding an optional action or taking a rest day.
- No habit-creation, reminder, backend or win-rule changes were made.

Additional verification: npm run test:daily passed for next-step guidance, preserved order, no automatic progress, partial progress, all-T1 completion, persisted completion, rest-day and new-user states, and mobile tap targets. The 21 unit tests, guest browser flow, habit-order browser flow and 120 mobile route/theme/size checks also passed. Run browser tests with Vite available on port 4173, as with the existing test scripts.

Updated guidance previews: screenshots/daily-loop-desktop.png and screenshots/daily-loop-mobile.png. No live deployment was performed.

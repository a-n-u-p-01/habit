# New habit choice and automatic personal templates

## Flow

- All existing New habit / Create a habit / mobile New links open `/tasks/new`, which offers Use a template or Create manually.
- Use a template opens the existing library. Selecting Use on a starter, saved template or My Templates item opens the prefilled customization editor directly.
- Create manually opens `/tasks/new/manual`.
- Saving a new manually created habit also saves a private reusable template in My Templates. It is not published to the community library.
- My Templates now has a Use action. Its title links to the private template editor, rather than trying to open a nonexistent public detail page.

## Save behavior

The habit and its template share a document ID in separate private collections. For signed-in users they are written in one atomic Firestore batch; for device-only users they are saved in one local storage update. The template contains the name, description, category, weekdays and tier requirements, not the habit's progress, active state, scheduling history or position.

A stable draft ID and submit lock protect against duplicate saves. Editing an existing habit does not create another template or overwrite the original blueprint. Creating a habit from a template also does not duplicate that template. Copies receive their own requirement IDs. The original template stays available for future use.

Private templates remain private unless the user explicitly chooses Publish using the existing publishing controls. This is a snapshot made at creation time, not a live link that changes whenever a habit is edited. Existing habits are not converted retroactively.

## Verification

- Production build and 21 domain tests passed.
- New `npm run test:creation` guest browser test passed: both choices, paired save, duplicate-click protection, clean template fields, reload persistence, independent editing, private template reuse, starter customization, cancellation and mobile layout.
- Auth/Firestore emulator browser tests passed for signed-in paired creation and private template reuse, alongside all existing admin/feedback checks.
- All 18 Firestore rule tests passed, including private access and all-or-nothing failure of the paired save.
- Existing completion, daily guidance and habit-order browser tests passed.
- All 130 mobile route/theme/size checks passed, including the chooser and manual editor at 320/360/390/430/760 pixels in both themes.

Run browser tests with the Vite app available on port 4173, as documented for the existing tests. Screenshots are in screenshots/habit-create-choice.png and screenshots/habit-create-choice-mobile.png.

No dependencies or Firestore rules were changed. No live deployment was performed. This update builds on the previous Today, roles and feedback features.

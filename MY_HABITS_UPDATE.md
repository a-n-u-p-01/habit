# Dedicated My habits page

Habit management now lives at /habits, separate from Your corner.

- Desktop: My habits is in the sidebar.
- Mobile: My habits is a direct bottom-navigation tab. Progress remains accessible through Your corner and the navigation menu; the bottom bar stays at five items.
- Manage existing active and paused habits, create a new habit, edit, pause/enable, reorder by drag/keyboard/up-down controls, and confirm deletion.
- Counts show active, paused and total habits. The existing empty state links to manual/template creation.
- Editing returns to My habits. The editor's Back link also returns there.
- Deletion keeps past sessions and wins and removes future scheduling, as before.
- Your corner retains identity editing, personal stats, account/privacy settings and links, but no longer duplicates the management list.

This release is based on the delivered privacy/nickname + compact-card version. The subsequently proposed task-first editor work is paused and is NOT included. Existing creation forms, templates, history, privacy and completion modals are preserved.

Verification passed: new npm run test:manage, 32 unit tests, build, habit ordering (pointer/touch/keyboard), creation/template reuse, completion smoke/card tests, authenticated/admin/privacy tests and 140 mobile route/theme/size checks. New previews/results are in screenshots/my-habits-desktop.png, screenshots/my-habits-mobile.png and screenshots/my-habits-results.json. Browser tests expect Vite on port 4173.

No dependencies, Firestore rules or database paths were changed for this update. Nothing has been deployed live.

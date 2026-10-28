# Habit ordering and badge wording update

What changed:
- My space > My habits now supports drag handles on desktop and touch devices.
- Up/down buttons and Space/arrow-key sorting are available as accessible alternatives.
- Enabled and paused habits share the same saved order. Pausing, enabling or editing a habit does not reset it.
- Today, Timeline, weekly grid, analytics consistency and other habit lists all consume the same ordered provider data.
- Task/Tasks labels are now Habit/Habits. Per-level status reads T1/T2/T3 badge achieved. The next action is Achieve T1/T2/T3 badge. The Win Today brand and day-won philosophy remain.

Apply to an existing project:
1. Back up your source. Merge the included files at matching paths; do not discard your own unrelated edits.
2. This update adds @dnd-kit/core, @dnd-kit/sortable and @dnd-kit/utilities. Install the updated dependencies with npm install.
3. Run npm run build, then redeploy the frontend.
4. Keep your Firebase config, deployed rules, authentication setup and data unchanged. No database rename or migration is needed.

Ordering is stored as numeric orderIndex on the existing private users/{uid}/tasks/{id} documents. This internal collection/path remains named tasks for backward compatibility; only the interface is renamed. Reordering is one atomic batch for up to 450 visible habits, with an immediate local preview, rollback/error feedback on failure, and offline queued sync. Guest order is persisted synchronously on this device and is included in explicit guest imports/exports. For cloud accounts, synced rank values are shared across signed-in devices. Concurrent cloud reorders use the last committed arrangement.

Verification: 21 logic tests; 9 Firestore emulator ownership/shape/atomic-write tests; guest end-to-end checks; 120 responsive layout checks; and sorting tests covering desktop pointer, actual touch-pointer input, keyboard, move buttons, refresh, edit/enable rank preservation and consistent Today/Timeline/weekly/analytics order. Live production Firebase sign-in/deployment has not been exercised or modified.

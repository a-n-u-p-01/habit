# Task-only habit and template editor

Built from the latest delivered weekly-pinned version, not the abandoned editor redesign.

## What changed

- The existing creation layout, schedule picker, three tier cards, preview and saving flows remain.
- Each row is now one Task text field. Amount and Unit inputs are removed; there is no hidden target toggle.
- Each tier has Add task with no four-task cap. Individual tasks can be removed; each tier still needs at least one task, matching the existing three-level setup.
- T1 guidance: easy tasks for a busy day; complete every T1 task for the habit's daily win.
- T2 guidance: useful extra tasks after T1, optional during daily use.
- T3 guidance: a stretch after T2 for days with time or energy, optional during daily use.
- Shorter form and library copy retains the private-template and tier explanations.
- Added categories: Health, Sleep, Nutrition, Relationships, Finance, Home and Growth. Existing categories remain.
- New task text is limited to 160 characters per row. There is no fixed row-count limit in the editor; Firebase document-size and browser limits still apply. Keep daily minimums short and meaningful rather than building one oversized habit.

## Wherever tasks appear

The shared renderer, progression preview, completion modal, detailed task flow, summary and past-day logging understand task-only rows. New task-only records contain an ID and label, with no synthetic amounts/units. Completed-task summaries do not invent numeric totals from prose.

Existing measured records remain readable. When an old habit/template is edited or customized, its saved target becomes complete task text, such as 10 reps Push-ups. This prevents losing the original quantity when the separate inputs disappear. Existing task IDs remain stable on edits; template copies get new task IDs. Old daily snapshots are not rewritten and retain their original data and totals.

Creating a manual habit still saves its private reusable template. Editing or reusing a template does not create unwanted duplicates. Publishing remains an explicit action under the chosen app name.

## Storage and rules

In the browser, new rows use {id, label} in the existing three-tier arrays. Firestore stores each new tier as ordered parallel string lists, {ids: [...], tasks: [...]}. This preserves task order and allows native list validation rather than an unrolled four-row rule. The new reader supports both this representation and legacy measured arrays, including nested progress/history/saved-template snapshots.

Rules require nonempty string task lists, matching IDs/text counts, valid distinct task IDs across all tiers and all required task checks before awarding a tier. Invalid nonstring, multiline, empty, mismatched and duplicate-ID records are denied. Larger blueprints were tested with 50 tasks per tier. Legacy measured validation and ownership boundaries remain supported. The native list operations used are documented at https://firebase.google.com/docs/reference/rules/rules.List and are covered by emulator tests.

## Deploy both app and rules

Publish the included updated firestore.rules with the rebuilt frontend. Refresh older app tabs/installed clients: old builds cannot interpret the new task-list representation. Back up/sync important data before upgrading. No bulk conversion or live deployment was performed here; old records convert only when the user explicitly saves an edit or creates a copy.

For your normal deployment environment: npm ci, npm run build, then firebase deploy --only firestore:rules,hosting. Keep the existing Firebase project configuration. No new dependencies or indexes are required.

## Verification

- Production build and all 38 unit tests passed.
- All 27 Firestore permission/schema tests passed, including larger task lists, every-task completion, malformed-list rejection and legacy-to-text merge without rewriting history.
- New npm run test:editor passed single-field creation, more than four tasks, new categories, private template saving, completion, legacy text conversion, unchanged past snapshots, template creation/reuse and mobile layout.
- Authenticated/admin/privacy flows passed with the new storage representation, including cloud legacy editing and existing past-day corrections.
- Existing habit creation, management, order, completion cards, daily guidance, previous-day logging and pinned-week scrolling tests passed.
- All 140 mobile route/theme/size checks passed.

Browser tests expect Vite on port 4173. New screenshots/results: screenshots/task-only-editor.png, screenshots/task-only-template-mobile.png and screenshots/task-editor-results.json.

The latest My habits page, chosen-name privacy features, compact radio-confirmation cards and pinned weekly table are retained. Optional target controls, collapsed optional creation tiers and routine-cue fields from the rejected design are not included.

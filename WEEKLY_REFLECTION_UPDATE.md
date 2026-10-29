# Weekly reflection redesign

A full-workspace, responsive writing-first layout replaces the oversized headline and motivational sidebar.

Useful features:
- Three optional prompts: what worked, what was difficult, and one specific adjustment for next week, with focused examples and character limits.
- Compact elapsed-week context: days won, habit completions and scheduled habit-days. Future days are excluded from habit completion denominators; existing scheduled-session history is respected.
- Per-habit completion counts and progress bars, with separate links to adjust current habits.
- Last week’s planned adjustment shown alongside the new reflection when available.
- Previous/next-week controls, return to current week, and a menu of up to 12 saved reflections.
- Explicit save/unsaved/error states. Failed saves retain text in the open form. Week changes ask before leaving unsaved text; browser reload/close gets the standard unsaved-changes warning. The draft is not auto-saved and other application navigation is not globally blocked.
- Cloud saves are disabled offline with a keep-this-page-open notice; guest reflections can still save locally.
- Remote saved updates do not silently overwrite an edited draft; replacing a newer saved version requires confirmation.

The existing worked/hard/next reflection format is preserved. Guest saves gain a numeric updatedAt; cloud saves keep the existing server timestamp. No new database rules or migration are needed. Habit edit links do not automatically change habits. No live deployment was performed.

Validation: all 55 unit tests passed, including five new reflection helper tests. Local-module JSX/CSS bundle passed with third-party imports external. Isolated Chromium CSS fixtures passed at 280/320/390/760/1024/1440px in both themes with contained form controls and no page-level horizontal overflow. Full Vite build and React/emulator save/navigation browser tests remain unverified due earlier dependency-download restrictions. Existing screenshot images are historical.

All previous project updates are included.

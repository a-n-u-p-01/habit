# Saved reflections: read first, edit explicitly

Previously, selecting a saved week reopened three filled textareas. Saved reflections now display as a clean read-only summary with labeled notes and a highlighted Next week section. Empty answers are omitted; line breaks and long text are preserved safely as text.

- New/unsaved weeks still open the writing form.
- Successful save switches to the read-only view.
- Edit explicitly opens the form with saved answers.
- Cancel asks before discarding changes and returns to saved content without writing.
- Existing week navigation, offline safeguards, conflict warnings and persistence format remain.
- Focus returns to the saved summary after saving/canceling.

Validation: all 77 unit tests passed, including saved-section ordering/empty filtering and literal multiline text preservation. Local-module JSX/CSS bundle passed with third-party imports external. Isolated Chromium read/edit CSS fixtures passed at 280/320/390/760/1024/1440px in both themes with long notes and contained actions. tests/reflection-read-view.mjs adds full-browser saved/edit/cancel/save/reload/week scenarios (npm run test:reflection), and the existing smoke test now opens Edit before checking textarea values. Full React/Vite/emulator browser workflows remain unverified due earlier dependency-download restrictions.

All previous updates are included. No database migration or live deployment was performed.

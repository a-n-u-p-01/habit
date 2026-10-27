# Today inline-win update

Replace these five source files at the same paths in your existing project:

- src/TodayTaskCard.jsx (new)
- src/screens/Today.jsx
- src/store.jsx
- src/domain.js
- src/styles.css

If you customized any of those files, merge the changes instead of overwriting your edits. Keep your Firebase setup, rules and data unchanged. Run npm run build and deploy the updated frontend assets. No database migration or new dependency is required. The full project ZIP includes updated tests and screenshots.

Each card shows only the current won tier, next tier requirements, and one Win button. Tap after doing all the listed work. T2/T3 remain optional; T3 has no further action.

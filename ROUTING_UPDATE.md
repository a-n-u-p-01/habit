# Consistent nested routing

Canonical user routes:
- /habits — habit management
- /habits/new — choose how to create a habit
- /habits/new/manual — manual creation
- /habits/:id/edit — edit a habit
- /habits/:id — existing habit task flow
- /week — weekly progress
- /week/review — weekly reflection

Legacy bookmarks still work through replacement redirects:
- /tasks/new → /habits/new
- /tasks/new/manual → /habits/new/manual
- /tasks/:id/edit → /habits/:id/edit
- /task/:id → /habits/:id
- /review → /week/review
- /profile → /settings
- /feedback → /help?section=feedback

Redirects preserve query strings, fragments, and React Router location state, including template/customization payloads. Replacement navigation avoids adding a redirect-only step to browser Back history. Unrelated or unknown addresses are not broadly rewritten.

Updated creation links, template-use links, edit links, reflection links, back targets, help references and mobile New navigation. On mobile, habit creation highlights New rather than also highlighting My habits. The sidebar's My habits and This week sections continue to cover their nested screens.

Templates, analytics, Settings, unified Help & feedback, and protected admin routes are otherwise unchanged. Firestore collection names and stored user data were not renamed or migrated. The existing Firebase Hosting index rewrite already supports refreshing nested routes, so no deployment configuration change was needed.

Validation: all 62 unit tests passed, including seven new routing tests covering compatibility targets, identifiers, query/hash preservation, route boundaries, active-creation matching, canonical UI links and the hosting fallback. The local-module JSX/CSS bundle passed with third-party imports external. Existing browser flows now use canonical routes; tests/routing-browser.mjs adds redirect/refresh/Back/template-state/mobile-highlight scenarios for a Vite server on port 4173 (npm run test:routing). Full Vite build and React/emulator browser suites were not run because of the previously documented dependency-download restrictions. No live deployment was performed.

All previous project updates are included.

# Win Today

A complete, mobile-first Vite + React + Firebase application. A small minimum is a real win; extra effort is always optional. Visual direction follows the supplied dark mountain-themed mockup: atmospheric landscape, deep navy cards, violet actions, green/cyan/lilac tiers, generous spacing, and a focused task flow. The included landscape is a real photograph, not an exact recreation of the mockup's illustrations. Light, dark, and system themes included.

## Run

Node 20.19+ (Node 22 recommended).

    npm install
    npm run dev
    npm test
    npm run build
    npm run preview

The provided Firebase web configuration is already in src/firebase.js. Firebase client configuration is public by design; Firestore rules, authorized domains, and appropriate API-key restrictions provide the real protection. No Admin SDK, server, fake APIs, or secret key is used. Firebase Analytics and Storage are intentionally unused.

## Firebase activation: one-time owner setup

The source is wired to habit-builder-f86b4. Supplying a web configuration does NOT authorize this build environment to change your Firebase project. Nothing has been deployed and a live Google sign-in has not been verified here.

1. In the Firebase console for habit-builder-f86b4, enable Authentication > Sign-in method > Google. Choose a support email.
2. In Authentication > Settings > Authorized domains, add your production hostname. Add localhost explicitly for local development if absent. Firebase projects created after April 28, 2025 do not automatically authorize localhost.
3. Create the Cloud Firestore database if necessary. Deploy the supplied rules and indexes. Never use open/test-mode rules for a public deployment.
4. Run the Firebase CLI on your own machine using your project owner account:

       npx firebase login
       npx firebase deploy --only firestore --project habit-builder-f86b4
       npm run build
       npx firebase deploy --only hosting --project habit-builder-f86b4

   The included Firebase CLI dependency provides these commands. Review the rules before deploying to a project with existing data: they deny unrelated collections. This app does not migrate or overwrite other apps' data. If the project already hosts another app, deploy to a deliberately chosen Hosting site rather than replacing it.
5. Firebase Hosting automatically supports SPA routes through firebase.json. If using a different host, rewrite non-file routes to index.html.
6. Popup Google sign-in works on authorized localhost/HTTPS origins. Redirect sign-in is offered separately. For production redirect auth on a custom domain, follow Firebase's redirect best practices and configure the auth handler/proxy appropriately. Prefer hosting under the same Firebase project's firebaseapp.com origin until that is configured.
7. Consider Firebase App Check, Firestore budget alerts, and Google Cloud API-key restrictions before a public launch. Rules provide ownership control, not anti-abuse quotas. These require project-owner configuration and are not falsely represented as active.

If you see permission-denied, deploy the rules. If you see auth/operation-not-allowed, enable Google. If you see auth/unauthorized-domain, authorize that exact hostname. Popup-blocked? Use a normal browser tab and click the sign-in button again, or use redirect sign-in.

## Minimum viable build order

1. React/Vite shell, routes, theme, responsive navigation, welcome flow.
2. Task editor, weekday scheduling, incremental requirement model, local persistence.
3. Focused T1 -> celebration -> optional T2 -> optional T3 -> cumulative summary.
4. Firebase Google auth, private user paths, immutable daily session snapshots, atomic progress/win writes and offline caching.
5. Day-won calculation, weekly grid, personal analytics and review/recalibration.
6. Private templates, public publishing, customization, saved templates, real reviews and unique-user adoption counts.
7. Security rules, indexes, PWA cache, export/deletion, automated tests and deployment checks.

All seven are represented in this source. Live Firebase operation remains dependent on the console setup above.

## Explicit Firestore models

Dates use the user's browser-local YYYY-MM-DD. Weekdays use JavaScript numbering (Sunday=0). Values are representative types, not hardcoded user data.

### users/{uid}

    { displayName: string, photoURL: string, updatedAt: Timestamp }

All private subcollections use the authenticated Firebase UID as the ownership boundary. Guests use the same shapes in localStorage under win-guest-v1. Device data is NEVER silently uploaded after sign-in. The user explicitly imports it in My space. Import is resumable/idempotent by document ID; cloud records already present take precedence.

### users/{uid}/tasks/{taskId}

    {
      id: string, name: string, description: string,
      category: 'Fitness'|'Study'|'Mindfulness'|'Creative'|'Career'|'Life',
      weekdays: number[], active: boolean, createdDay: 'YYYY-MM-DD',
      deletedDay?: 'YYYY-MM-DD',
      sourceTemplateId: string|null,
      scheduleHistory: [{from: 'YYYY-MM-DD', weekdays: number[], active: boolean}],
      levels: {t1: Requirement[], t2: Requirement[], t3: Requirement[]},
      updatedAt: Timestamp
    }

    Requirement = { id: UUID, label: string, amount: positive number, unit: string }

Firestore stores levels as a named map (t1, t2, t3), because Firestore does not support directly nested arrays. src/serialization.js converts that map to/from the internal React array at positions 0, 1, 2. This conversion also covers saved-template snapshots and progress snapshots. Each tier contains ONLY the additional work for that level. A unit can be reps, pages, min, km, problems, sessions, etc. All 3 levels require 1–4 requirements. IDs must be unique across levels. The editor enforces positive quantities and explicit confirmation of additive semantics; software cannot infer from arbitrary prose whether an activity is truly incremental. For the same activity/unit, cumulative totals are computed by addition. Different units are never conflated.

Tasks are soft-deleted, preserving history. Schedule revisions apply from the local change date. Multiple edits within a day replace that day's schedule version. Pausing/resuming records another schedule revision.

### users/{uid}/progress/{date}_{taskId}

    {
      id: string, taskId: string, date: 'YYYY-MM-DD', scheduled: boolean,
      snapshot: {name, category, weekdays, levels},
      checks: { [requirementId]: true },
      createdAt: number, updatedAt?: Timestamp
    }

A transaction creates this document once when a task is started. Its requirements are immutable. Existing daily sessions do not change when their task is edited. Individual checks merge separate nested fields, avoiding whole-map overwrites across devices. Once checked, a requirement is not undone through the UI. The highest consecutively satisfied level is derived from checks, not trusted client counters. You cannot jump directly to T2/T3. Progress creation requires connectivity; already-cached sessions can continue offline. Repeated starts and repeated checks do not create duplicate wins.

### users/{uid}/wins/{date}_{taskId}_T{1|2|3}

    { id: string, taskId: string, date: 'YYYY-MM-DD', level: 1|2|3,
      wonAt?: Timestamp }

Deterministic IDs give one win event per reached tier per task-day. Each tier's last check and win event are written in the same Firestore batch. Rules use getAfter to verify the required levels. The progress document is the source of truth for analytics. A task counts as won after T1, regardless of T2/T3. Distribution counts each task-day ONLY at its highest level. Day Won is derived when every scheduled task has T1; no-task days are rest days, not free wins. Started scheduled sessions stay in the day's denominator after schedule changes.

### users/{uid}/templates/{templateId}

    { id, name, description, category, weekdays, levels,
      active, createdDay, scheduleHistory, sourceTemplateId,
      published: boolean, updatedAt?: Timestamp }

Personal blueprints are private. Publishing copies safe public fields into the root templates collection. Editing a personal template does not silently update its public version; publish again explicitly. Unpublishing deletes the root public document. Existing task copies and saved snapshots remain with their users. Reviews/adoption records can remain after an unpublish so republishing does not reset history. This is not a moderation platform; public launch should add an abuse-reporting/moderation process.

### templates/{templateId}

    { name, description, category, weekdays, levels,
      authorId: uid, authorName: string, published: true,
      updatedAt: number }

Only published templates exist here. Anyone can read; only the author can create, update, or delete. No email address is published. The library retrieves the latest 100 public templates and labels built-in examples explicitly. The app does not invent community reviews or popularity. Recommended means the curated built-in starters, not an opaque recommendation algorithm. Popular/rating sorting uses real Firestore aggregations within the loaded library.

### reviews/{templateId}_{uid}

    { templateId, authorId: uid, authorName, rating: integer 1..5,
      text: string, recommend: boolean, updatedAt: number }

One review per user per template. Writing again updates that review. Only its author can modify/delete it, and the template must exist to submit a review. Public reads. Rules reject spoofed ownership, duplicate-ID patterns and out-of-range ratings. Detail displays up to 100 reflections; average and review count are computed over all matching reviews using Firestore aggregate queries.

### templateUsages/{templateId}_{uid}

    { templateId: string, userId: uid }

One adoption record per authenticated user/template, created only after customization saves a task. Public aggregate reads power the actual unique-user use count. These documents intentionally reveal the adopting user's UID, not profile, email or private task contents. Explain this privacy choice before a public launch. Guests and built-in examples do not contribute fake counts. The task save can succeed even if usage sync fails; the UI reports that partial result.

### users/{uid}/savedTemplates/{templateId}

    { id: templateId, templateId, snapshot: Template, updatedAt?: Timestamp }

The private snapshot preserves a saved blueprint if its public author later unpublishes it.

### users/{uid}/weeklyReviews/{weekStart}

    { id: 'YYYY-MM-DD', weekStart: Monday's local date,
      worked: string, hard: string, next: string, updatedAt?: Timestamp }

A special document reminder-preference in the same private collection stores {id, kind:'reminderPreference', enabled:boolean, time:'HH:mm', updatedAt}. It is explicitly a preference, NOT a scheduled notification. Weekly review UI suggests a smaller T1 when at least 3 scheduled days exist in the displayed week and fewer than half were won.

## Security and limits

- Private user data: owner-only reads and writes, explicit path allowlists.
- Public templates: public reads and author-only modifications, validated shapes and levels.
- Reviews: public reads, author ownership, unique deterministic IDs, rating/text constraints.
- Usage: one immutable adoption per user/template; public read.
- Daily snapshots immutable after creation; wins require satisfied progress in the same atomic state.
- Storage denied by default because uploads are not needed; Google photo URL is used directly.
- This is a personal habit tracker, not a tamper-proof competition. An owner can edit/import their own private data. No leaderboard or economic reward depends on the results.
- Browser-local dates reflect the current device timezone. Travel can move date boundaries; there is no separate timezone settings system.
- Account deletion reauthenticates first, then removes public authored templates/reviews/usages, private subcollections, profile document, and Firebase Auth user. It is a resumable sequence, not one cross-service transaction; reconnect and retry after partial network failure. Other people's saved copies/reviews remain theirs. Offline browser cache removal requires clearing site data.
- Export produces a JSON backup; it is not a general restore-file feature. Device-to-cloud import is supported.
- Rules test fixture included; emulator tests require Java 21+ and Firebase CLI. Run npm run test:rules. Do not deploy until these and the live smoke checks below pass.

## Screens and flows

Welcome/philosophy/interactive example; Today with tasks/timeline and wins; one-level-at-a-time task flow; per-tier celebrations; cumulative summary; day-won state; weekly grid; period analytics, heatmap and task consistency; task creation/edit/pause/soft-delete; template library/search/category/recommended/popular/rated sorts; template detail/customization; personal/published/saved templates; unique reviews/recommendation feedback; profile; weekly reflection/recalibration; theme/reminder preferences/account/privacy/help settings; explicit empty/loading/error/offline states.

## Honest notification boundary

The UI saves a preferred reminder time. Background notifications are NOT implemented: reliable closed-app push delivery requires a trusted sender/scheduler (for example Cloud Functions), which would contradict the requested frontend-only scope. No misleading enabled notification switch or fake API claims are used. PWA installation and offline application assets are implemented via vite-plugin-pwa. No endless feed, random rewards, or manipulative mechanics.

## Validation

npm test covers incremental totals, T1/day win rules, no level skipping, schedules and pause history, empty rest days, distribution, validation and local date keys. tests/rules.test.js covers ownership, public reads, author spoofing, review uniqueness/ranges, snapshot immutability and atomic T1/win validation. Browser tests should cover onboarding, create task, win T1, optional T2/T3, refresh, theme, template customization and weekly review.

Before production: deploy rules/indexes, run rules tests, authorize the exact domain, sign in with two separate Google accounts, verify cross-user isolation, create/refresh/win a task, publish/use/review a template, test offline continuation, export, and account deletion with a disposable test account.

## Assets

public/landscape.jpg is downloaded from https://images.unsplash.com/photo-1464822759023-fed622ff2c3b, under the Unsplash image license (https://unsplash.com/license). The original photographer has not been verified; no invented attribution is included. UI icons: Lucide, ISC license. Fonts: DM Sans and Manrope via Google Fonts; system sans-serif fallback when offline. The app icon is original SVG geometry generated for this build.

## Verified in this build

- Production Vite build passed; installable PWA manifest and service worker generated.
- 13 domain/serialization tests passed.
- 7 Firebase Firestore emulator security tests passed, including maximum-size tier payloads and atomic win validation.
- End-to-end browser test passed for guest onboarding, task creation, all three tiers, incremental totals, refresh persistence, Day Won, weekly grid, analytics, template customization, saved weekly reflection, theme persistence, and 390px mobile overflow checks on eight routes.
- Screenshot previews are test-only example data, not production seeds.
- Live Google auth and the supplied production Firebase project have NOT been exercised or deployed. Follow the owner activation steps above.

Source modules: App.jsx (router/shell/onboarding), components.jsx (shared UI), screens/Today.jsx, Tasks.jsx, Insights.jsx, Templates.jsx, Account.jsx, store.jsx (auth/data provider), domain.js (pure rules and calculations), serialization.js (Firestore-safe map conversion), firebase.js (client configuration), styles.css.

To rerun the browser test locally, first install Chromium with npx playwright install chromium and keep npm run preview -- --port 4173 running in a second terminal after npm run build; then npm run test:browser.

## Mobile readability update

Phone layouts now use 14–16px reading text, 16px form inputs to avoid iOS focus zoom, 44px minimum icon targets and 48px primary buttons. Single-column panels and template cards replace compressed columns. Requirement editors put the activity above amount/unit, and phone task actions have their own row. Headings scale fluidly; the hero is shorter to bring tasks closer to the first screen. Bottom navigation supports safe-area insets, and browser zoom remains enabled. Desktop styles and all Firebase logic/rules are unchanged.

For an existing deployment, the functional UI change is src/styles.css only. Replace that file, run npm run build, and redeploy the generated assets. Do not replace your existing Firebase configuration or database to apply this visual update.

Additional test: npm run test:mobile (with the preview server running on port 4173) checks 12 routes at 320, 360, 390, 430, and 760 pixels in dark and light themes: 120 combinations. It verifies no page-level horizontal overflow, 16px input fonts, 44px minimum primary/icon touch targets, and readable body copy. The weekly data table can scroll inside its panel without making the whole page wider.

## Inline Today wins update

Today is now the primary action surface. Each task card shows the highest tier already won (or an achievable start), only the requirements still needed for the next tier, and one Win T1/T2/T3 button. A click records all remaining requirements for that tier; the user should do that work before tapping. There is no Start/View win detour, extra confirmation, or celebration page. T2 and T3 are labeled optional; after T3 there is no further action. A short inline acknowledgment replaces a modal. Existing deep-linked task pages remain compatible, but Today does not require them. Timeline rows are read-only summaries rather than navigation traps.

The new winLevel action uses the same user-scoped documents and immutable daily snapshots. Requirements and the deterministic win event are merged in one batch for existing cloud sessions. No rules or schema migration is needed. Target-level retries are idempotent; a brief disabled state prevents a double-click from accidentally awarding the following level. Existing partial requirement checks and past wins remain intact.

Changed source files: src/TodayTaskCard.jsx (new), src/screens/Today.jsx, src/store.jsx, src/domain.js, src/styles.css. Apply all five, not CSS alone. Rebuild and deploy your frontend; do not replace Firebase configuration or delete data.

Verification for this update: 17 domain/serialization/inline-action tests, 8 Firestore emulator tests including all three inline multi-requirement tier writes, guest browser tests verifying URL remains on Today through T1/T2/T3 and refresh persistence/double-click protection, and the 120 mobile layout combinations. Live production Firebase has not been modified or exercised.

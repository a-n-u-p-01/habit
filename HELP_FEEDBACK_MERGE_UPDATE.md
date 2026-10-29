# Unified Help & feedback page

One /help destination now contains three clearly labeled sections:
1. Guide & answers: daily workflow, tiers, troubleshooting, weekly reflection, privacy and sync answers, plus useful app shortcuts.
2. Report or suggest: the existing private feedback form, with distinct problem-report and improvement prompts and a confirmation link to track submissions.
3. Your submissions: the signed-in user's own feedback and status filter.

The feedback component remains mounted while switching sections, retaining its form state. Navigation links use query parameters so sections can be bookmarked and browser Back/Forward works. The legacy /feedback URL redirects to /help?section=feedback. Settings and sidebar now use one Help & feedback entry; staff retain a separate permission-protected admin inbox.

Guests can read guidance without signing in; sending and tracking feedback still require sign-in. Existing Firestore permissions, submission/status workflows and privacy boundaries are unchanged. No data was migrated or deleted. All previous project updates are included.

Checks: all 55 unit tests passed; local-module JSX/CSS bundle passed with external third-party imports. Isolated Chromium CSS fixtures passed at 280/320/390/760/1024/1440px in both themes for contained section navigation and form controls. Access-browser selectors were updated for the new section flow. Full Vite build and React/emulator navigation/submission tests remain unverified due earlier dependency-download restrictions.

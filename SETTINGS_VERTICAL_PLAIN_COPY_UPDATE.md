# Vertical Settings and plain storage information

Settings now uses one full-width vertical sequence: Account, Appearance, Data & privacy. The two-column layout and nested side stack are removed. Removed the redundant Preferences eyebrow, signed-in identity tagline, repeated sign-in caption and unnecessary Appearance description.

The account section shows the actual app name and account actions. The name field helper now says: This name appears on templates and reviews you share.

Storage copy is conditional and factual:
- Signed in: Saved changes are stored online when connected. Sign in with the same Google account on another device to access your habits, progress and reflections.
- Guest: Your data is saved in this browser only. Sign in to save changes online and access them on other devices.
- Existing guest records get a short note that they can be imported after sign-in; they are not falsely described as already uploaded.

No manual sync instruction, normal connection-status label, export option or motivational tagline was added. Saving, sign-in/out, theme, privacy, cache cleanup, guest import and deletion behavior are unchanged. All previous updates are included.

Validation: all 80 unit tests and the local-module JSX/CSS bundle passed with third-party imports external. Isolated Chromium layout fixtures passed for signed-in and guest Settings at 280/320/390/760/1024/1440px in both themes, verifying aligned vertical sections and no page-level overflow. Full React/Vite/Firestore workflows remain unverified due earlier dependency-download restrictions. No live deployment was performed.

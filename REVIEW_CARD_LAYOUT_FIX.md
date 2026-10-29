# Weekly review card layout fix

Cause: an earlier mobile rule gave the button width: 100%, while a later rule forced its parent into a non-wrapping flex row. The button took the entire row and squeezed Weekly review down to a few pixels.

Fixed the weekly review callout with an explicit grid. Desktop uses icon/title/button columns; phones at 480px and below stack a readable title above a full-width, 44px-minimum button. Other sizes use title/button columns with an auto-width button. Scoped sizing and margin rules now override the conflicting legacy mobile styles.

Validation: all 50 unit tests and the local-module JSX/CSS syntax check passed. Chromium CSS-fixture tests passed at 280, 320, 390, 480, 600, 760, 1024 and 1440px in both themes: title remains readable, button stays inside the card, no page-level horizontal overflow. These were isolated checks using the real stylesheet and representative markup, not full React-app tests. Full Vite/emulator checks remain unverified due the earlier dependency-download restrictions.

All previous project updates are included. No data or behavior changes.

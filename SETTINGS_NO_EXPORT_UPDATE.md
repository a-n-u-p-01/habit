# Settings: remove JSON download

Removed the Export your data row, JSON description, export button and its Settings download handler. Updated Help shortcuts/privacy guidance so they no longer direct users to download JSON. Tightened spacing in the remaining privacy card.

No replacement feature was added just to fill space. Account identity, appearance, sign-in/out, conditional device import/cache cleanup and protected account deletion remain. No user data was deleted. All previous project updates are included.

Checks: all 50 unit tests passed; local-module JSX/CSS bundle passed with third-party imports external. The privacy browser test now checks that Settings has no export button. Full Vite build and React/emulator browser tests remain unverified due earlier dependency-download restrictions.

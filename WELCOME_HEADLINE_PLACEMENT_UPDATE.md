# Welcome headline placement

The left image panel used justify-content: space-between, which pushed its main message toward the bottom. It also capped the text width and forced unnecessary extra wrapping.

Moved the habit-builder message into the upper part of the image, widened its text area and strengthened the dark overlay behind the white text. On mobile, the image header no longer stretches to fill spare page height and push the headline down. Short desktop viewports get a smaller top offset.

Copy, the three-step welcome flow, Google/guest actions and all existing functionality remain unchanged. All previous fixes, including the profile-name payload correction, are included.

Validation: all 99 unit tests passed. All three welcome steps passed isolated Chromium CSS checks at 280/320/390/600/760/1024/1440px in both themes, including an upper-headline-position assertion, contained actions and Google-button hover contrast. Desktop and phone previews using the actual supplied landscape were visually checked. These are isolated layout checks, not full React/OAuth tests. No live deployment was performed.

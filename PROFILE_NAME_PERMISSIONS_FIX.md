# App-name setup: permissions correction

The screenshot shows a Firestore permission-denied response during profile-name saving. It does not prove which rules are currently deployed, but a concrete client bug was found in the bundled code:

The profile transaction used merge:true. If a legacy profile still contained provider email or other fields, those fields remained in request.resource.data. The bundled rules intentionally allow only displayName, nameConfirmed, photoURL, updatedAt and createdAt, so the merged write was denied.

Correction:
- Save an explicit allowed-field profile document instead of merging legacy fields.
- Preserve an existing createdAt exactly; create a server timestamp only for a genuinely new profile. Undated old profiles remain undated.
- Keep name/photo validation and owner-only rules intact. Do not fall back to broader writes or weaken access rules.
- Profile-document replacement does not delete private habit/progress subcollections.
- Shorten the setup screen and show a useful access-settings error with optional technical details instead of raw Firebase text.
- Remove the incorrect claim that the app never uses the Google profile photo; the existing app can use the authorized Google avatar.

## Deployment check — important
The client is configured for Firebase project habit-builder-f86b4. Its deployed Firestore rules must match the included firestore.rules, including the optional immutable createdAt field. Older deployed rules that reject createdAt can still reject new-profile creation even after this client correction.

I did not access, inspect or change the live project's rules.

To update the deployed app:
1. Publish the included firestore.rules to the same Firebase project (Firebase console → Firestore Database → Rules, or your existing deployment workflow). Keep the owner/staff protections; do not switch to allow-all rules.
2. Run/deploy this updated client, refresh the page and retry the app name.

If the error remains, the live permission configuration needs checking against the deployed project and the error shown under Error details; this archive is not a claim that live access is repaired.

## Validation
All 99 unit tests passed, including five new tests covering allowed payload fields, removal of legacy fields, exact join-date preservation, input/photo validation and clear error mapping. Local-module JSX/CSS checks passed with third-party imports external. Added an emulator regression for rejecting the old merged payload and accepting the replacement while preserving private habits; that emulator test and the full live save flow were not run because of the previously documented dependency/runtime restrictions.

All previous project updates are included. No live deployment, security-rule change or stored-user-data operation was performed here.

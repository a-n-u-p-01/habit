# Users & roles page redesign

- Clean list: Google profile photo, name, ID, role. Search and All/Admins/Users filters with counts. No email shown.
- Google photos: stored on each profile when the user signs in (Google-hosted HTTPS URLs only, validated by rules and when rendered). Older profiles already holding a Google photo show it immediately. The user's own avatar uses it too.
- All users visible to admins/super admins (including accounts without a chosen name, flagged "Name not chosen yet").

Publish the included firestore.rules and deploy the app. Privacy note: admins can now see users' Google profile photos.

Tests: 27 rules, admin/role/feedback flow, privacy flow and 140 mobile checks pass.

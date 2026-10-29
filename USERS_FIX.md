# Fix: admins and super admins now see every user

Cause: the published rules let staff read only profiles with a chosen app name, and the Users page queried only those. Accounts that had not opened the newer version yet were hidden.

Fix: staff can read all app profiles (normal users still cannot read other profiles). The Users page lists everyone; accounts without a chosen name show "name not chosen yet". No email is shown. Nothing else changed.

IMPORTANT: publish the included firestore.rules (Firebase Console → Firestore → Rules → Publish) and deploy the frontend. Rules alone fix the hidden accounts only if the deployed page also stops filtering.

Tests: 27 rules tests and the admin/role/feedback browser flow pass, including a legacy-profile visibility check.

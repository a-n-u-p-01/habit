# Start here

The full source and a tested production dist/ build are included.

1. Read README.md for the exact Firestore models and MVP build order.
2. Install: npm ci
3. Run: npm run dev
4. Test: npm test
5. Build: npm run build

Firebase web config is already filled in. Before cloud features work on your domain, the project owner must enable Google Authentication, authorize the domain, create Firestore if needed, and deploy firestore.rules plus firestore.indexes.json. See README.md for commands and safeguards.

Verification: 13 logic/serialization tests, 7 Firestore emulator rule tests, production build, and end-to-end guest browser checks all passed. Live production Firebase sign-in and deployment are not verified.

No backend server is required. Reminder time is a UI preference only, not closed-app push delivery. The app starts empty: screenshot/test example data is never seeded into a real user's account.

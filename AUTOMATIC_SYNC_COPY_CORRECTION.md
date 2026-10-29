# Correct misleading sync instructions

Removed “Sync before closing this tab” from the Settings privacy description. The privacy card now discusses privacy only.

Help now states precisely that cloud synchronization is automatic after a change is saved and a connection is available, and that there is no manual sync button. Existing offline/tab-memory limitations remain explained. Cache-removal and offline sign-out messages no longer instruct the user to perform a nonexistent manual sync operation; they describe waiting for pending saves instead.

Copy only: no new sync control, autosave behavior or persistence change was introduced. Forms that require Save still require Save. All previous updates are included.

Checks: all 55 unit tests and local-module JSX/CSS syntax checks passed with third-party imports external. Full React-app tests remain unverified.

---
status: accepted
---

# Store sign-in is its own seam

The website signs in with a Google popup. The store app signs in with a native Google ID token, then `signInWithCredential`, so the Firebase user is still `google.com`. Redirect is not a way to sign in. `AuthProvider` remains the only Firebase Auth listener. The native plugin returns the credential and does not keep a second session.

This is a seam because two adapters exist. Firestore, club state, and the pages stay on the one web client. A second client seam around them would be hypothetical.

Sign in with Apple will extend this same module, and only on the iOS store app. One person stays one Firebase uid. That extension is a later change to this decision, not a second record.

## Considered options

- `signInWithRedirect` inside the store WebView. Rejected: the popup and the redirect both fail there, and the website must not start a redirect. GitHub Pages is not Firebase Hosting, and iOS Safari loses the session on the auth handler.
- A Firestore port with a second adapter for the store app. Rejected: there is still one UI.
- Letting the native Firebase Auth SDK own the session. Rejected: the website already listens to the JavaScript SDK. Skipping native auth keeps one session.

# Is there an easy reason phone alerts do not arrive?

## Answer

No. The cause is not easy.

No cause was identified from primary sources that is both sufficient to explain the missed alerts and small enough to fix in one session. Phone-alert repair, and the 24-hour next-meeting alert that depends on it, leave the map. The next meeting display does not.

## What the repo sends

Chat is the only phone alert. `notifyChatMessage` in `functions/src/index.ts` is a Cloud Functions v2 Firestore trigger on `clubs/{clubId}/messages/{messageId}`. It reads the other members' `users/{uid}/fcmTokens` documents and calls Firebase Admin `sendEach` with a notification title and body, `data.clubCode`, and an optional web-push link and icon. If that token list is empty, it returns without sending.

The site writes those tokens from `src/lib/push.ts`. On a production build it registers `firebase-messaging-sw.js` as an ES module, calls `getToken` with `VITE_FIREBASE_VAPID_KEY`, and stores `{ token, origin, base, updatedAt }` under `users/{uid}/fcmTokens`. `src/lib/chat.ts` writes each message to `clubs/{code}/messages/{id}` with `authorId`, `authorName`, `text`, and `createdAt`. Member documents use the Google user id as the document id (`src/lib/storeJoin.ts`), which is the id the function treats as the recipient.

Firestore rules allow that token write only for the signed-in user, and only with those four fields (`firestore.rules`). The Admin SDK used by the function bypasses those rules when it reads tokens.

## What was verified

The published website is configured to subscribe. `https://wrigh4d.github.io/family-book-club/` loads `/family-book-club/assets/main-CDnBu3sK.js`. That bundle registers `/family-book-club/firebase-messaging-sw.js` with `type: "module"` and scope `/family-book-club/`, then calls `getToken` with a non-empty VAPID key and that registration. The service worker is present, starts with an `import` of `./assets/index.esm-DLDoc0st.js`, and that chunk contains the web config for project `familybookclub-52781`, including a non-empty `VITE_FIREBASE_VAPID_KEY`. The worker then calls the bundled `initializeApp` with that config and starts messaging. `manifest.webmanifest` sets `display` to `standalone`. The GitHub Actions secret named `VITE_FIREBASE_VAPID_KEY` exists; the published bundle, not the secret value, is the evidence that the key is non-empty.

GitHub Actions does not publish the sender. `.github/workflows/deploy.yml` only builds the site and deploys GitHub Pages. `firebase.json` declares the functions codebase and no hosting site. The README says the notification function is deployed separately, with `firebase deploy --only functions,firestore:rules`, after `firebase login`. Firebase's own setup guide says a production function deploy requires the Blaze plan, and that a Firestore trigger runs only after that deploy (`https://firebase.google.com/docs/functions/get-started`, retrieved 2026-10-25). Source in git is not enough.

The client and the function agree on the path. A created message document matches `chatNotificationFromData` in `functions/src/text.ts`. The function skips the author. Firebase's receive guide says a background message that includes a notification payload is displayed by the messaging service worker (`https://firebase.google.com/docs/cloud-messaging/js/receive`, retrieved 2026-10-25). The function sends that notification payload. The worker calls `getMessaging()`, which registers the push handler.

`getToken` is still what this repo stores, and the installed `@firebase/messaging` package still exports it (`node_modules/@firebase/messaging/dist/esm/src/api/getToken.d.ts`). The current web client guide marks that token API deprecated and describes Firebase Installation IDs instead (`https://firebase.google.com/docs/cloud-messaging/js/client`, retrieved 2026-10-25). The same guide still documents `getToken` as the legacy way to obtain a registration token. Deprecation is not evidence that a stored token can no longer be delivered. Replacing tokens with installation IDs would be a new registration path, not a one-session patch.

iPhone web push is a platform limit. Apple's documentation says web push for Home Screen web apps starts in iOS 16.4, and that Safari on iOS does not provide it the way a Home Screen web app does (`https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers`, retrieved 2026-10-25). The README and the chat screen say the same thing. That limit is not, by itself, a code change.

## What was not verified

Whether `notifyChatMessage` is deployed was not visible from this machine.

- `firebase` is not on PATH. `%USERPROFILE%\.config\configstore\firebase-tools.json` has no login tokens. `gcloud` is not installed. No service-account JSON was in the repo.
- Unauthenticated calls to `cloudfunctions.googleapis.com` and `run.googleapis.com` for project `familybookclub-52781` returned 401.
- `https://us-central1-familybookclub-52781.cloudfunctions.net/notifyChatMessage` returned an HTML 404, "The requested URL was not found on this server." Firebase documents that host for HTTP functions created with `onRequest`, and the CLI prints it for those functions (`https://firebase.google.com/docs/functions/get-started`). `notifyChatMessage` is `onDocumentCreated`, not an HTTP function, so that 404 does not show that the trigger is absent.
- `https://familybookclub-52781.web.app` and `https://familybookclub-52781.firebaseapp.com` also returned 404. This repo does not configure Firebase Hosting, so those 404s only show that Hosting is not serving the site.

No Firestore export, function log, or device trace was available. Nothing here shows whether the owner's phone has a saved token, whether permission was granted, or whether the phone is an iPhone that was not opened from the Home Screen icon.

`functions/lib/index.js` is an older compile of the same sender: it still calls `sendEach` for other members' tokens. `firebase.json` has no predeploy build. That drift does not explain a phone that never receives an alert.

## Why it is not easy

An easy cause would be one we can name from primary sources and fix with a small change or a single unpublished deploy, without a new notification architecture, a native store push rewrite, or days of device debugging.

The published site is not missing its web push key, so "the browser never subscribes because the key was never published" is not the cause. "The sender was never deployed" would be an easy fix if it were shown. It was not shown. No mismatch in the message path, the member id, the token rules, or the published client was shown to block every phone. The remaining possibilities are an unverified deploy or billing gap, a phone that never stored a token, the iOS Home Screen limit, or the modular service worker. Firebase's receive guide says ES modules in service workers are not widely supported and that a modular worker should be bundled or loaded with `importScripts`. The published worker is a module that imports another file. That is a risk, not a demonstrated failure on this phone, and confirming it would be device debugging.

## Sources

- `functions/src/index.ts`, `functions/src/text.ts`, `functions/lib/index.js`, `functions/package.json`
- `src/lib/push.ts`, `src/lib/chat.ts`, `src/lib/storeJoin.ts`, `src/firebase-messaging-sw.ts`, `src/pages/ChatPage.tsx`
- `firestore.rules`, `firebase.json`, `.github/workflows/deploy.yml`, `README.md`
- Published files fetched 2026-10-25: `https://wrigh4d.github.io/family-book-club/`, `https://wrigh4d.github.io/family-book-club/assets/main-CDnBu3sK.js`, `https://wrigh4d.github.io/family-book-club/firebase-messaging-sw.js`, `https://wrigh4d.github.io/family-book-club/assets/index.esm-DLDoc0st.js`, `https://wrigh4d.github.io/family-book-club/manifest.webmanifest`
- `https://firebase.google.com/docs/functions/get-started`
- `https://firebase.google.com/docs/cloud-messaging/js/client`
- `https://firebase.google.com/docs/cloud-messaging/js/receive`
- `https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers`
- `@firebase/messaging` `getToken` and `register` type declarations in this repo's `node_modules`

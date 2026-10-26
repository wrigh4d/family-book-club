# Why an existing member's club stays hidden until they rejoin

## Answer

The club is already stored on the signed-in user's `users/{uid}` document. After sign-in the home page and My clubs paint that document from the Firestore IndexedDB cache, and on an iPhone that cache does not pick up the server copy until the page is loaded again. Joining again writes `clubs.{code}` locally, so the same listener updates without waiting for the server. This is not the cause of the empty club link.

## What the page shows

Home (`Landing`) and My clubs (`MyClubs`) both call `useJoinedClubs` only after a display name exists. `useJoinedClubs` renders whatever `subscribeJoinedClubs` emits. That listener does not query `clubs/{code}/members`. It reads `users/{uid}` and parses `clubs` with `parseUserClubs` (`subscribeJoinedClubs`, `parseUserClubs`).

`discoverAndRememberClubs` is the only other way a membership gets onto that document. It returns immediately when `needsClubIndex` is false, and `needsClubIndex` is false once `clubsIndexedAt` is a number (`needsClubIndex`). The scan that would find `createdBy == uid` clubs and `members` rows with this `uid` (`collectDiscoveredClubCodes`) does not run again.

Once that scan's promise settles, `subscribeJoinedClubs` sets `discovered` and emits the memberships it has, including an empty list (`subscribeJoinedClubs`). An empty list is the "No clubs yet" / "Create or join a club to get started." state (`MyClubs`, `Landing`).

## Why that list stays empty

`createDb` turns on `persistentLocalCache({ tabManager: persistentMultipleTabManager() })` whenever `indexedDB` exists (`createDb`). Firestore's web cache is off unless the app does this. With it on, a listener's first snapshot is the local cache, fetched at the same time as the server copy, and `metadata.fromCache === true` means that snapshot can be stale or incomplete. A later event is not delivered when only that metadata flag changes, unless the listener was opened with `includeMetadataChanges: true`.

`subscribeJoinedClubs` does not pass that option and does not look at `fromCache`. `discoverAndRememberClubs` uses `getDoc`, which may return the same cached user document when the server cannot be reached. A cached numeric `clubsIndexedAt` then skips the scan, so nothing rewrites `clubs`.

On multi-tab persistence, only the primary tab applies remote document updates. It writes them to IndexedDB and tells other tabs through `localStorage`. The primary lease is refreshed through IndexedDB; if that refresh fails, the client keeps the state it already has. iOS Safari drops its IndexedDB connection when a page is backgrounded and does not open a new one until the page is reloaded. The failure text is to refresh the page. Website sign-in is a Google popup (`googleSignInPath`), which backgrounds the club page for the Google window. That is the moment the user document listener is left on the cached `users/{uid}` that does not yet show `clubs`.

A hard refresh creates a new Firestore client, so the listener gets the server document and the club is listed. No new membership write is required for that, which is how we know the club was already on `users/{uid}.clubs`.

## Why joining again also shows it

`joinClub` followed by `rememberClubMembership` updates `users/{uid}` at `clubs.{code}` (`rememberClubMembership`, `writeUserClubMemberships`). A local write notifies existing snapshot listeners immediately, before the backend acknowledges it. The listener `subscribeJoinedClubs` already holds then emits the new membership. That is why rejoining works while the remote snapshot is still stuck.

`saveProfile` can also stamp `clubsIndexedAt` when `getDoc` says the user document does not exist (`saveProfile`). That is a separate way a cached miss permanently skips the scan. It is not what happened when a hard refresh alone showed the club: that stamp does not delete an existing `clubs` map, and a reload would stay empty only if the server document had never stored the club.

An empty cached `getDocs` is not an error. Offline, a collection query with nothing cached returns an empty result. `collectDiscoveredClubCodes` would treat that as a finished scan (`complete === true`) and `writeUserClubMemberships` would store `clubsIndexedAt` without any club rows. That still does not remove clubs already on the server document. It only matters for a member whose user document has no `clubs` map yet.

## Not the empty club page

[Why a club link renders an empty page on iPhone](https://github.com/wrigh4d/family-book-club/issues/70) is a different gate. `ClubShell` returns nothing until both a display name and the club snapshot exist. The club route's sign-in screen is shown only when there is no uid. Website sign-in never starts a redirect; startup only calls `getRedirectResult` to clear a leftover one, because iOS Safari loses the session on the auth handler. That page does not read `users/{uid}.clubs`. My clubs is empty only after sign-in has already produced a display name, because `useJoinedClubs` is not started without one.

## Not the service worker

`firebase-messaging-sw.ts` calls `getMessaging()` and does not handle `fetch`. `messagingRegistration` registers that worker only after notification permission is granted. It does not cache the club list or the user document. Vite does not add an app-shell worker.

## Change

Make the signed-in client show the server's `users/{uid}.clubs` without another join:

1. In `createDb`, use `memoryLocalCache()` when `isIosDevice()` is true. Leave `persistentLocalCache({ tabManager: persistentMultipleTabManager() })` for other browsers. A memory cache does not depend on the IndexedDB primary lease that iOS drops during the sign-in popup.
2. In `subscribeJoinedClubs`, pass `{ includeMetadataChanges: true }` and do not emit an empty membership list while `snapshot.metadata.fromCache` is true. Emit when a server snapshot arrives so `parseUserClubs` shows the stored clubs.
3. In `discoverAndRememberClubs`, read the user document with `getDocFromServer` before `needsClubIndex`. A cached `clubsIndexedAt` must not skip the scan. Keep `saveProfile` from setting `clubsIndexedAt` based on a cached `getDoc` that says the document is missing; use `getDocFromServer` there too.

Do not change the messaging service worker. Do not change the club-link sign-in gate for this bug.

## Sources

- `src/lib/firebase.ts`, `createDb`. Persistent multi-tab cache when `indexedDB` exists.
- `src/lib/storeClubs.ts`, `subscribeJoinedClubs`, `discoverAndRememberClubs`, `needsClubIndex`, `collectDiscoveredClubCodes`, `rememberClubMembership`, `writeUserClubMemberships`.
- `src/lib/clubParse.ts`, `parseUserClubs`.
- `src/lib/useJoinedClubs.ts`, `useJoinedClubs`. Home and My clubs pass a uid only when `displayName` is set (`src/pages/Landing.tsx`, `src/pages/MyClubs.tsx`).
- `src/lib/storeCore.ts`, `saveProfile`.
- `src/lib/storeJoin.ts`, `joinClub`, `loadProfile`.
- `src/lib/auth.tsx`, `AuthProvider`. Popup sign-in; `getRedirectResult` does not start a redirect. `src/lib/signInPath.ts`, `googleSignInPath`. `src/lib/pwa.ts`, `isIosDevice`.
- `src/pages/ClubLayout.tsx`, `ClubShell`. `docs/adr/0002-store-sign-in.md`. Empty club link.
- `src/firebase-messaging-sw.ts`. `src/lib/push.ts`, `messagingRegistration`. `vite.config.ts`. No app-shell cache.
- Firestore offline cache: a `fromCache` snapshot may be stale or incomplete, and metadata-only changes do not emit unless `includeMetadataChanges` is set. An offline collection query with nothing cached is empty. https://firebase.google.com/docs/firestore/manage-data/enable-offline
- Listeners take an initial snapshot from the local cache and fetch the server concurrently. Local writes notify listeners immediately (latency compensation). https://firebase.google.com/docs/firestore/query-data/listen
- `getDoc` may return cached data if the server cannot be reached. `getDocFromServer` does not. https://firebase.google.com/docs/reference/js/firestore.md#getdoc
- Multi-tab persistence shares one IndexedDB cache. Remote document updates are applied by the primary client and broadcast through `localStorage`. https://firebase.google.com/docs/reference/js/firestore.md#enablemultitabindexeddbpersistence and `IndexedDbPersistence` in https://github.com/firebase/firebase-js-sdk/blob/main/packages/firestore/src/local/indexeddb_persistence.ts
- Web default is an in-memory cache. https://firebase.google.com/docs/firestore/manage-data/enable-offline
- iOS IndexedDB connections do not recover after the networking process drops them; the page must reload. Backgrounding the page is a reported trigger. https://bugs.webkit.org/show_bug.cgi?id=309386 https://bugs.webkit.org/show_bug.cgi?id=197050

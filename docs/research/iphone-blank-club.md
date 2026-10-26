# Why a club link renders an empty page on iPhone

A club link on an iPhone stays empty because that visit never gets both a display name and a club snapshot, and the club screens render nothing until both exist. Signing in on the home page works because that page can finish a Google popup and store a session. This is not the same cause as [Why an existing member's club stays hidden until they rejoin](https://github.com/wrigh4d/family-book-club/issues/71).

## What paints nothing

These screens return no elements when `uid`, `displayName`, or the club snapshot is missing:

- `ClubShell` in `src/pages/ClubLayout.tsx` (`if (!displayName || !state) return null`)
- `ClubHome` in `src/pages/ClubHome.tsx`
- `ShortlistPage` in `src/pages/ShortlistPage.tsx`
- `HistoryPage` in `src/pages/HistoryPage.tsx`
- `ChatPage` in `src/pages/ChatPage.tsx` (also requires `code`)
- `Present` in `src/pages/Present.tsx`

`ClubLayout` is the route element for `/club/:code` (`AppRoutes` in `src/App.tsx`). Its `ClubGate` is meant to run before that outlet. `ClubGate` shows "Getting you in…" while auth is not `ready`, the Google sign-in card when there is no `uid`, the name form when there is no `displayName`, and "Loading club…" when `state` is null. Only the last branch renders `<Outlet />`. Source: `ClubGate` in `src/pages/ClubLayout.tsx`.

So a signed-out member who reaches a ready auth state should see "Continue with Google" (`GoogleSignInCard` in `src/components/ui.tsx`), not a blank tree. The iPhone visit does not get that far. Auth does not become a signed-in member with a name, so `useClub` never subscribes, `state` stays null, and the club screens have nothing to show. The home page is the place that actually completes sign-in.

## Why the iPhone visit has no session

The website's only sign-in is a Google popup. `googleSignInPath(false)` returns `'popup'`, and `GOOGLE_SIGN_IN_PATHS` is `['popup', 'native-credential']`. Source: `googleSignInPath` in `src/lib/signInPath.ts`. `signInWithGoogle` in `AuthProvider` (`src/lib/auth.tsx`) calls `signInWithPopup` for that path. It does not call `signInWithRedirect`. The store app is the other path and is not this bug. Source: `docs/adr/0002-store-sign-in.md`.

Firebase's Google guide says to use a popup or a redirect, and that the redirect method is preferred on mobile devices. Source: [Authenticate Using Google with JavaScript](https://firebase.google.com/docs/auth/web/google-signin). The same guide says a redirect must be finished by calling `getRedirectResult` when the page loads. `getRedirectResult` returns the signed-in user on success, fails on an unsuccessful sign-in, and returns `null` when no redirect was started. Source: [`getRedirectResult`](https://firebase.google.com/docs/reference/js/auth.md#getredirectresult).

This app does call `getRedirectResult(auth)` on startup, and then discards a success. The call only stores an error when it rejects. Source: the effect in `AuthProvider` (`src/lib/auth.tsx`), comment "Clear leftover redirect flows without blocking the auth listener." A leftover redirect therefore cannot become the member. A new redirect is never started. `shouldFallbackToGoogleRedirect` in `src/lib/errors.ts` still treats `auth/popup-blocked` as a redirect case, but nothing calls it. An earlier popup failure used to fall through to `signInWithRedirect` (commit `f3fa9bb`, "Fix Auth problem for IOS devices", removed that fallback). The comment that replaced it says Safari/iOS often lose `sessionStorage`.

That matches WebKit. Intelligent Tracking Prevention blocks third-party cookies with no exceptions, partitions third-party LocalStorage and IndexedDB and makes them ephemeral, and deletes script-writable storage after 7 days with no interaction on the site. That storage includes IndexedDB, LocalStorage, SessionStorage, and service worker registrations. Source: [Tracking Prevention in WebKit](https://webkit.org/tracking-prevention/) ("Partitioned Third-Party Storage", "Full Third-Party Cookie Blocking", and "Capped Lifetime For All Script-Writeable Website Data"). A redirect result stored for the auth helper cannot be read back on iPhone. GitHub Pages also cannot do the fixes Firebase requires for a redirect: same-origin `authDomain` on Firebase Hosting, or a reverse proxy of `/__/auth/` to `firebaseapp.com`. Source: [Best practices for signInWithRedirect](https://firebase.google.com/docs/auth/web/redirect-best-practices) (overview, Option 1, Option 3). The deploy workflow publishes a static site. Source: `.github/workflows/deploy.yml`.

Popup is the documented substitute, and Firebase warns that it is a poor mobile path: popups are occasionally blocked, and the flow is less smooth on mobile. If popup is a problem, one of the other options is required. Source: the same best-practices page, Option 2. Those other options are the hosting changes above, self-hosting the helper, or signing in with the provider and exchanging an ID token through `signInWithCredential`. This repo does none of those on the website.

`getAuth()` is what the website uses (`auth` in `src/lib/firebase.ts`). That function is `initializeAuth` with `indexedDBLocalPersistence`, `browserLocalPersistence`, `browserSessionPersistence`, and `browserPopupRedirectResolver`. Source: [Customize your Auth Dependencies](https://firebase.google.com/docs/auth/web/custom-dependencies). Defining that resolver makes the library do extra work at startup. On mobile browsers it opens an iframe to the auth domain preemptively. The same page says to leave the resolver off `initializeAuth` and pass it only into the sign-in call, which avoids that startup iframe. The redirect best-practices page says the iframe does not work in browsers that block third-party storage. Safari is one of those browsers (WebKit page above). A club-link load on an iPhone therefore starts the helper that cannot finish, and the only button that could sign the member in is a popup with no fallback.

Until `onAuthStateChanged` yields a Google user, `displayName` stays null. `loadProfile` runs only after a user exists (`AuthProvider` in `src/lib/auth.tsx`, `loadProfile` in `src/lib/storeJoin.ts`). `useClub` builds `sessionKey` only when `ready && uid && displayName && code`. The club listener and `joinClub` run only when that key is set. Source: `ClubProvider` in `src/lib/useClub.tsx`. No name means no `subscribeClub` (`src/lib/storeLive.ts`) and no snapshot. `state` is null whenever the snapshot key does not match `sessionKey`.

The home page uses the same `signInWithGoogle`, but its screen is the sign-in card whenever auth is ready and there is no uid (`Landing` in `src/pages/Landing.tsx`). A tap there is a user gesture on a document GitHub serves as HTTP 200. After that popup stores a session, a later club view has a uid and a name, `useClub` subscribes, and the snapshot can render. That is the "sent to the home page and signed in again" recovery. It does not mean the club URL has a second sign-in implementation.

## The club URL itself

GitHub Pages has no file for `/club/:code`. The deploy copies the built shell to the custom 404:

```yaml
- name: SPA fallback for GitHub Pages
  run: cp dist/index.html dist/404.html
```

Source: `.github/workflows/deploy.yml`. GitHub's own docs only describe `404.html` as the page shown for a missing file, not as a client-side router. Source: [Creating a custom 404 page for your GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site).

Checked on 2026-10-26 against `https://wrigh4d.github.io/family-book-club/`:

- `/` is HTTP 200, `Content-Length: 1675`, ETag `"6ac98f1a-68b"`.
- `/club/TESTCODE` is HTTP 404 with the same length and ETag.
- The body is the SPA shell: a module script and a stylesheet, and an empty `<div id="root"></div>`. There is no `<noscript>` body.

`BrowserRouter` uses `import.meta.env.BASE_URL` (`App` in `src/App.tsx`). The live shell's assets are rooted at `/family-book-club/`, so the script URL does not depend on the club path. The router can match `/club/:code` when the browser runs that shell. The 404 status is not, by itself, the empty render. The shell still has to get a session before any club screen will leave `null`.

## What does not cause it

The messaging worker is not a navigation interceptor. The site registers `firebase-messaging-sw.js` only while enabling push (`messagingRegistration` in `src/lib/push.ts`), and only after a uid exists (`useForegroundPush` in `src/lib/useForegroundPush.ts`). The worker calls `getMessaging()` and does not add a `fetch` listener. Source: `src/firebase-messaging-sw.ts`. A club link is not blank because a service worker swallowed the document.

Firestore's multi-tab cache is also not this bug. `createDb` in `src/lib/firebase.ts` uses `persistentLocalCache` with `persistentMultipleTabManager()` when IndexedDB exists. That can stall listeners, but the reported recovery was a new sign-in on the home page, not a reload of a session that already had a name. The club list is a different read.

## Not the hidden-club bug

[Why an existing member's club stays hidden until they rejoin](https://github.com/wrigh4d/family-book-club/issues/71) is the list of clubs after sign-in. That list is `subscribeJoinedClubs` on `users/{uid}`, and it stays empty until `rememberClubMembership` writes `clubs.{code}` or a hard refresh delivers a write that is already there. Source: `subscribeJoinedClubs`, `discoverAndRememberClubs`, and `rememberClubMembership` in `src/lib/storeClubs.ts`. `useJoinedClubs` in `src/lib/useJoinedClubs.ts` does not run on the club route.

The club page does not read that index. Once a uid and a display name exist, `subscribeClub` reads the club document directly. Rules allow `get` on `clubs/{clubId}` for any signed-in Google user. Source: `match /clubs/{clubId}` in `firestore.rules`, and the comment in `ClubProvider` (`src/lib/useClub.tsx`). Rejoining is what writes the user-doc index. It is not what fills an empty club screen. Different read, different recovery.

## The change that shows the club or a sign-in prompt

Do this on the website only. Do not start `signInWithRedirect`.

1. In `src/lib/firebase.ts`, stop using `getAuth()` for the website. Call `initializeAuth` with the same persistence `getAuth()` uses (`indexedDBLocalPersistence`, then `browserLocalPersistence`, then `browserSessionPersistence`) and do not pass `popupRedirectResolver`. Leave the native `initializeAuth` call as it is. This is the setup in [Customize your Auth Dependencies](https://firebase.google.com/docs/auth/web/custom-dependencies) that does not open the auth-domain iframe on mobile startup.

2. In `AuthProvider` (`src/lib/auth.tsx`), delete the startup `getRedirectResult` call. It cannot sign anyone in here, and it is the redirect helper running on every club link.

3. Keep `signInWithPopup`. Pass `browserPopupRedirectResolver` as the third argument on that call only, so the helper loads from the button tap. `googleSignInPath` stays `'popup'` on the website.

4. A club URL with no uid shows the existing Google sign-in card (`ClubGate` when `ready` is true and `uid` is null). No display name keeps the name form. No snapshot keeps "Loading club…" and the error already rendered there. `ClubShell`, `ClubHome`, `ShortlistPage`, `HistoryPage`, `ChatPage`, and `Present` must not `return null` for a missing uid, display name, or snapshot. Those `null` returns are the empty page if the outlet renders without both values.

After that, a club link with a session renders the club once the snapshot arrives. A club link without a session renders the sign-in card instead of an empty tree. The home page is no longer required.

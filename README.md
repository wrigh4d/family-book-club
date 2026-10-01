# Book Club

A small phone-friendly website for a book club. Share a GitHub Pages link, join with a **name and a club code**,
keep a standing shortlist, and **present** when you meet so everyone sees the same current book and next-book options.

It exists because the first fantasy pick was a hit, a later non-fiction pick was not, and a book some people had already
read killed momentum. The app is for picking something the group will actually read—not a social network.

## How a club runs

Only the **owner** moves the club from one phase to the next. Everyone else can still vote, rate, nominate, and view
presenting once the owner has started it.

1. **First book (once)**  
   Until there is a current book, the club is a setup screen. The owner searches Open Library or picks from globally
   popular titles. Members wait.

2. **Between meetings**  
   Current book (rate 1–5, optional comment), genre votes for next time, and a **Shortlist (N)** page to search
   and add books. Genre is taken from Open Library subjects, not a dropdown. No app recs on this screen.

3. **Present this meeting** (owner)  
   Recs are computed **once** from this cycle’s genre votes and past ratings, then frozen. The presenting view shows the
   current book, comments (omitted if none), rules, genre lean, a looping shortlist strip (omitted if
   empty), and up to two recs:
    - most popular in the lead genre
    - from past club ratings (hidden until something has been rated)

   **Back** leaves without finishing. **Conclude meeting** is owner-only.

4. **Conclusion** (owner)  
   Add a rec to the shortlist if you want it. Pick the next current book from the shortlist or search Open Library. Recs
   that were **shown** and **not** added to the shortlist are ignored for future presentations (so the same popular
   title does not keep coming back). The shortlist itself **does not reset**.

## What it does

- Sign in with Google, then create / join a club with a display name + code
- Rules board (honor system)
- Persistent club shortlist, including “I’ve already read this”
- Comments on the current book, shown in presenting if anyone wrote one
- Meeting recs from Open Library (subjects, popularity, past ratings/tags)
- Owner-only phase changes
- One chat room per club. Each message shows the member’s club name and the time it was sent

Identity is a Google account (Firebase Auth). The same Google account on phone and PC is the same club member. A club
nickname is still stored separately (`users/{uid}`) so the roster and the chat can say “Dad” instead of a Gmail name.

Local Vite and GitHub Pages share **one** Firebase project. GitHub Pages does **not** publish Firestore rules.

## Firebase

Rules require a Google-signed-in user. Club writes require membership. Round create during club creation uses
`existsAfter` so the owner batch succeeds.

Club codes are document IDs. Anyone who knows a code can join; the rules forbid listing `/clubs`. Owner is `createdBy`
or `members/{uid}.role == 'owner'`. Members cannot change their own role.

Do not commit `serviceAccountKey.json` or the Admin SDK. The web `apiKey` / `projectId` config is enough.

Chat messages live at `clubs/{code}/messages`. Only a member can read or create them. The write must use that member’s
Google user id and the display name stored on their member document, plus Firebase’s server time. Messages cannot be
edited or deleted.

## Phone notifications

A message can ping the other members when the site is closed. That needs a small install on the phone, and a one-time
Firebase setup. Until the setup is done, the chat room still works.

On a phone:

1. Open the site in Safari (iPhone) or Chrome (Android).
2. Add it to the Home Screen.
3. Open **Book Club** from that icon.
4. Open **Chat** and tap **Enable notifications**, then **Allow**.

On an iPhone the alert only works from that Home Screen icon, on iOS 16.4 or newer. The sender is not pinged for their
own message. Opening the alert goes to that club’s chat.

Firebase setup, once:

1. Upgrade project `familybookclub-52781` to the Blaze plan. Cloud Functions will not deploy without a billing account.
   A family chat stays inside the free quota.
2. Firebase console → Project settings → Cloud Messaging → Web configuration → Generate key pair. That public key is
   the web push certificate.
3. Put it in `.env.local` as `VITE_FIREBASE_VAPID_KEY` for `npm run preview`, and add the same value as a GitHub Actions
   secret named `VITE_FIREBASE_VAPID_KEY` so the published site can subscribe.
4. From this repo, after `firebase login`: `firebase deploy --only functions,firestore:rules`.

GitHub Actions still publishes only the website. It does not deploy rules or the notification function. `npm run dev`
does not register for notifications; use the published site or `npm run build` and `npm run preview`.

## Run locally

```bash
cd family-book-club
npm install
npm test
npm run dev
```

## Deploy to GitHub Pages

Repo name `family-book-club` matches `VITE_BASE` in `.github/workflows/deploy.yml`.

1. Push `main` to GitHub.
2. **Settings → Pages → Source: GitHub Actions**.
3. After the workflow succeeds: `https://<you>.github.io/family-book-club/`.

## Stack

Vite, React, TypeScript, Tailwind, Firebase Auth (Google) + Firestore, Cloud Functions for chat notifications, Open Library.

## Recs

- **Genre rec:** popular Open Library title in the genre the group voted for this cycle.
- **Ratings rec:** after books have been rated, lean into well-rated tags and shy away from poorly rated ones.
- Exclude: current book, history, shortlist, and previously shown recs that were not shortlisted (including close title
  matches).
- Empty recs are not rendered.

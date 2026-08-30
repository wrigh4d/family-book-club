# Family Book Club

A small phone-friendly website for a family book club. Share a GitHub Pages link, join with a **name and a club code**, keep a standing shortlist, and **present** when you meet so everyone sees the same current book and next-book options.

It exists because the first fantasy pick was a hit, a later non-fiction pick was not, and a book some people had already read killed momentum. The app is for picking something the group will actually read—not a social network.

## How a club runs

Only the **owner** moves the club from one phase to the next. Everyone else can still vote, rate, nominate, and view presenting once the owner has started it.

1. **First book (once)**  
   Until there is a current book, the club is a setup screen. The owner searches Open Library or picks from globally popular titles. Members wait.

2. **Between meetings**  
   Current book (rate 1–5, optional personal note), genre votes for next time, and a **Shortlist (N)** page to search and add books. Genre is taken from Open Library subjects, not a dropdown. No app recs on this screen.

3. **Present this meeting** (owner)  
   Recs are computed **once** from this cycle’s genre votes and past ratings, then frozen. The presenting view shows the current book, personal notes (slow scroll, omitted if none), rules, genre lean, a looping shortlist strip (omitted if empty), and up to two recs:
   - most popular in the lead genre
   - from past club ratings (hidden until something has been rated)

   **Back** leaves without finishing. **Conclude meeting** is owner-only.

4. **Conclusion** (owner)  
   Add a rec to the shortlist if you want it. Pick the next current book from the shortlist or search Open Library. Recs that were **shown** and **not** added to the shortlist are ignored for future presentations (so the same popular title does not keep coming back). The shortlist itself **does not reset**.

## What it does

- Create / join a club with a display name + code (no email)
- Rules board (honor system)
- Persistent club shortlist, including “I’ve already read this”
- Personal notes on the current book, shown in presenting if anyone wrote one
- Meeting recs from Open Library (subjects, popularity, past ratings/tags)
- Owner-only phase changes

Identity is per device (Firebase anonymous auth). Clearing the browser or switching phones is a new person until accounts exist.

## Firebase

The public web config is in the project. You still need Anonymous auth and Firestore.

### Anonymous sign-in

**[Authentication → Sign-in method](https://console.firebase.google.com/project/familybookclub-52781/authentication/providers)**

1. **Get started** if you see it.
2. **Anonymous** → On → Save.

### Firestore

**[Firestore Database](https://console.firebase.google.com/project/familybookclub-52781/firestore)**

1. **Create database**.
2. Start in test mode (family-grade; `firestore.rules` is in the repo).
3. Pick a location and create.

On the live site, add `YOUR_USERNAME.github.io` under Authentication → Settings → **Authorized domains**.

Do not commit `serviceAccountKey.json` or the Admin SDK. The web `apiKey` / `projectId` config is enough.

## Run locally

```bash
cd family-book-club
npm install
npm test
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Deploy to GitHub Pages

Repo name `family-book-club` matches `VITE_BASE` in `.github/workflows/deploy.yml`.

1. Push `main` to GitHub.
2. **Settings → Pages → Source: GitHub Actions**.
3. After the workflow succeeds: `https://<you>.github.io/family-book-club/`.

## Stack

Vite, React, TypeScript, Tailwind, Firebase Auth (anonymous) + Firestore, Open Library.

## Recs (at Present, not between meetings)

- **Genre rec:** popular Open Library title in the genre the group voted for this cycle.
- **Ratings rec:** after books have been rated, lean into well-rated tags and shy away from poorly rated ones.
- Exclude: current book, history, shortlist, and previously shown recs that were not shortlisted (including close title matches).
- Empty recs are not rendered.

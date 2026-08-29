# Family Book Club

A small phone-friendly website for a family book club. Share a link, join with a name and a code, collect rules and nominations, then **present** the next book when you meet.

Live idea: pick a book people will actually read. The first fantasy book was a hit; a later non-fiction pick was not; a book some people had already read killed momentum. This app captures what people want **this round** and suggests a next book from that.

## What it does (v1)

- Create / join a club with a **display name + club code** (no email)
- Club **rules** board (honor system — the app does not verify them)
- Each **round**: vote genres, search Open Library, nominate books, flag “I’ve already read this”
- A shortlist plus one **suggestion**, using this round’s genres, past ratings, and a soft already-read penalty
- **Presenting mode** for the meetup (large type)
- Rate the finished book 1–5 so the next round steers toward genres the group liked

Later (not built yet): Google/email accounts, a current-book page, personal notes.

## You still need to click two things in Firebase

The web app config is already in the project. Firebase will refuse sign-in and data until these two products exist.

### 1. Anonymous sign-in

Open this page (you must be logged into the Google account that owns the project):

**[Authentication → Sign-in method](https://console.firebase.google.com/project/familybookclub-52781/authentication/providers)**

1. If you see **Get started**, click it.
2. In the list of providers, click **Anonymous**.
3. Turn it **On** / **Enable**, then **Save**.

If the left menu looks different: open the project `familybookclub-52781` → **Build** (or **Security**) → **Authentication** → **Sign-in method** tab → **Anonymous**.

### 2. Create Firestore (this is the database, not “Firestone”)

Open:

**[Firestore Database](https://console.firebase.google.com/project/familybookclub-52781/firestore)**

1. Click **Create database**.
2. Choose **Start in test mode** (we ship stricter rules in `firestore.rules`; test mode is fine for a family club).
3. Pick a location close to you (for example `nam5` / Iowa) and **Enable** / **Create**.

Wait until the empty data viewer appears. Then the app can store clubs.

### Do not use the service account

The snippet that starts with `firebase-adminsdk` / `serviceAccountKey.json` is a **server secret**. Do not put it in this website or in GitHub. The public web config (`apiKey`, `projectId`, …) is enough.

## Run locally

```bash
cd family-book-club
npm install
npm test
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Deploy to GitHub Pages

1. Create a GitHub repo named `family-book-club`.
2. Push this folder to `main`.
3. GitHub → **Settings** → **Pages** → **Source: GitHub Actions**.
4. After the workflow runs, the site is at `https://<you>.github.io/family-book-club/`.

If the repo name is not `family-book-club`, change `VITE_BASE` in `.github/workflows/deploy.yml`.

## Stack

Vite, React, TypeScript, Tailwind, Firebase Auth (anonymous) + Firestore, Open Library search.

## Suggestion scoring

For each nominated book:

1. How many people voted that **genre this round**
2. How the group **rated past books** in that genre (boosts or penalizes, never bans)
3. Minus a small amount per **already-read** flag

Highest score is the suggestion. The rest is the shortlist. Locking a round freezes that pick so presenting mode does not jump mid-meeting.

# Load-time performance (`perf/load-times`)

Measured by counting Firestore round-trips / listener waterfalls in code (no production
telemetry). Family clubs are small; wins are mostly latency and duplicate work, not payload size.

## What felt slow

| Path | Before | After |
|------|--------|-------|
| **Open club** | `joinClub` (2× `getDoc`) **then** start ~6–7 snapshots → first paint waits on a serial waterfall; each snapshot re-rendered separately | Listeners start **immediately** in parallel with join; first `onData` waits until club + members + rules + shortlist + history (+ round/votes) have all arrived once; later updates coalesce via `queueMicrotask` |
| **Club history on home** | Live state kept **only the current** history doc; every shortlist/present/prune mutation did `getDocs(history)` | Club subscription listens to the **full** `history` collection; mutations reuse live state (`stateWithHistory` no-ops while subscribed) |
| **Past books tab** | Second `onSnapshot(history)` via `useClubHistory` | Reuses club state history (one shared listener) |
| **My Clubs** | Per club: `getDoc(club)` **+** `getDoc(member)` → **2N** reads | Membership already on user doc → **N** club reads only |
| **One-time club discovery** | 3 discovery queries **sequential** | Same 3 queries in **`Promise.all`** (≈3× faster wall clock when indexing) |
| **Auth ready** | Awaited `getRedirectResult` **before** `onAuthStateChanged` | Redirect cleanup runs in background; auth listener starts immediately |
| **Open Library facts/subjects** | Re-fetched per mount / rate | In-memory promise cache per work id |

## Query-count sketch (returning member opens a club)

**Before (critical path):** auth profile `getDoc` → join 2× `getDoc` → then listeners fire (club, members, rules, shortlist, round, genreVotes, current history) ≈ **3 serial stages** before useful UI; mutations later add **1× history collection read** each.

**After:** auth profile `getDoc` ∥ club listeners start with join’s 2× `getDoc`; **one** coalesced first paint; mutations **0** history collection reads while the club page is open.

## Intentionally unchanged

- Chat still requires membership (`isMember`); join remains required, just not on the critical path for club home reads (rules allow signed-in reads of club/shortlist/history/rounds).
- PWA / visual refresh / comments UI left alone (branch is perf-only).

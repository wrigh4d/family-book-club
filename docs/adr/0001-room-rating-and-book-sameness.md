---
status: accepted
---

# Current-book averages and book sameness stay separate

The meeting and the current book count ratings from people still in the club. A past book averages every star stored on that history book, including someone who has left. Those answer different questions, so `roomRating` and `groupRating` stay separate. A later change should not put the room average on the Past books screen.

A club book matches on Open Library id, or on the normalized title when either id is missing. A recommendation also matches when enough title words overlap, so a shown suggestion can be remembered as disliked. Those policies stay two functions in `bookStatus`. Open Library searches and loads subjects. It does not decide that two books are the same.

## Considered options

- One average on every screen. Rejected: when a member leaves, the current book stops counting them, and the past book still shows the score the club gave.
- One sameness check. Rejected: a fuzzy title match is right for a suggestion and wrong for deciding the club already read a book.

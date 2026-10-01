import { useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { availableShortlist, groupRating, pastHistoryBooks } from '../lib/bookStatus'
import { friendlyFirebaseError } from '../lib/errors'
import {
  meetingGridClass,
  meetingMode,
  meetingRootClass,
  meetingSideClass,
  meetingVoiceClass,
} from '../lib/meetingStage'
import { isOwner, resolveCurrentBook, startConcluding } from '../lib/store'
import { topWantedGenre } from '../lib/suggestion'
import { useBookFacts } from '../lib/useBookFacts'
import { useClub } from '../lib/useClub'
import {
  clubVoice,
  featuredQuote,
  lastMeeting,
  meetingProgress,
  presentActionClass,
  roomLine,
  useStageLayout,
} from './presentHelpers'
import {
  MeetingComments,
  NowReading,
  RatingsPanel,
  ShortlistCarousel,
} from './presentPanels'
import {
  FeaturedQuoteCard,
  MeetingBackdrop,
  ProgressBadge,
} from './presentPolish'

export function Present() {
  const { code, uid, displayName, state, error, setError } = useClub()
  const navigate = useNavigate()
  const stage = useStageLayout()
  const current = state ? resolveCurrentBook(state) : null
  const owner = state && uid ? isOwner(state, uid) : false
  const facts = useBookFacts(current)
  const voice = useMemo(() => (state ? clubVoice(state) : { comments: [], ratings: [] }), [state])

  if (!uid || !displayName || !state) return null
  if (!current) return <Navigate to={`/club/${code}`} replace />

  const shortlist = availableShortlist(state)
  const past = pastHistoryBooks(state)
  const lean = topWantedGenre(state.genreVotes)
  const previous = lastMeeting(past)
  const roomScore = groupRating(Object.fromEntries(voice.ratings.map((row) => [row.id, row.stars])))
  const ratedIds = new Set(voice.ratings.map((row) => row.id))
  const waiting = state.members.filter((member) => !ratedIds.has(member.id))
  const progress = meetingProgress(voice.ratings.length, state.members.length)
  const quote = featuredQuote(voice.comments)
  const mode = meetingMode(stage, {
    comments: Math.max(voice.comments.length, 1),
    ratings: voice.ratings.length,
  })
  const readers = state.members.length === 1 ? '1 reader' : `${state.members.length} readers`
  const together =
    past.length === 0
      ? null
      : past.length === 1
        ? '1 book together'
        : `${past.length} books together`
  const want = lean ? `${lean.count} of ${lean.voterCount} want ${lean.genre}` : null
  const meta = [readers, want, together].filter(Boolean).join(' · ')
  const room = roomLine(state.members)

  return (
    <div className={`${meetingRootClass(mode)} relative isolate`}>
      <MeetingBackdrop />
      <header className="relative z-10 flex shrink-0 flex-col gap-3 border-b border-gold/25 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="truncate font-display text-xl sm:text-2xl">{state.club.name}</h1>
            <ProgressBadge progress={progress} />
          </div>
          <p className="truncate text-sm text-cream/70" title={meta}>
            {meta}
          </p>
          <p className="truncate text-sm text-cream/50" title={room}>
            In the room · {room}
          </p>
        </div>
        <div className="relative z-10 flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            className={presentActionClass()}
            onClick={() => navigate(`/club/${code}`)}
          >
            Back to club
          </button>
          {owner && uid ? (
            <button
              type="button"
              className={presentActionClass()}
              onClick={() =>
                startConcluding(code, state, uid)
                  .then(() => navigate(`/club/${code}`))
                  .catch((err) => setError(friendlyFirebaseError(err)))
              }
            >
              Conclude meeting
            </button>
          ) : null}
        </div>
      </header>
      {error ? (
        <p
          role="alert"
          className="relative z-10 mx-4 mt-3 shrink-0 rounded-xl border border-gold/40 bg-burgundy px-3 py-2 text-sm text-cream sm:mx-6"
        >
          {error}
        </p>
      ) : null}

      {quote ? (
        <div className="relative z-10 mt-3">
          <FeaturedQuoteCard quote={quote} />
        </div>
      ) : null}

      <div className={`relative z-10 ${meetingGridClass(mode, shortlist.length > 0)}`}>
        <NowReading
          current={current}
          facts={facts}
          average={roomScore?.average ?? null}
          ratedCount={roomScore?.count ?? 0}
          memberCount={state.members.length}
          waiting={waiting.map((member) => member.displayName)}
          rules={state.rules}
          previous={previous}
          quiet={voice.comments.length === 0 && voice.ratings.length === 0}
        />
        <div className={meetingSideClass(mode)}>
          <div className={meetingVoiceClass(mode)}>
            <MeetingComments comments={voice.comments} />
            {voice.ratings.length > 0 ? <RatingsPanel ratings={voice.ratings} /> : null}
          </div>
        </div>
        <ShortlistCarousel books={shortlist} members={state.members} />
      </div>
    </div>
  )
}

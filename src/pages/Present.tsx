import { useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { CommentSection } from '../components/CommentSection'
import { availableShortlist, groupRating, pastHistoryBooks } from '../lib/bookStatus'
import { friendlyFirebaseError } from '../lib/errors'
import {
  meetingGridClass,
  meetingMode,
  meetingRootClass,
  meetingSideClass,
  meetingVoiceClass,
  recCoverClass,
  recsFill,
} from '../lib/meetingStage'
import { isOwner, resolveCurrentBook, savePersonalNote, startConcluding } from '../lib/store'
import { topWantedGenre } from '../lib/suggestion'
import { useBookFacts } from '../lib/useBookFacts'
import { useClub } from '../lib/useClub'
import {
  clubVoice,
  lastMeeting,
  presentActionClass,
  recSlidesFromState,
  roomLine,
  useStageLayout,
} from './presentHelpers'
import { NowReading, RatingsPanel, RecommendationsPanel, ShortlistCarousel } from './presentPanels'

export function Present() {
  const { code, uid, displayName, state, error, setError } = useClub()
  const navigate = useNavigate()
  const stage = useStageLayout()
  const current = state ? resolveCurrentBook(state) : null
  const owner = state && uid ? isOwner(state, uid) : false
  const facts = useBookFacts(current)
  const voice = useMemo(() => (state ? clubVoice(state) : { comments: [], ratings: [] }), [state])
  const recs = useMemo(() => (state ? recSlidesFromState(state) : []), [state])

  if (!uid || !displayName || !state) return null
  if (!current) return <Navigate to={`/club/${code}`} replace />

  const shortlist = availableShortlist(state)
  const past = pastHistoryBooks(state)
  const lean = topWantedGenre(state.genreVotes)
  const previous = lastMeeting(past)
  const roomScore = groupRating(Object.fromEntries(voice.ratings.map((row) => [row.id, row.stars])))
  const ratedIds = new Set(voice.ratings.map((row) => row.id))
  const waiting = state.members.filter((member) => !ratedIds.has(member.id))
  const mode = meetingMode(stage, {
    comments: Math.max(voice.comments.length, 1),
    ratings: voice.ratings.length,
    recs: recs.length,
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
    <div className={meetingRootClass(mode)}>
      <header className="flex shrink-0 flex-col gap-3 border-b border-gold/25 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl sm:text-2xl">{state.club.name}</h1>
          <p className="truncate text-sm text-cream/70" title={meta}>
            {meta}
          </p>
          <p className="truncate text-sm text-cream/50" title={room}>
            In the room · {room}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
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
          className="mx-4 mt-3 shrink-0 rounded-xl border border-gold/40 bg-burgundy px-3 py-2 text-sm text-cream sm:mx-6"
        >
          {error}
        </p>
      ) : null}

      <div className={meetingGridClass(mode, shortlist.length > 0)}>
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
            <section className="meeting-panel flex min-w-0 flex-col rounded-3xl border border-gold/35 bg-burgundy/30 p-4 ring-1 ring-gold/10">
              <CommentSection
                tone="meeting"
                comments={voice.comments}
                ariaLabel="Comment on the current book"
                onSave={(text) => savePersonalNote(code, state, uid, text)}
                onError={(err) => setError(friendlyFirebaseError(err))}
              />
            </section>
            {voice.ratings.length > 0 ? <RatingsPanel ratings={voice.ratings} /> : null}
          </div>
          {recs.length > 0 ? (
            <RecommendationsPanel recs={recs} fill={recsFill(mode)} cover={recCoverClass(mode)} />
          ) : null}
        </div>
        <ShortlistCarousel books={shortlist} members={state.members} />
      </div>
    </div>
  )
}

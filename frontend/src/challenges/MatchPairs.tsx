import { useState } from 'react'
import type { MatchChallenge, PictureId } from '../content/pack'
import { matchPair } from '../core/education'
import { pl } from '../i18n/pl'

function Picture({ id }: { id: PictureId }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" shapeRendering="crispEdges">
      {id === 'blanket' && <>
        <path fill="#9c695e" d="M4 4h16v15H4zM5 19h2v3H5zM9 19h2v3H9zM13 19h2v3h-2zM17 19h2v3h-2z" />
        <path fill="#d9907d" d="M6 6h12v11H6z" />
        <path fill="#f9cd95" d="M6 9h12v2H6zM6 14h12v2H6z" />
      </>}
      {id === 'pillow' && <>
        <path fill="#648d80" d="M4 7h16v2h2v7h-2v2H4v-2H2V9h2z" />
        <path fill="#a6c8aa" d="M5 9h14v7H5z" />
        <path fill="#d3ddaf" d="M7 10h9v2H7z" />
      </>}
      {id === 'basket' && <>
        <path fill="#946648" d="M5 13V7h2V4h10v3h2v6h3v4h-2v4H4v-4H2v-4zm2 0h10V8h-2V6H9v2H7z" />
        <path fill="#d4a56e" d="M3 13h18v3H3zM6 17h12v3H6z" />
        <path fill="#a77653" d="M8 16h2v4H8zM14 16h2v4h-2z" />
      </>}
    </svg>
  )
}

export function MatchPairs({ challenge, busy, onComplete }: {
  challenge: MatchChallenge
  busy: boolean
  onComplete: () => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [matched, setMatched] = useState<readonly string[]>([])
  const [feedback, setFeedback] = useState<'chooseWord' | 'wrong' | 'correct' | null>(null)
  const [hint, setHint] = useState(false)
  const text = pl.challenges[challenge.text]
  const words = pl.match

  return (
    <div className="challenge">
      <p id="interaction-body">{text.instructions}</p>
      <div className="activity-choices matching" role="group" aria-label={words.wordGroup}>
        {challenge.pairs.map(({ id, word }) => {
          const done = matched.includes(id)
          return <button key={id} type="button" className={selected === id ? 'primary' : 'secondary'}
            aria-pressed={selected === id} aria-label={done ? words.matched(words.words[word]) : undefined}
            disabled={busy || done}
            onClick={() => { setSelected(id); setFeedback(null) }}>{words.words[word]}{done && ' ✓'}</button>
        })}
      </div>
      <div className="activity-choices matching" role="group" aria-label={words.pictureGroup}>
        {challenge.pictureOrder.map((picture) => {
          const done = challenge.pairs.some((pair) => pair.picture === picture && matched.includes(pair.id))
          return <button key={picture} type="button" className="picture-choice secondary"
            aria-label={words.pictures[picture]} disabled={busy || done}
            onClick={() => {
              const next = matchPair(challenge, matched, selected, picture)
              if (next === matched) {
                setFeedback(selected ? 'wrong' : 'chooseWord')
                return
              }
              setMatched(next)
              setSelected(null)
              setFeedback('correct')
              if (next.length === challenge.pairs.length) onComplete()
            }}><Picture id={picture} />{done && <span aria-hidden="true">✓</span>}</button>
        })}
      </div>
      <p className="challenge-feedback" role="status">{feedback && words[feedback]}</p>
      {hint && <p className="challenge-feedback">{text.hint}</p>}
      <div className="challenge-actions">
        <button className="secondary" type="button" aria-pressed={hint} disabled={busy}
          onClick={() => setHint(!hint)}>{pl.trace.hint}</button>
      </div>
    </div>
  )
}

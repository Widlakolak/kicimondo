import { useState } from 'react'
import type { MatchChallenge } from '../content/pack'
import { matchPair } from '../core/education'
import { pl } from '../i18n/pl'

import { Picture } from './Picture'

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
  const clue = hint && challenge.pairs.find((pair) => pair.id === selected)

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
      {hint && <p className="challenge-feedback picture-hint">
        {clue && <span role="img" aria-label={words.pictures[clue.picture]}><Picture id={clue.picture} /></span>}
        {text.hint}
      </p>}
      <div className="challenge-actions">
        <button className="secondary" type="button" aria-pressed={hint} disabled={busy}
          onClick={() => setHint(!hint)}>{pl.trace.hint}</button>
      </div>
    </div>
  )
}

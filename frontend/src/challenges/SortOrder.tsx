import { useState } from 'react'
import type { SortChallenge, SortGroup, SortItemId } from '../content/pack'
import { placeSortItem } from '../core/education'
import { pl } from '../i18n/pl'
import { Picture } from './Picture'

export function SortOrder({ challenge, busy, onComplete }: {
  challenge: SortChallenge
  busy: boolean
  onComplete: () => void
}) {
  const text = pl.challenges[challenge.text]
  const labels = pl.sort
  const [selected, setSelected] = useState<SortItemId | null>(null)
  const [placed, setPlaced] = useState<readonly SortItemId[]>([])
  const [feedback, setFeedback] = useState<'choose' | 'wrongOrder' | 'wrongGroup' | 'correct' | null>(null)
  const [hint, setHint] = useState(false)

  function place(item: SortItemId | null, group?: SortGroup) {
    if (item === null) {
      setFeedback('choose')
      return
    }
    const next = placeSortItem(challenge, placed, item, group)
    if (next === placed) {
      setFeedback(challenge.mode === 'sequence' ? 'wrongOrder' : 'wrongGroup')
      return
    }
    setPlaced(next)
    setSelected(null)
    setFeedback('correct')
    if (next.length === challenge.items.length) onComplete()
  }

  return (
    <div className="challenge">
      <p id="interaction-body">{text.instructions}</p>
      <div className="activity-choices sort-choices" role="group" aria-label={labels.choices}>
        {challenge.items.map(({ id, picture }) => {
          const position = placed.indexOf(id)
          const group = challenge.mode === 'categories' && challenge.assignments[id]
          const detail = position < 0 ? null : group ? labels.groups[group] : String(position + 1)
          return <button key={id} type="button" className={selected === id ? 'primary' : 'secondary'}
            aria-pressed={challenge.mode === 'categories' ? id === selected : undefined}
            disabled={busy || position >= 0} onClick={() => {
              if (challenge.mode === 'sequence') place(id)
              else { setSelected(id); setFeedback(null) }
            }}>
            {picture && <Picture id={picture} />}
            {labels.items[id]}{detail && ` · ${detail} ✓`}
          </button>
        })}
      </div>
      {challenge.mode === 'categories' && (
        <div className="activity-choices sort-choices" role="group" aria-label={labels.destinations}>
          {challenge.groups.map((group) => (
            <button key={group} type="button" className="secondary" disabled={busy}
              onClick={() => place(selected, group)}>
              {challenge.groupPictures?.[group] && <Picture id={challenge.groupPictures[group]} />}
              {labels.groups[group]}
            </button>
          ))}
        </div>
      )}
      <p className="challenge-feedback" role="status">
        {labels.progress(placed.length, challenge.items.length)} {feedback && labels[feedback]}
      </p>
      {hint && <p className="challenge-feedback">{text.hint}</p>}
      <div className="challenge-actions">
        <button type="button" className="secondary" disabled={busy} aria-pressed={hint}
          onClick={() => setHint(!hint)}>{pl.trace.hint}</button>
        <button type="button" className="secondary" disabled={busy}
          onClick={() => { setPlaced([]); setSelected(null); setFeedback(null); setHint(false) }}>{pl.trace.retry}</button>
      </div>
    </div>
  )
}

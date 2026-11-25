import { useState } from 'react'
import type { MathChallenge } from '../content/pack'
import { mathQuestions } from '../core/education'
import { pl } from '../i18n/pl'

export function MathChoice({ challenge, busy, onComplete }: {
  challenge: MathChallenge
  busy: boolean
  onComplete: () => void
}) {
  const [questions] = useState(() => mathQuestions(challenge))
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [hint, setHint] = useState(false)
  const question = questions[index]
  const { left, right, operation } = question
  const last = index === questions.length - 1
  const text = pl.challenges[challenge.text]
  const math = pl.math
  const counter = challenge.counter && math.counters[challenge.counter]
  const prompt = operation === 'count' ? counter?.count ?? math.count : math[operation](left, right)

  function advance() {
    setIndex(index + 1)
    setFeedback(null)
    setHint(false)
  }

  return (
    <div className="challenge">
      <p id="interaction-body">{text.instructions}</p>
      <p className="activity-progress">{math.progress(index + 1, questions.length)}</p>
      <p className="activity-question">{prompt}</p>
      {(operation === 'count' || hint) && (
        <div className={challenge.counter ? `drops ${challenge.counter}-counters` : "drops"}>
          {Array.from({ length: operation === 'add' ? left + right : left }, (_, i) => {
            const crossed = operation === 'subtract' && i >= left - right
            return <span key={i} role="img" aria-label={crossed ? counter?.crossed ?? math.crossedDrop : counter?.item ?? math.drop}
              className={crossed ? 'drop crossed' : i >= left ? 'drop added' : 'drop'} />
          })}
        </div>
      )}
      <div className="activity-choices" role="group" aria-label={math.choices}>
        {question.options.map((option) => (
          <button key={option} type="button" className="secondary"
            disabled={busy || feedback === 'correct'}
            onClick={() => {
              if (option !== question.answer) {
                setFeedback('wrong')
                return
              }
              setFeedback('correct')
              if (last) onComplete()
            }}>{option}</button>
        ))}
      </div>
      <p className="challenge-feedback" role="status">{feedback && math[feedback]}</p>
      {hint && <p className="challenge-feedback">{text.hint}</p>}
      <div className="challenge-actions">
        <button className="secondary" type="button" aria-pressed={hint} disabled={busy}
          onClick={() => setHint(!hint)}>{pl.trace.hint}</button>
        {feedback === 'correct' && !last && <button className="primary" type="button" onClick={advance}>{math.next}</button>}
      </div>
    </div>
  )
}

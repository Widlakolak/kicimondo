import { useEffect, useState, type PointerEvent } from 'react'
import type { TraceChallenge as TraceDefinition } from '../content/pack'
import type { Point } from '../core/room'
import { advanceSequence, drawingPoint, TraceAttempt } from '../core/trace'
import { pl } from '../i18n/pl'

const polyline = (points: readonly Point[]) =>
  points.map(({ x, y }) => `${x * 100},${y * 100}`).join(' ')

export function TraceChallenge({ challenge, busy, onComplete }: {
  challenge: TraceDefinition
  busy: boolean
  onComplete: () => void
}) {
  const [attempt] = useState(() => new TraceAttempt(challenge))
  const [view, setView] = useState(() => attempt.view())
  const [alternative, setAlternative] = useState(false)
  const [sequence, setSequence] = useState(0)
  const [orderError, setOrderError] = useState(false)
  const [hint, setHint] = useState(false)
  const text = pl.challenges[challenge.text]
  const labels = pl.trace
  const start = attempt.samples[0]
  const end = attempt.samples[attempt.samples.length - 1]
  const checkpoint = attempt.samples[view.index]
  const nextTarget = sequence < challenge.targets.length ? labels.nextTarget(sequence + 1) : null
  const feedback = alternative
    ? (orderError ? labels.orderError : nextTarget)
    : view.feedback && labels[view.feedback]

  useEffect(() => {
    const cancel = () => {
      attempt.cancel()
      setView(attempt.view())
    }
    window.addEventListener('blur', cancel)
    window.addEventListener('resize', cancel)
    return () => {
      window.removeEventListener('blur', cancel)
      window.removeEventListener('resize', cancel)
    }
  }, [attempt])

  function point(event: PointerEvent<SVGSVGElement>) {
    return drawingPoint({ x: event.clientX, y: event.clientY }, event.currentTarget.getBoundingClientRect())
  }

  function reset() {
    attempt.reset()
    setView(attempt.view())
    setSequence(0)
    setOrderError(false)
    setHint(false)
  }

  return (
    <div className="challenge">
      <p id="interaction-body">{alternative ? labels.sequence : text.instructions}</p>
      {alternative ? (
        <div className="sequence" role="group" aria-label={labels.targets}>
          {challenge.targets.map((target, index) => (
            <button key={target} type="button" className={index < sequence ? 'primary' : 'secondary'}
              aria-label={labels.target(index + 1)} disabled={busy || index < sequence}
              onClick={() => {
                const next = advanceSequence(sequence, index)
                setOrderError(next === sequence)
                setSequence(next)
                if (next === challenge.targets.length) onComplete()
              }}>{index + 1}</button>
          ))}
        </div>
      ) : (
        <div className="trace-board">
          <svg viewBox="0 0 100 100" role="img" aria-label={labels.board}
            data-progress={view.index}
            onPointerDown={(event) => {
              if (busy || event.button !== 0 || !event.isPrimary) return
              if (attempt.begin(event.pointerId, point(event))) event.currentTarget.setPointerCapture(event.pointerId)
              setView(attempt.view())
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
              attempt.move(event.pointerId, point(event))
              setView(attempt.view())
            }}
            onPointerUp={(event) => {
              if (attempt.finish(event.pointerId, point(event))) onComplete()
              setView(attempt.view())
            }}
            onPointerCancel={(event) => {
              attempt.cancel(event.pointerId)
              setView(attempt.view())
            }}
            onLostPointerCapture={(event) => {
              attempt.cancel(event.pointerId)
              setView(attempt.view())
            }}>
            <polyline className="trace-corridor" points={polyline(challenge.path)} strokeWidth={challenge.tolerance * 200} />
            <polyline className="trace-guide" points={polyline(challenge.path)} />
            {view.index > 0 && <polyline className="trace-progress" points={polyline(attempt.samples.slice(0, view.index + 1))} />}
            <circle className="trace-start" cx={start.x * 100} cy={start.y * 100} r="4" />
            <circle className="trace-end" cx={end.x * 100} cy={end.y * 100} r="4" />
            <text x={start.x * 100} y={start.y * 100 + 9}>{labels.startLabel}</text>
            <text x={end.x * 100} y={end.y * 100 + 9}>{labels.endLabel}</text>
            {view.index > 0 && <circle className="trace-checkpoint" cx={checkpoint.x * 100} cy={checkpoint.y * 100} r="2" />}
          </svg>
        </div>
      )}
      <div className="challenge-feedback" role="status">
        {feedback}
        {hint && <p>{alternative ? labels.sequenceHint : text.hint}</p>}
      </div>
      <div className="challenge-actions">
        <button type="button" className="secondary" aria-pressed={hint} disabled={busy}
          onClick={() => setHint(!hint)}>{labels.hint}</button>
        <button type="button" className="secondary" disabled={busy} onClick={reset}>{labels.retry}</button>
        <button type="button" className="secondary" disabled={busy} onClick={() => {
          reset()
          setAlternative(!alternative)
        }}>{alternative ? labels.tracing : labels.alternative}</button>
      </div>
    </div>
  )
}

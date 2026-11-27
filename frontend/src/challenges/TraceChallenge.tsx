import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
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
  const ink = useRef<SVGPathElement>(null)
  const stroke = useRef<string[]>([])
  const previousSample = useRef<Point | null>(null)
  const awarded = useRef(false)
  const shown = useRef(view)
  const publishProgress = useCallback(() => {
    const next = attempt.view()
    if (next.index === shown.current.index && next.feedback === shown.current.feedback) return
    shown.current = next
    setView(next)
  }, [attempt])

  function award() {
    if (awarded.current) return
    awarded.current = true
    onComplete()
  }
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
      publishProgress()
    }
    const visibility = () => { if (document.hidden) cancel() }
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('blur', cancel)
    window.addEventListener('resize', cancel)
    return () => {
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('blur', cancel)
      window.removeEventListener('resize', cancel)
    }
  }, [attempt, publishProgress])

  function point(event: PointerEvent<SVGSVGElement>) {
    const svg = event.currentTarget
    const matrix = svg.getScreenCTM()
    if (matrix) {
      const client = svg.createSVGPoint()
      client.x = event.clientX
      client.y = event.clientY
      const mapped = client.matrixTransform(matrix.inverse())
      return { x: mapped.x / 100, y: mapped.y / 100 }
    }
    return drawingPoint({ x: event.clientX, y: event.clientY }, svg.getBoundingClientRect())
  }

  function brush(point: Point, start = false) {
    const last = previousSample.current
    if (!start && last && Math.hypot(point.x - last.x, point.y - last.y) < 0.016) return
    const commands = stroke.current
    const x = Math.round(Math.max(-0.15, Math.min(1.15, point.x)) * 1000) / 10
    const y = Math.round(Math.max(-0.15, Math.min(1.15, point.y)) * 1000) / 10
    commands.push(`${start ? 'M' : 'L'}${x} ${y}`)
    if (commands.length > 600) {
      commands.splice(0, 100)
      commands[0] = 'M' + commands[0].slice(1)
    }
    ink.current?.setAttribute('d', commands.join(' '))
    previousSample.current = point
  }

  function reset() {
    if (awarded.current) return
    stroke.current = []
    previousSample.current = null
    ink.current?.removeAttribute('d')
    attempt.reset()
    publishProgress()
    setSequence(0)
    setOrderError(false)
    setHint(false)
  }

  return (
    <div className={alternative ? 'challenge' : 'challenge trace-challenge'}>
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
                if (next === challenge.targets.length) award()
              }}>{index + 1}</button>
          ))}
        </div>
      ) : (
        <div className="trace-board">
          <svg viewBox="0 0 100 100" role="img" aria-label={labels.board}
            data-progress={view.index}
            onPointerDown={(event) => {
              if (busy || event.button !== 0 || !event.isPrimary) return
              const sample = point(event)
              if (attempt.begin(event.pointerId, sample)) {
                event.currentTarget.setPointerCapture(event.pointerId)
                brush(sample, true)
              }
              publishProgress()
            }}
            onPointerMove={(event) => {
              if (!attempt.owns(event.pointerId) || !event.currentTarget.hasPointerCapture(event.pointerId)) return
              const sample = point(event)
              brush(sample)
              if (attempt.move(event.pointerId, sample)) award()
              publishProgress()
            }}
            onPointerUp={(event) => {
              if (attempt.finish(event.pointerId, point(event))) award()
              publishProgress()
            }}
            onPointerCancel={(event) => {
              attempt.cancel(event.pointerId)
              publishProgress()
            }}
            onLostPointerCapture={(event) => {
              attempt.cancel(event.pointerId)
              publishProgress()
            }}>
            <polyline className="trace-corridor" points={polyline(challenge.path)} strokeWidth={challenge.tolerance * 210} />
            <polyline className="trace-guide" points={polyline(challenge.path)} />
            {view.index > 0 && <polyline className="trace-progress" points={polyline(attempt.samples.slice(0, view.index + 1))} />}
            <path ref={ink} className="trace-ink" />
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

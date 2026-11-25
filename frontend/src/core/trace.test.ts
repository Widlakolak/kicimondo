import { describe, expect, it } from 'vitest'
import { challenges, type TraceChallenge } from '../content/pack'
import { advanceSequence, drawingPoint, TraceAttempt } from './trace'

const challenge = challenges['clothes-to-basket']
const path = challenge.path

describe('ordered tracing', () => {
  it('maps pointer coordinates using the current bounds after resizing', () => {
    expect(drawingPoint({ x: 130, y: 85 }, { x: 30, y: 35, width: 200, height: 200 })).toEqual({ x: 0.5, y: 0.25 })
    expect(drawingPoint({ x: 75, y: 50 }, { x: 25, y: 25, width: 100, height: 100 })).toEqual({ x: 0.5, y: 0.25 })
  })

  it('interpolates valid segments, tolerates small offsets, and completes at the end', () => {
    const attempt = new TraceAttempt(challenge)
    const offset = path.map(({ x, y }) => ({ x, y: y + 0.023 }))
    expect(attempt.begin(1, offset[0])).toBe(true)
    for (const point of offset.slice(1, -1)) attempt.move(1, point)
    expect(attempt.finish(1, offset.at(-1)!)).toBe(true)
  })

  it('rejects the end tap and a straight swipe across the curve', () => {
    const attempt = new TraceAttempt(challenge)
    const end = path.at(-1)!
    expect(attempt.begin(1, end)).toBe(false)
    expect(attempt.finish(1, end)).toBe(false)
    expect(attempt.view().feedback).toBe('start')
    attempt.begin(1, path[0])
    expect(attempt.finish(1, end)).toBe(false)
    expect(attempt.view().feedback).toBe('offPath')
    expect(attempt.view().index / (attempt.samples.length - 1)).toBeLessThan(challenge.coverage)
  })

  it('retains ordered progress between valid strokes and allows forward progress after backtracking', () => {
    const attempt = new TraceAttempt(challenge)
    attempt.begin(1, path[0])
    for (const point of path.slice(1, 5)) attempt.move(1, point)
    expect(attempt.finish(1, path[3])).toBe(false)
    expect(attempt.view().feedback).toBe('resume')
    const index = attempt.view().index
    expect(attempt.begin(2, path[0])).toBe(false)
    expect(attempt.begin(2, attempt.samples[index])).toBe(true)
    attempt.move(2, path[4])
    for (const point of path.slice(5, -1)) attempt.move(2, point)
    expect(attempt.finish(2, path.at(-1)!)).toBe(true)
  })

  it('rolls back a cancelled pointer and rejects its late release', () => {
    const attempt = new TraceAttempt(challenge)
    attempt.begin(4, path[0])
    expect(attempt.begin(5, path[0])).toBe(false)
    for (const point of path.slice(1)) attempt.move(4, point)
    expect(attempt.view().index).toBeGreaterThan(0)
    attempt.cancel(5)
    expect(attempt.view().index).toBeGreaterThan(0)
    attempt.cancel(4)
    expect(attempt.view().index).toBe(0)
    expect(attempt.finish(4, path.at(-1)!)).toBe(false)
  })

  it('uses configurable tolerance and requires the end even after covering most of a path', () => {
    const straight: TraceChallenge = { ...challenge, tolerance: 0.025, coverage: 0.9,
      path: [{ x: 0.1, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.9, y: 0.5 }] }
    const attempt = new TraceAttempt(straight)
    expect(attempt.begin(1, { x: 0.1, y: 0.53 })).toBe(false)
    expect(attempt.begin(1, { x: 0.1, y: 0.52 })).toBe(true)
    expect(attempt.finish(1, { x: 0.86, y: 0.52 })).toBe(false)
    expect(attempt.view().index / (attempt.samples.length - 1)).toBeGreaterThan(0.9)
  })

  it('requires ordered input in the button alternative', () => {
    expect(advanceSequence(0, 4)).toBe(0)
    expect(advanceSequence(0, 0)).toBe(1)
    expect(advanceSequence(1, 0)).toBe(1)
    expect(advanceSequence(1, 1)).toBe(2)
  })
})

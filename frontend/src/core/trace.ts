import type { TraceChallenge } from '../content/pack'
import type { Box, Point } from './room'

const sampleSpacing = 0.01
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

function segmentSamples(start: Point, end: Point): Point[] {
  const count = Math.max(1, Math.ceil(distance(start, end) / sampleSpacing))
  return Array.from({ length: count }, (_, index) => {
    const fraction = (index + 1) / count
    return { x: start.x + (end.x - start.x) * fraction, y: start.y + (end.y - start.y) * fraction }
  })
}

export function samplePath(path: readonly Point[]): Point[] {
  return [path[0], ...path.slice(1).flatMap((point, index) => segmentSamples(path[index], point))]
}

export function drawingPoint(client: Point, bounds: Box): Point {
  const side = Math.min(bounds.width, bounds.height)
  return {
    x: (client.x - bounds.x - (bounds.width - side) / 2) / side,
    y: (client.y - bounds.y - (bounds.height - side) / 2) / side,
  }
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  const fraction = lengthSquared ? Math.max(0, Math.min(1,
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)) : 0
  return distance(point, { x: start.x + fraction * dx, y: start.y + fraction * dy })
}

type Feedback = 'start' | 'offPath' | 'resume' | null

export class TraceAttempt {
  readonly samples: readonly Point[]
  private index = 0
  private active: { pointer: number; last: Point } | null = null
  private feedback: Feedback = null
  private completed = false

  constructor(private readonly challenge: TraceChallenge) {
    this.samples = samplePath(challenge.path)
  }

  view() {
    return { index: this.index, feedback: this.feedback }
  }

  begin(pointer: number, point: Point): boolean {
    if (this.active || this.completed) return false
    if (distance(point, this.samples[this.index]) > this.challenge.tolerance) {
      this.feedback = this.index ? 'resume' : 'start'
      return false
    }
    this.active = { pointer, last: point }
    this.feedback = null
    return true
  }

  owns(pointer: number) { return this.active?.pointer === pointer }

  move(pointer: number, point: Point): boolean {
    const active = this.active
    if (active?.pointer !== pointer || this.completed) return false
    const bounded = (value: number) => Math.max(-0.15, Math.min(1.15, value))
    point = { x: bounded(point.x), y: bounded(point.y) }
    if (distance(active.last, point) <= sampleSpacing / 4) return false

    // Sample the observed segment. An excursion leaves a gap but keeps earlier progress.
    const { tolerance, path } = this.challenge
    const last = this.samples.length - 1
    let leftGuide = false
    for (const sample of segmentSamples(active.last, point)) {
      const inGuide = path.some((end, index) => index > 0 && distanceToSegment(sample, path[index - 1], end) <= tolerance)
      if (!inGuide) { leftGuide = true; continue }
      while (this.index < last && distance(sample, this.samples[this.index + 1]) <= tolerance) this.index++
      if (this.index / last >= this.challenge.coverage && distance(sample, this.samples[last]) <= tolerance) {
        this.completed = true
        this.active = null
        return true
      }
    }
    this.feedback = leftGuide ? 'offPath' : null
    active.last = point
    return false
  }

  finish(pointer: number, point: Point): boolean {
    if (!this.owns(pointer)) return false
    const completed = this.move(pointer, point)
    if (!completed) this.cancel(pointer)
    return completed
  }

  cancel(pointer?: number) {
    if (!this.active || (pointer !== undefined && this.active.pointer !== pointer)) return
    this.active = null
    if (this.feedback !== 'offPath') this.feedback = this.index ? 'resume' : 'start'
  }

  reset() {
    this.index = 0
    this.active = null
    this.feedback = null
    this.completed = false
  }
}

export const advanceSequence = (next: number, selected: number) => selected === next ? next + 1 : next

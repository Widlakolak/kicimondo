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
  return { x: (client.x - bounds.x) / bounds.width, y: (client.y - bounds.y) / bounds.height }
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const fraction = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)))
  return distance(point, { x: start.x + fraction * dx, y: start.y + fraction * dy })
}

type Feedback = 'start' | 'offPath' | 'resume' | null

export class TraceAttempt {
  readonly samples: readonly Point[]
  private index = 0
  private active: { pointer: number; checkpoint: number; last: Point | null } | null = null
  private feedback: Feedback = null

  constructor(private readonly challenge: TraceChallenge) {
    this.samples = samplePath(challenge.path)
  }

  view() {
    return { index: this.index, feedback: this.feedback }
  }

  begin(pointer: number, point: Point): boolean {
    if (this.active) return false
    if (distance(point, this.samples[this.index]) > this.challenge.tolerance) {
      this.feedback = this.index ? 'resume' : 'start'
      return false
    }
    this.active = { pointer, checkpoint: this.index, last: point }
    this.feedback = null
    return true
  }

  move(pointer: number, point: Point) {
    const active = this.active
    if (active?.pointer !== pointer || !active.last) return

    // Interpolate sparse browser events so a straight swipe across the curve still leaves the corridor.
    const { tolerance, path } = this.challenge
    if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
      active.last = null
      this.feedback = 'offPath'
      return
    }
    for (const sample of segmentSamples(active.last, point)) {
      if (!path.some((end, index) => index > 0 && distanceToSegment(sample, path[index - 1], end) <= tolerance)) {
        active.last = null
        this.feedback = 'offPath'
        return
      }
      while (this.index < this.samples.length - 1 && distance(sample, this.samples[this.index + 1]) <= tolerance) {
        this.index++
      }
    }
    active.last = point
  }

  finish(pointer: number, point: Point): boolean {
    if (this.active?.pointer !== pointer) return false
    this.move(pointer, point)
    const valid = this.active.last !== null
    this.active = null
    const last = this.samples.length - 1
    const completed = valid && this.index / last >= this.challenge.coverage &&
      distance(point, this.samples[last]) <= this.challenge.tolerance
    if (!completed && valid) this.feedback = 'resume'
    return completed
  }

  cancel(pointer?: number) {
    const active = this.active
    if (!active || (pointer !== undefined && active.pointer !== pointer)) return
    this.index = active.checkpoint
    this.active = null
    this.feedback = this.index ? 'resume' : 'start'
  }

  reset() {
    this.index = 0
    this.active = null
    this.feedback = null
  }
}

export const advanceSequence = (next: number, selected: number) => selected === next ? next + 1 : next

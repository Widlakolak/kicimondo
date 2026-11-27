import { movement, type Direction } from '../core/room'

const still = { x: 0, y: 0 }

export class RoomInput {
  private readonly held = new Map<string, Direction>()
  private requested = false
  private vector = still
  private paused = false
  private backgrounded = false
  revision = 0

  hold(source: string, direction: Direction) {
    if (this.isPaused() || this.held.get(source) === direction) return
    this.revision++
    this.held.set(source, direction)
    this.updateDirection()
  }

  release(source: string) {
    if (this.held.delete(source)) this.updateDirection()
  }

  clear() {
    this.revision++
    this.held.clear()
    this.vector = still
    this.requested = false
  }

  setPaused(paused: boolean) {
    this.clear()
    this.paused = paused
  }

  setBackgrounded(backgrounded: boolean) {
    this.clear()
    this.backgrounded = backgrounded
  }

  isPaused() {
    return this.paused || this.backgrounded
  }

  private updateDirection() {
    this.vector = movement(new Set(this.held.values()))
  }

  direction() {
    return this.vector
  }

  requestInteraction() {
    if (!this.isPaused()) this.requested = true
  }

  takeInteraction() {
    const requested = this.requested
    this.requested = false
    return requested
  }
}

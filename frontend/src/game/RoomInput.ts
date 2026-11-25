import { movement, type Direction } from '../core/room'

export class RoomInput {
  private readonly held = new Map<string, Direction>()
  private requested = false
  private paused = false

  hold(source: string, direction: Direction) {
    if (!this.paused) this.held.set(source, direction)
  }

  release(source: string) {
    this.held.delete(source)
  }

  clear() {
    this.held.clear()
    this.requested = false
  }

  setPaused(paused: boolean) {
    this.clear()
    this.paused = paused
  }

  direction() {
    return movement(new Set(this.held.values()))
  }

  requestInteraction() {
    if (!this.paused) this.requested = true
  }

  takeInteraction() {
    const requested = this.requested
    this.requested = false
    return requested
  }
}

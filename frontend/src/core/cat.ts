import type { CatDefinition, CatId } from '../content/catCatalog.ts'
import { canStand, type Box, type Point } from './room.ts'

export type CatActivity = 'idle' | 'walking' | 'resting' | 'drinking' | 'playing' | 'petting'
type Destination = { position: Point; activity: Exclude<CatActivity, 'walking' | 'petting'>; object?: string }
export type CatState = {
  position: Point
  activity: CatActivity
  facing: 1 | -1
  elapsed: number
  nextVisit: number
  destination: Destination | null
  spot: string | null
}

const idleDuration = 3400
const restDuration = 2000
const petDuration = 1300
const speed = 44

export function startCat(cat: CatDefinition): CatState {
  return { position: cat.greet, activity: 'idle', facing: 1, elapsed: 0, nextVisit: 0, destination: null, spot: null }
}

export const canPet = (state: CatState) => state.activity === 'idle'

export function petCat(state: CatState): CatState {
  return canPet(state) ? { ...state, activity: 'petting', elapsed: 0 } : state
}

export function clearCatRoute(from: Point, to: Point, solids: readonly Box[]) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy)))
  for (let step = 0; step <= steps; step++) {
    if (!canStand({ x: from.x + dx * step / steps, y: from.y + dy * step / steps }, solids)) return false
  }
  return true
}

export function stepCat(state: CatState, cat: CatDefinition, delta: number, restored: readonly string[],
  solids: readonly Box[], paused: boolean, occupied?: ReadonlyMap<string, CatId>): CatState {
  if (paused || delta <= 0) return state
  const idle = cat.pace?.idleMs ?? idleDuration
  const elapsed = state.elapsed + Math.min(delta, 40)
  const destination = state.destination
  if (state.activity === 'walking' && destination) {
    const { x, y } = destination.position
    const dx = x - state.position.x
    const dy = y - state.position.y
    const distance = Math.hypot(dx, dy)
    const step = Math.min(distance, (cat.pace?.speed ?? speed) * Math.min(delta, 40) / 1000)
    const position = distance === 0 ? destination.position :
      { x: state.position.x + dx * step / distance, y: state.position.y + dy * step / distance }
    if (!canStand(position, solids)) return { ...state, activity: 'idle', elapsed: 0, destination: null }
    if (step === distance) {
      return { ...state, position, activity: destination.activity, elapsed: 0, destination: null,
        spot: destination.object ?? null }
    }
    return { ...state, position, elapsed }
  }

  if (state.activity === 'petting') {
    return elapsed < petDuration ? { ...state, elapsed } : { ...state, activity: 'idle', elapsed: idle }
  }
  if (elapsed < (state.activity === 'idle' ? idle : restDuration)) return { ...state, elapsed }
  let next: Destination = { position: cat.greet, activity: 'idle' }
  if (state.activity === 'idle') {
    const available = cat.attractions.filter(({ object }) => restored.includes(object) &&
      (!occupied?.has(object) || occupied.get(object) === cat.id))
    next = available[state.nextVisit % available.length] ?? { position: cat.rest, activity: 'resting' }
  }
  if (!clearCatRoute(state.position, next.position, solids)) return { ...state, elapsed: 0 }
  return {
    ...state,
    activity: 'walking',
    facing: next.position.x < state.position.x ? -1 : 1,
    elapsed: 0,
    nextVisit: state.nextVisit + Number(next.object !== undefined),
    // Reserve before departure and release only after returning to the greeting spot.
    spot: next.object ?? state.spot,
    destination: next,
  }
}

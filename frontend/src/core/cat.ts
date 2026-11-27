import type { CatDefinition, CatId } from '../content/catCatalog.ts'
import { type Box, type Point } from './room.ts'
import { clearSegment } from './navigation.ts'

export type CatActivity = 'idle' | 'walking' | 'resting' | 'drinking' | 'playing' | 'petting'
type Destination = { position: Point; activity: Exclude<CatActivity, 'walking' | 'petting'>; object?: string }
export type CatState = {
  position: Point
  activity: CatActivity
  facing: 1 | -1
  elapsed: number
  nextVisit: number
  nextStop: number
  destination: Destination | null
  spot: string | null
}

const idleDuration = 3400
const restDuration = 2000
const petDuration = 1300
const speed = 44

export function startCat(cat: CatDefinition): CatState {
  return { position: cat.greet, activity: 'idle', facing: 1, elapsed: 0, nextVisit: 0, nextStop: 0, destination: null, spot: null }
}

export const canPet = (state: CatState) => state.activity === 'idle'

export function petCat(state: CatState): CatState {
  return canPet(state) ? { ...state, activity: 'petting', elapsed: 0 } : state
}

export const clearCatRoute = clearSegment

export function stepCat(state: CatState, cat: CatDefinition, delta: number, restored: readonly string[],
  solids: readonly Box[], paused: boolean, occupied?: ReadonlyMap<string, CatId>): CatState {
  if (paused || delta <= 0) return state
  const idle = cat.roam && state.nextStop > 0 ? [1400, 2800, 1850][state.nextStop % 3] :
    cat.pace?.idleMs ?? idleDuration
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
    if (!clearSegment(state.position, position, solids)) return { ...state, activity: 'idle', elapsed: 0, destination: null }
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
  if (cat.roam && state.activity !== 'idle') return { ...state, activity: 'idle', elapsed: 0, spot: null }
  let next: Destination = { position: cat.greet, activity: 'idle' }
  if (state.activity === 'idle') {
    const available = cat.attractions.filter(({ object }) => restored.includes(object) &&
      (!occupied?.has(object) || occupied.get(object) === cat.id))
    const attraction = !cat.roam || state.nextStop % 2 === 0 ? available[state.nextVisit % available.length] : undefined
    const stops = cat.roam ? [cat.rest, ...cat.roam] : [cat.rest]
    const stop = cat.roam ? stops[Math.floor(state.nextStop / (available.length ? 2 : 1)) % stops.length] : cat.rest
    next = attraction ?? { position: stop, activity: 'resting' }
  }
  if (!clearCatRoute(state.position, next.position, solids)) return { ...state, elapsed: 0 }
  return {
    ...state,
    activity: 'walking',
    facing: next.position.x < state.position.x ? -1 : 1,
    elapsed: 0,
    nextVisit: state.nextVisit + Number(next.object !== undefined),
    nextStop: state.nextStop + Number(Boolean(cat.roam)),
    // Reserve before departure and release only after returning to the greeting spot.
    spot: next.object ?? state.spot,
    destination: next,
  }
}

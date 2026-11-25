import type { CatDefinition } from '../content/pack.ts'
import { canStand, type Box, type Point } from './room.ts'

export type CatActivity = 'idle' | 'walking' | 'resting' | 'drinking' | 'petting'
type Destination = { position: Point; activity: 'idle' | 'resting' | 'drinking' }
export type CatState = {
  position: Point
  activity: CatActivity
  facing: 1 | -1
  elapsed: number
  nextVisit: number
  destination: Destination | null
}

const idleDuration = 3400
const restDuration = 2000
const petDuration = 1300
const speed = 44

export function startCat(cat: CatDefinition): CatState {
  return { position: cat.greet, activity: 'idle', facing: 1, elapsed: 0, nextVisit: 0, destination: null }
}

export const canPet = (state: CatState) => state.activity === 'idle'

export function petCat(state: CatState): CatState {
  return canPet(state) ? { ...state, activity: 'petting', elapsed: 0 } : state
}

export function clearCatRoute(from: Point, to: Point, solids: readonly Box[]) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y)
  const steps = Math.max(1, Math.ceil(distance))
  return Array.from({ length: steps + 1 }, (_, i) => i / steps).every((part) =>
    canStand({ x: from.x + (to.x - from.x) * part, y: from.y + (to.y - from.y) * part }, solids))
}

export function stepCat(state: CatState, cat: CatDefinition, delta: number, restored: readonly string[],
  solids: readonly Box[], paused: boolean): CatState {
  if (paused || delta <= 0) return state
  const elapsed = state.elapsed + Math.min(delta, 40)
  const destination = state.destination
  if (state.activity === 'walking' && destination) {
    const { x, y } = destination.position
    const dx = x - state.position.x
    const dy = y - state.position.y
    const distance = Math.hypot(dx, dy)
    const step = Math.min(distance, speed * Math.min(delta, 40) / 1000)
    const position = distance === 0 ? destination.position :
      { x: state.position.x + dx * step / distance, y: state.position.y + dy * step / distance }
    if (!canStand(position, solids)) return { ...state, activity: 'idle', elapsed: 0, destination: null }
    if (step === distance) return { ...state, position, activity: destination.activity, elapsed: 0, destination: null }
    return { ...state, position, elapsed }
  }

  if (state.activity === 'petting') {
    return elapsed < petDuration ? { ...state, elapsed } : { ...state, activity: 'idle', elapsed: idleDuration }
  }
  if (elapsed < (state.activity === 'idle' ? idleDuration : restDuration)) return { ...state, elapsed }
  const attractions = cat.attractions.filter(({ object }) => restored.includes(object))
  const next: Destination = state.activity === 'idle'
    ? attractions[state.nextVisit % attractions.length] ?? { position: cat.rest, activity: 'resting' }
    : { position: cat.greet, activity: 'idle' }
  if (!clearCatRoute(state.position, next.position, solids)) return { ...state, elapsed: 0 }
  return {
    ...state,
    activity: 'walking',
    facing: next.position.x < state.position.x ? -1 : 1,
    elapsed: 0,
    nextVisit: state.nextVisit + Number(state.activity === 'idle' && attractions.length > 0),
    destination: next,
  }
}

import type { Point } from '../core/room.ts'
import type { pl } from '../i18n/pl.ts'

export type TraceChallenge = {
  type: 'TRACE_PATH'
  skillId: string
  difficulty: 'intro'
  text: keyof typeof pl.challenges
  path: readonly Point[]
  tolerance: number
  coverage: number
  targets: readonly number[]
}

export const contentVersion = 1

export const challenges = {
  'clothes-to-basket': {
    type: 'TRACE_PATH',
    skillId: 'hand-eye-coordination',
    difficulty: 'intro',
    text: 'clothesTrace',
    path: [
      { x: 0.13, y: 0.66 }, { x: 0.20, y: 0.46 }, { x: 0.29, y: 0.28 },
      { x: 0.38, y: 0.24 }, { x: 0.47, y: 0.30 }, { x: 0.55, y: 0.47 },
      { x: 0.63, y: 0.65 }, { x: 0.72, y: 0.69 }, { x: 0.80, y: 0.61 },
      { x: 0.87, y: 0.45 },
    ],
    tolerance: 0.05,
    coverage: 0.9,
    targets: [0, 2, 4, 6, 9],
  },
} satisfies Record<string, TraceChallenge>

export const locations = {
  bedroom: { entry: 'bedside', art: 'bedroom' },
  landing: { entry: 'from-bedroom', art: 'landing' },
} as const

export type LocationId = keyof typeof locations
export const locationIds = Object.keys(locations) as LocationId[]
export type Checkpoint = { location: LocationId; spawn: string }
export const start: Checkpoint = { location: 'bedroom', spawn: locations.bedroom.entry }

export function isLocation(value: unknown): value is LocationId {
  return typeof value === 'string' && Object.hasOwn(locations, value)
}

export type Quest = {
  id: string
  location: LocationId
  interaction: string
  challenge: keyof typeof challenges
  reward: { id: string; points: number }
  effects: readonly { type: 'HIDE_OBJECT'; object: string }[]
}

export const quests: readonly Quest[] = [
  {
    id: 'bedroom-clean-clothes',
    location: 'bedroom',
    interaction: 'scattered-clothes',
    challenge: 'clothes-to-basket',
    reward: { id: 'bedroom-clean-clothes-first', points: 1 },
    effects: [{ type: 'HIDE_OBJECT', object: 'scattered-clothes' }],
  },
]

export type Transition = {
  location: LocationId
  interaction: string
  target: Checkpoint
  minimumPoints: number
}

export const transitions: readonly Transition[] = [
  { location: 'bedroom', interaction: 'closed-door', minimumPoints: 1, target: { location: 'landing', spawn: 'from-bedroom' } },
  { location: 'landing', interaction: 'bedroom-door', minimumPoints: 0, target: { location: 'bedroom', spawn: 'from-landing' } },
]

import type { Point } from '../core/room.ts'
import type { pl } from '../i18n/pl.ts'

type ChallengeText = {
  skillId: string
  difficulty: 'intro'
  text: keyof typeof pl.challenges
}

export type TraceChallenge = ChallengeText & {
  type: 'TRACE_PATH'
  path: readonly Point[]
  tolerance: number
  coverage: number
  targets: readonly number[]
}

export const mathOperations = ['count', 'add', 'subtract'] as const
export type MathOperation = (typeof mathOperations)[number]
export type MathChallenge = ChallengeText & {
  type: 'MATH_CHOICE'
  operations: readonly MathOperation[]
  maximum: number
  seed: number
}

export const pictureIds = ['blanket', 'pillow', 'basket'] as const
export type PictureId = (typeof pictureIds)[number]
export type MatchChallenge = ChallengeText & {
  type: 'MATCH_PAIRS'
  pairs: readonly { id: string; word: keyof typeof pl.match.words; picture: PictureId }[]
  pictureOrder: readonly PictureId[]
}

export type Challenge = TraceChallenge | MathChallenge | MatchChallenge
export const contentVersion = 2

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
  'count-water-drops': {
    type: 'MATH_CHOICE',
    skillId: 'arithmetic-within-ten',
    difficulty: 'intro',
    text: 'waterMath',
    operations: ['count', 'add', 'subtract'],
    maximum: 10,
    seed: 3041,
  },
  'prepare-cat-bed': {
    type: 'MATCH_PAIRS',
    skillId: 'word-picture-matching',
    difficulty: 'intro',
    text: 'bedMatch',
    pairs: [
      { id: 'blanket-pair', word: 'blanket', picture: 'blanket' },
      { id: 'pillow-pair', word: 'pillow', picture: 'pillow' },
      { id: 'basket-pair', word: 'basket', picture: 'basket' },
    ],
    pictureOrder: ['pillow', 'basket', 'blanket'],
  },
} satisfies Record<string, Challenge>

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

export type CatDefinition = {
  id: string
  location: LocationId
  name: keyof typeof pl.cat.names
  greet: Point
  rest: Point
  attractions: readonly { object: string; position: Point; activity: 'drinking' | 'resting' }[]
}

export const cats: readonly CatDefinition[] = [{
  id: 'amber',
  location: 'bedroom',
  name: 'amber',
  greet: { x: 124, y: 188 },
  rest: { x: 148, y: 188 },
  attractions: [
    { object: 'water-bowl', position: { x: 210, y: 188 }, activity: 'drinking' },
    { object: 'cat-bed', position: { x: 255, y: 188 }, activity: 'resting' },
  ],
}]

export type Quest = {
  id: string
  location: LocationId
  interaction: string
  challenge: keyof typeof challenges
  reward: { id: string; points: number }
  effects: readonly (
    | { type: 'HIDE_OBJECT'; object: string }
    | { type: 'RESTORE_ATTRACTION'; object: string }
  )[]
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
  {
    id: 'bedroom-fill-water-bowl',
    location: 'bedroom',
    interaction: 'water-bowl',
    challenge: 'count-water-drops',
    reward: { id: 'bedroom-fill-water-bowl-first', points: 1 },
    effects: [{ type: 'RESTORE_ATTRACTION', object: 'water-bowl' }],
  },
  {
    id: 'bedroom-prepare-cat-bed',
    location: 'bedroom',
    interaction: 'cat-bed',
    challenge: 'prepare-cat-bed',
    reward: { id: 'bedroom-prepare-cat-bed-first', points: 1 },
    effects: [{ type: 'RESTORE_ATTRACTION', object: 'cat-bed' }],
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

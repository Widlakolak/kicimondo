import type { Point } from '../core/room.ts'
import type { pl } from '../i18n/pl.ts'
import { gardenChallenges, gardenPictures } from './gardenChallenges.ts'
import { houseChallenges, houseMatchPictures, sortPictures } from './houseChallenges.ts'

import { workshopChallenges, workshopPictures } from './workshopChallenges.ts'

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
  counter?: keyof typeof pl.math.counters
  illustration?: PictureId
}

export const pictureIds = ['blanket', 'pillow', 'basket', ...houseMatchPictures, ...sortPictures, ...gardenPictures, ...workshopPictures] as const
export type PictureId = (typeof pictureIds)[number]
type MatchPictureId = keyof typeof pl.match.pictures
export type MatchChallenge = ChallengeText & {
  type: 'MATCH_PAIRS'
  pairs: readonly { id: string; word: keyof typeof pl.match.words; picture: MatchPictureId; cue?: MatchPictureId }[]
  pictureOrder: readonly MatchPictureId[]
}

export type SortItemId = keyof typeof pl.sort.items
export type SortGroup = keyof typeof pl.sort.groups
export type SortChallenge = ChallengeText & {
  type: 'SORT_ORDER'
  items: readonly { id: SortItemId; picture?: PictureId }[]
} & (
  | { mode: 'sequence'; order: readonly SortItemId[] }
  | { mode: 'categories'; groups: readonly SortGroup[]; assignments: Partial<Record<SortItemId, SortGroup>>;
      groupPictures?: Partial<Record<SortGroup, PictureId>> }
)

export type Challenge = TraceChallenge | MathChallenge | MatchChallenge | SortChallenge
export const contentVersion = 5

export const challenges = {
  ...houseChallenges,
  ...gardenChallenges,
  ...workshopChallenges,
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
  bedroom: { entry: 'bedside', art: 'bedroom', introduced: 1 },
  landing: { entry: 'from-bedroom', art: 'landing', introduced: 1 },
  study: { entry: 'from-landing', art: 'study', introduced: 3 },
  bathroom: { entry: 'from-landing', art: 'bathroom', introduced: 3 },
  playroom: { entry: 'from-landing', art: 'playroom', introduced: 3 },
  hall: { entry: 'from-landing', art: 'hall', introduced: 3 },
  kitchen: { entry: 'from-hall', art: 'kitchen', introduced: 3 },
  living: { entry: 'from-hall', art: 'living', introduced: 3 },
  garden: { entry: 'from-hall', art: 'garden', introduced: 4 },
  basement: { entry: 'from-hall', art: 'basement', introduced: 5 },
  storage: { entry: 'from-corridor', art: 'storage', introduced: 5 },
  workshop: { entry: 'from-corridor', art: 'workshop', introduced: 5 },
} as const

export type LocationId = keyof typeof locations
export const locationIds = Object.keys(locations) as LocationId[]
export type Checkpoint = { location: LocationId; spawn: string }
export const start: Checkpoint = { location: 'bedroom', spawn: locations.bedroom.entry }

export function isLocation(value: unknown): value is LocationId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(locations, value)
}

export { cats, type CatDefinition } from './catCatalog.ts'

export type Quest = {
  id: string
  location: LocationId
  interaction: string
  challenge: keyof typeof challenges
  reward: { id: string; points: number }
  introduced: 1 | 2 | 3 | 4 | 5
  effects: readonly (
    | { type: 'HIDE_OBJECT'; object: string }
    | { type: 'RESTORE_ATTRACTION'; object: string }
    | { type: 'ORGANIZE_OBJECT'; object: string }
  )[]
}

function houseQuest(location: LocationId, interaction: string, challenge: keyof typeof houseChallenges): Quest {
  const id = location + '-' + challenge
  return { id, location, interaction, challenge, introduced: 3, reward: { id: id + '-first', points: 1 },
    effects: [{ type: 'ORGANIZE_OBJECT', object: interaction }] }
}

function newQuest(location: LocationId, interaction: string, challenge: keyof typeof gardenChallenges, object = interaction): Quest {
  const id = location + '-' + challenge
  return { id, location, interaction, challenge, introduced: 4, reward: { id: id + '-first', points: 1 },
    effects: [{ type: location === 'garden' ? 'RESTORE_ATTRACTION' : 'ORGANIZE_OBJECT', object }] }
}

function workshopQuest(location: LocationId, interaction: string, challenge: keyof typeof workshopChallenges,
  type: 'ORGANIZE_OBJECT' | 'RESTORE_ATTRACTION' = 'ORGANIZE_OBJECT'): Quest {
  const id = location + '-' + challenge
  return { id, location, interaction, challenge, introduced: 5, reward: { id: id + '-first', points: 1 },
    effects: [{ type, object: interaction }] }
}

export const quests: readonly Quest[] = [
  {
    id: 'bedroom-clean-clothes',
    introduced: 1,
    location: 'bedroom',
    interaction: 'scattered-clothes',
    challenge: 'clothes-to-basket',
    reward: { id: 'bedroom-clean-clothes-first', points: 1 },
    effects: [{ type: 'HIDE_OBJECT', object: 'scattered-clothes' }],
  },
  {
    id: 'bedroom-fill-water-bowl',
    introduced: 2,
    location: 'bedroom',
    interaction: 'water-bowl',
    challenge: 'count-water-drops',
    reward: { id: 'bedroom-fill-water-bowl-first', points: 1 },
    effects: [{ type: 'RESTORE_ATTRACTION', object: 'water-bowl' }],
  },
  {
    id: 'bedroom-prepare-cat-bed',
    introduced: 2,
    location: 'bedroom',
    interaction: 'cat-bed',
    challenge: 'prepare-cat-bed',
    reward: { id: 'bedroom-prepare-cat-bed-first', points: 1 },
    effects: [{ type: 'RESTORE_ATTRACTION', object: 'cat-bed' }],
  },
  houseQuest('study', 'school-bag', 'pack-school-bag'),
  houseQuest('study', 'school-supplies', 'count-school-supplies'),
  houseQuest('study', 'books', 'order-book-sizes'),
  houseQuest('bathroom', 'hygiene', 'order-handwashing'),
  houseQuest('bathroom', 'bathroom-items', 'match-bathroom-items'),
  houseQuest('playroom', 'toy-box', 'sort-toys'),
  houseQuest('kitchen', 'fruit', 'count-fruit'),
  houseQuest('kitchen', 'table-settings', 'match-table-settings'),
  houseQuest('living', 'household-objects', 'sort-household-objects'),
  newQuest('bedroom', 'desk-reading', 'read-desk-words', 'desk'),
  newQuest('study', 'pencil-case', 'order-pencils'),
  newQuest('bathroom', 'count-towels', 'count-towels', 'laundry'),
  newQuest('kitchen', 'sort-counter', 'sort-counter-items', 'counter'),
  newQuest('living', 'living-shelf', 'match-living-items', 'bookcase'),
  newQuest('garden', 'garden-water', 'fill-garden-water'),
  newQuest('garden', 'garden-bed', 'prepare-sheltered-bed'),
  newQuest('garden', 'garden-post', 'restore-scratching-post'),
  newQuest('garden', 'garden-tunnel', 'clear-tunnel'),
  newQuest('garden', 'garden-toys', 'sort-garden-toys'),
  newQuest('garden', 'garden-platform', 'order-platform-boards'),
  newQuest('garden', 'garden-shelter', 'prepare-garden-shelter'),
  newQuest('garden', 'garden-flowers', 'count-garden-flowers'),
  workshopQuest('bedroom', 'sock-tray', 'sort-sock-patterns'),
  workshopQuest('study', 'crayon-tin', 'count-crayons'),
  workshopQuest('study', 'shape-board', 'match-geometric-shapes'),
  workshopQuest('bathroom', 'wash-kit', 'match-hygiene-symbols'),
  workshopQuest('playroom', 'block-tray', 'sort-block-shapes'),
  workshopQuest('playroom', 'build-board', 'order-build-steps'),
  workshopQuest('kitchen', 'snack-tray', 'count-snack-apples'),
  workshopQuest('living', 'day-board', 'order-family-day'),
  workshopQuest('garden', 'leaf-path', 'trace-leaf-path'),
  workshopQuest('garden', 'seed-tray', 'count-seed-packets'),
  workshopQuest('basement', 'cardboard-crate', 'sort-storage-boxes'),
  workshopQuest('basement', 'felt-basket', 'count-felt-pieces'),
  workshopQuest('basement', 'fabric-drawers', 'match-drawer-symbols'),
  workshopQuest('basement', 'route-basket', 'trace-basket-route'),
  workshopQuest('storage', 'block-bin', 'sort-ramp-blocks'),
  workshopQuest('storage', 'board-bundle', 'count-scratch-pieces'),
  workshopQuest('storage', 'tube-rack', 'match-cardboard-tubes'),
  workshopQuest('storage', 'size-crates', 'order-containers'),
  workshopQuest('storage', 'label-rack', 'match-storage-labels'),
  workshopQuest('workshop', 'cardboard-hideout', 'build-cardboard-hideout', 'RESTORE_ATTRACTION'),
  workshopQuest('workshop', 'felt-ball', 'build-felt-ball', 'RESTORE_ATTRACTION'),
  workshopQuest('workshop', 'resting-mat', 'build-resting-mat', 'RESTORE_ATTRACTION'),
  workshopQuest('workshop', 'cat-ramp', 'build-cat-ramp'),
  workshopQuest('workshop', 'scratch-board', 'build-scratch-board'),
  workshopQuest('workshop', 'play-tunnel', 'build-play-tunnel'),
]

export type Transition = {
  location: LocationId
  interaction: string
  target: Checkpoint
  minimumPoints: number
  kind?: 'stairs' | 'gate' | 'basement-stair'
}

export const transitions: readonly Transition[] = [
  { location: 'bedroom', interaction: 'closed-door', minimumPoints: 1, target: { location: 'landing', spawn: 'from-bedroom' } },
  { location: 'landing', interaction: 'bedroom-door', minimumPoints: 0, target: { location: 'bedroom', spawn: 'from-landing' } },
  { location: 'landing', interaction: 'study-door', minimumPoints: 0, target: { location: 'study', spawn: 'from-landing' } },
  { location: 'study', interaction: 'landing-door', minimumPoints: 0, target: { location: 'landing', spawn: 'from-study' } },
  { location: 'landing', interaction: 'bathroom-door', minimumPoints: 0, target: { location: 'bathroom', spawn: 'from-landing' } },
  { location: 'bathroom', interaction: 'landing-door', minimumPoints: 0, target: { location: 'landing', spawn: 'from-bathroom' } },
  { location: 'landing', interaction: 'playroom-door', minimumPoints: 0, target: { location: 'playroom', spawn: 'from-landing' } },
  { location: 'playroom', interaction: 'landing-door', minimumPoints: 0, target: { location: 'landing', spawn: 'from-playroom' } },
  { location: 'landing', interaction: 'ground-stairs', kind: 'stairs', minimumPoints: 8, target: { location: 'hall', spawn: 'from-landing' } },
  { location: 'hall', interaction: 'upstairs', kind: 'stairs', minimumPoints: 0, target: { location: 'landing', spawn: 'from-hall' } },
  { location: 'hall', interaction: 'kitchen-door', minimumPoints: 0, target: { location: 'kitchen', spawn: 'from-hall' } },
  { location: 'kitchen', interaction: 'hall-door', minimumPoints: 0, target: { location: 'hall', spawn: 'from-kitchen' } },
  { location: 'hall', interaction: 'living-door', minimumPoints: 0, target: { location: 'living', spawn: 'from-hall' } },
  { location: 'living', interaction: 'hall-door', minimumPoints: 0, target: { location: 'hall', spawn: 'from-living' } },
  { location: 'hall', interaction: 'garden-gate', kind: 'gate', minimumPoints: 16, target: { location: 'garden', spawn: 'from-hall' } },
  { location: 'garden', interaction: 'return-hall', kind: 'gate', minimumPoints: 0, target: { location: 'hall', spawn: 'from-garden' } },
  { location: 'hall', interaction: 'basement-stairs', kind: 'basement-stair', minimumPoints: 32,
    target: { location: 'basement', spawn: 'from-hall' } },
  { location: 'basement', interaction: 'basement-return', kind: 'basement-stair', minimumPoints: 0,
    target: { location: 'hall', spawn: 'from-basement' } },
  { location: 'basement', interaction: 'storage-door', minimumPoints: 0, target: { location: 'storage', spawn: 'from-corridor' } },
  { location: 'storage', interaction: 'corridor-door', minimumPoints: 0, target: { location: 'basement', spawn: 'from-storage' } },
  { location: 'basement', interaction: 'workshop-door', minimumPoints: 0, target: { location: 'workshop', spawn: 'from-corridor' } },
  { location: 'workshop', interaction: 'corridor-door', minimumPoints: 0, target: { location: 'basement', spawn: 'from-workshop' } },
]

type DialogueHint = Exclude<keyof typeof pl.dialogue, 'hania'>

export type Dialogue = {
  location: LocationId
  interaction: string
  speaker: 'hania'
  hints: readonly { location: LocationId; text: DialogueHint }[]
  gate: string
  afterGate: DialogueHint
}

export const dialogues: readonly Dialogue[] = [{
  location: 'landing', interaction: 'guide', speaker: 'hania', gate: 'ground-stairs', afterGate: 'downstairs',
  hints: [
    { location: 'study', text: 'study' },
    { location: 'bathroom', text: 'bathroom' },
    { location: 'playroom', text: 'playroom' },
  ],
}]

import type { Challenge, MatchChallenge, MathChallenge, PictureId, SortChallenge, SortItemId } from './pack.ts'

export const gardenPictures = [
  'lamp', 'book', 'paper', 'roof', 'short-pencil', 'mid-pencil', 'long-pencil', 'apple', 'pear',
  'blue-ball', 'red-ball', 'short-board', 'mid-board', 'long-board',
] as const

type MatchingItem = MatchChallenge['pairs'][number]['word'] & MatchChallenge['pictureOrder'][number]

function match(text: MatchChallenge['text'], [a, b, c]: readonly [MatchingItem, MatchingItem, MatchingItem]): MatchChallenge {
  return {
    type: 'MATCH_PAIRS', skillId: 'word-picture-matching', difficulty: 'intro', text,
    pairs: [a, b, c].map((word) => ({ id: word + '-pair', word, picture: word })),
    pictureOrder: [c, a, b],
  }
}

function count(text: MathChallenge['text'], seed: number, counter?: MathChallenge['counter']): MathChallenge {
  return { type: 'MATH_CHOICE', skillId: 'arithmetic-within-ten', difficulty: 'intro', text,
    seed, counter, maximum: 10, operations: ['count', 'add', 'subtract'] }
}

type IllustratedItem = SortItemId & PictureId
const illustrated = (ids: readonly IllustratedItem[]) => ids.map((id) => ({ id, picture: id }))

function order(text: SortChallenge['text'], [a, b, c]: readonly [IllustratedItem, IllustratedItem, IllustratedItem]): SortChallenge {
  return { type: 'SORT_ORDER', skillId: 'compare-sizes', difficulty: 'intro', text,
    mode: 'sequence', items: illustrated([c, a, b]), order: [a, b, c] }
}

export const gardenChallenges = {
  'read-desk-words': match('deskReading', ['lamp', 'book', 'paper']),
  'order-pencils': order('pencilOrder', ['short-pencil', 'mid-pencil', 'long-pencil']),
  'count-towels': count('towelMath', 6173, 'towel'),
  'sort-counter-items': {
    type: 'SORT_ORDER', skillId: 'classify-objects', difficulty: 'intro', text: 'counterSort',
    mode: 'categories', items: illustrated(['apple', 'cup', 'pear', 'spoon']), groups: ['fruits', 'tableware'],
    assignments: { apple: 'fruits', pear: 'fruits', cup: 'tableware', spoon: 'tableware' },
  },
  'match-living-items': match('livingMatch', ['blanket', 'lamp', 'book']),
  'fill-garden-water': count('gardenWater', 6201),
  'prepare-sheltered-bed': match('gardenBed', ['basket', 'blanket', 'pillow']),
  'restore-scratching-post': count('gardenPost', 6219, 'board'),
  'clear-tunnel': {
    type: 'TRACE_PATH', skillId: 'hand-eye-coordination', difficulty: 'intro', text: 'gardenTunnel',
    path: [
      { x: 0.12, y: 0.71 }, { x: 0.22, y: 0.59 }, { x: 0.30, y: 0.34 },
      { x: 0.42, y: 0.24 }, { x: 0.58, y: 0.24 }, { x: 0.70, y: 0.34 },
      { x: 0.78, y: 0.59 }, { x: 0.88, y: 0.71 },
    ],
    tolerance: 0.05, coverage: 0.9, targets: [0, 2, 4, 6, 7],
  },
  'sort-garden-toys': {
    type: 'SORT_ORDER', skillId: 'classify-objects', difficulty: 'intro', text: 'gardenToys',
    mode: 'categories', items: illustrated(['toy-train', 'blue-ball', 'toy-car', 'red-ball']), groups: ['vehicles', 'balls'],
    assignments: { 'toy-car': 'vehicles', 'toy-train': 'vehicles', 'blue-ball': 'balls', 'red-ball': 'balls' },
  },
  'order-platform-boards': order('gardenPlatform', ['short-board', 'mid-board', 'long-board']),
  'prepare-garden-shelter': match('gardenShelter', ['roof', 'towel', 'pillow']),
  'count-garden-flowers': count('gardenFlowers', 6253, 'flower'),
} satisfies Record<string, Challenge>

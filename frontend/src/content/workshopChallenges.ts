import type { Challenge, MatchChallenge, MathChallenge, PictureId, SortChallenge, SortGroup, SortItemId, TraceChallenge } from './pack.ts'
import { workshopPl } from '../i18n/workshopPl.ts'
import type { Point } from '../core/room.ts'

export const workshopPictures = Object.keys(workshopPl.items) as (keyof typeof workshopPl.items)[]
type Task = keyof typeof workshopPl.challenges
type IllustratedItem = SortItemId & PictureId
type MatchWord = MatchChallenge['pairs'][number]['word'] & MatchChallenge['pairs'][number]['picture']

const illustrated = (ids: readonly IllustratedItem[]) => ids.map((id) => ({ id, picture: id }))

function sort(text: Task, skillId: string, assignments: Partial<Record<IllustratedItem, SortGroup>>,
  groupPictures: Partial<Record<SortGroup, PictureId>>) {
  const entries = Object.entries(assignments) as [IllustratedItem, SortGroup][]
  return {
    type: 'SORT_ORDER', difficulty: 'intro', text, skillId, mode: 'categories',
    items: illustrated(entries.map(([id]) => id)), assignments, groupPictures,
    groups: [...new Set(entries.map(([, group]) => group))],
  } satisfies SortChallenge
}

function order(text: Task, skillId: string, [a, b, c]: readonly [IllustratedItem, IllustratedItem, IllustratedItem]) {
  return {
    type: 'SORT_ORDER', difficulty: 'intro', text, skillId, mode: 'sequence',
    items: illustrated([c, a, b]), order: [a, b, c],
  } satisfies SortChallenge
}

function match(text: Task, skillId: string, entries: readonly (readonly [MatchWord, MatchChallenge['pictureOrder'][number]?])[]) {
  const pairs = entries.map(([word, cue]) => ({ id: word + '-pair', word, picture: word, cue }))
  return {
    type: 'MATCH_PAIRS', difficulty: 'intro', text, skillId, pairs,
    pictureOrder: [...pairs.slice(1), pairs[0]].map(({ picture }) => picture),
  } satisfies MatchChallenge
}

function count(text: Task, seed: number, counter: NonNullable<MathChallenge['counter']>,
  illustration: PictureId, operations: MathChallenge['operations'] = ['count', 'count']) {
  return { type: 'MATH_CHOICE', skillId: 'arithmetic-within-ten', difficulty: 'intro', text,
    seed, counter, illustration, maximum: 10, operations } satisfies MathChallenge
}

function trace(text: Task, path: readonly Point[]) {
  return { type: 'TRACE_PATH', skillId: 'hand-eye-coordination', difficulty: 'intro', text,
    path, tolerance: 0.065, coverage: 0.9, targets: [0, 2, 4, 6, path.length - 1] } satisfies TraceChallenge
}

export const workshopChallenges = {
  'sort-sock-patterns': sort('sort-sock-patterns', 'recognize-patterns', {
    'blue-striped-sock': 'stripes', 'red-dotted-sock': 'dots',
    'red-striped-sock': 'stripes', 'blue-dotted-sock': 'dots',
  }, { stripes: 'stripes', dots: 'dots' }),
  'count-crayons': count('count-crayons', 9201, 'crayon', 'crayon'),
  'match-geometric-shapes': match('match-geometric-shapes', 'recognize-shapes',
    [['plate', 'circle'], ['square-window', 'square'], ['pennant', 'triangle']]),
  'match-hygiene-symbols': match('match-hygiene-symbols', 'interpret-pictograms',
    [['soap', 'soap-symbol'], ['toothbrush', 'tooth-symbol'], ['comb', 'comb-symbol']]),
  'sort-block-shapes': sort('sort-block-shapes', 'classify-shapes', {
    'yellow-round-block': 'rounds', 'green-square-block': 'squares',
    'green-round-block': 'rounds', 'yellow-square-block': 'squares',
  }, { rounds: 'circle', squares: 'square' }),
  'order-build-steps': order('order-build-steps', 'sequence-construction', ['base', 'tower', 'tower-flag']),
  'count-snack-apples': count('count-snack-apples', 9214, 'apple', 'apple', ['count', 'add']),
  'order-family-day': order('order-family-day', 'order-times-of-day', ['morning-book', 'noon-plate', 'evening-pillow']),
  'trace-leaf-path': trace('trace-leaf-path', [
    { x: 0.12, y: 0.68 }, { x: 0.22, y: 0.59 }, { x: 0.29, y: 0.40 },
    { x: 0.39, y: 0.22 }, { x: 0.50, y: 0.31 }, { x: 0.58, y: 0.52 },
    { x: 0.70, y: 0.70 }, { x: 0.80, y: 0.60 }, { x: 0.89, y: 0.43 },
  ]),
  'count-seed-packets': count('count-seed-packets', 9232, 'seed', 'seed-packet'),
  'sort-storage-boxes': sort('sort-storage-boxes', 'classify-pictograms', {
    'book-box': 'supplies', 'ball-box': 'toys', 'pencil-box': 'supplies', 'bear-box': 'toys',
  }, { supplies: 'notebook', toys: 'toy-bear' }),
  'count-felt-pieces': count('count-felt-pieces', 9256, 'felt', 'felt-circle'),
  'match-drawer-symbols': match('match-drawer-symbols', 'match-pictograms',
    [['star-drawer', 'star-mark'], ['moon-drawer', 'moon-mark'], ['heart-drawer', 'heart-mark']]),
  'trace-basket-route': trace('trace-basket-route', [
    { x: 0.11, y: 0.72 }, { x: 0.27, y: 0.73 }, { x: 0.38, y: 0.60 },
    { x: 0.39, y: 0.41 }, { x: 0.51, y: 0.26 }, { x: 0.66, y: 0.26 },
    { x: 0.77, y: 0.39 }, { x: 0.88, y: 0.53 },
  ]),
  'sort-ramp-blocks': sort('sort-ramp-blocks', 'classify-shapes', {
    'green-triangle-block': 'triangles', 'yellow-square-block': 'squares',
    'yellow-triangle-block': 'triangles', 'green-square-block': 'squares',
  }, { triangles: 'triangle', squares: 'square' }),
  'count-scratch-pieces': count('count-scratch-pieces', 9257, 'board', 'short-board'),
  'match-cardboard-tubes': match('match-cardboard-tubes', 'read-size-words',
    [['short-tube'], ['long-tube'], ['wide-tube']]),
  'order-containers': order('order-containers', 'compare-sizes', ['small-bin', 'medium-bin', 'large-bin']),
  'match-storage-labels': match('match-storage-labels', 'read-material-labels',
    [['cardboard-kit'], ['felt-kit'], ['fabric-kit']]),
  'build-cardboard-hideout': order('build-cardboard-hideout', 'sequence-construction',
    ['cardboard-base', 'cardboard-walls', 'cardboard-roof']),
  'build-felt-ball': count('build-felt-ball', 9290, 'felt', 'felt-circle', ['count', 'add']),
  'build-resting-mat': match('build-resting-mat', 'recognize-patterns',
    [['striped-fabric', 'stripes'], ['dotted-fabric', 'dots'], ['checked-fabric', 'checks']]),
  'build-cat-ramp': order('build-cat-ramp', 'compare-heights', ['low-step', 'middle-step', 'high-step']),
  'build-scratch-board': count('build-scratch-board', 9294, 'board', 'short-board', ['count', 'subtract']),
  'build-play-tunnel': trace('build-play-tunnel', [
    { x: 0.11, y: 0.67 }, { x: 0.21, y: 0.50 }, { x: 0.33, y: 0.36 },
    { x: 0.45, y: 0.33 }, { x: 0.55, y: 0.39 }, { x: 0.66, y: 0.51 },
    { x: 0.77, y: 0.54 }, { x: 0.89, y: 0.42 },
  ]),
} satisfies Record<Task, Challenge>

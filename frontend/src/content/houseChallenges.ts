import type { pl } from '../i18n/pl.ts'
import type { Challenge, MatchChallenge, PictureId, SortItemId } from './pack.ts'

export const houseMatchPictures = [
  'pencil', 'eraser', 'notebook', 'soap', 'towel', 'comb', 'plate', 'cup', 'spoon',
] as const

export const sortPictures = [
  'small-book', 'medium-book', 'large-book', 'toy-car', 'toy-train', 'toy-bear', 'toy-rabbit', 'shirt', 'sock',
] as const

type MatchPicture = typeof houseMatchPictures[number]
type Trio = readonly [MatchPicture, MatchPicture, MatchPicture]

function matching(text: keyof typeof pl.challenges, [first, second, third]: Trio): MatchChallenge {
  return {
    type: 'MATCH_PAIRS', difficulty: 'intro', skillId: 'word-picture-matching', text,
    pairs: [first, second, third].map((word) => ({ id: word + '-pair', word, picture: word })),
    pictureOrder: [second, third, first],
  }
}

function illustrated(ids: readonly (SortItemId & PictureId)[]) {
  return ids.map((id) => ({ id, picture: id }))
}

export const houseChallenges = {
  'pack-school-bag': matching('bagMatch', ['pencil', 'eraser', 'notebook']),
  'count-school-supplies': {
    type: 'MATH_CHOICE', difficulty: 'intro', skillId: 'arithmetic-within-ten', text: 'supplyMath',
    operations: ['count', 'add', 'subtract'], maximum: 10, seed: 5071, counter: 'pencil',
  },
  'order-book-sizes': {
    type: 'SORT_ORDER', difficulty: 'intro', skillId: 'compare-sizes', text: 'bookOrder',
    mode: 'sequence', items: illustrated(['medium-book', 'large-book', 'small-book']),
    order: ['small-book', 'medium-book', 'large-book'],
  },
  'order-handwashing': {
    type: 'SORT_ORDER', difficulty: 'intro', skillId: 'sequence-actions', text: 'handOrder',
    mode: 'sequence', items: [{ id: 'dry' }, { id: 'rinse' }, { id: 'wet' }, { id: 'rub' }, { id: 'soap', picture: 'soap' }],
    order: ['wet', 'soap', 'rub', 'rinse', 'dry'],
  },
  'match-bathroom-items': matching('bathMatch', ['soap', 'towel', 'comb']),
  'sort-toys': {
    type: 'SORT_ORDER', difficulty: 'intro', skillId: 'classify-objects', text: 'toySort',
    mode: 'categories', items: illustrated(['toy-rabbit', 'toy-car', 'toy-bear', 'toy-train']), groups: ['vehicles', 'plush'],
    assignments: { 'toy-car': 'vehicles', 'toy-train': 'vehicles', 'toy-bear': 'plush', 'toy-rabbit': 'plush' },
  },
  'count-fruit': {
    type: 'MATH_CHOICE', difficulty: 'intro', skillId: 'arithmetic-within-ten', text: 'fruitMath',
    operations: ['count', 'add', 'subtract'], maximum: 10, seed: 5109, counter: 'apple',
  },
  'match-table-settings': matching('tableMatch', ['plate', 'cup', 'spoon']),
  'sort-household-objects': {
    type: 'SORT_ORDER', difficulty: 'intro', skillId: 'classify-objects', text: 'householdSort',
    mode: 'categories', items: illustrated(['cup', 'sock', 'plate', 'shirt']), groups: ['clothes', 'dishes'],
    assignments: { shirt: 'clothes', sock: 'clothes', plate: 'dishes', cup: 'dishes' },
  },
} satisfies Record<string, Challenge>

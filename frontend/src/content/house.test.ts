import { expect, it } from 'vitest'
import { loadMaps } from './loadMaps'
import { locationIds, quests, transitions } from './pack'
import { reachableLocations } from './routes'
import { validateContent, validSort } from './validate'
import { houseChallenges } from './houseChallenges'
import { maps } from './world'
import { placeSortItem } from '../core/education'

it('validates every editable room and rejects a wall that cuts its entry off from the anchors', () => {
  expect(() => validateContent(maps)).not.toThrow()
  const wall = { x: 16, y: 105, width: 288, height: 8 }
  const blocked = { ...maps, study: { ...maps.study, walls: [...maps.study.walls, wall] } }
  expect(() => validateContent(blocked)).toThrow('unreachable or overlapping anchor study/')
})

it('rejects solid furniture on an arrival spawn when reading a Tiled map', () => {
  const sources = import.meta.glob<string>('../game/maps/*.tmj', { eager: true, query: '?raw', import: 'default' })
  expect(() => loadMaps((id) => {
    const raw = sources[`../game/maps/${id}.tmj`]
    if (id !== 'hall') return raw
    return raw.replace('"from-kitchen", "x": 64, "y": 72', '"from-kitchen", "x": 140, "y": 50')
  })).toThrow('Could not load map for hall')
})

it('provides nine pre-gate rewards, three optional floor rewards, and routes home', () => {
  const before = reachableLocations(7)
  const after = reachableLocations(8)
  expect(before.has('hall')).toBe(false)
  expect(before.size).toBe(5)
  expect(quests.filter((quest) => !quest.introduced && before.has(quest.location))).toHaveLength(9)
  expect(after.size).toBe(locationIds.length - 1)
  expect(quests.filter((quest) => !quest.introduced && !before.has(quest.location))).toHaveLength(3)
  expect(quests.filter((quest) => !quest.introduced).reduce((total, { reward }) => total + reward.points, 0)).toBe(12)
  for (const edge of transitions) {
    const back = transitions.find((candidate) => candidate.location === edge.target.location &&
      candidate.target.location === edge.location)!
    const earliest = [0, 1, 8, 16].find((budget) =>
      reachableLocations(budget).has(edge.location) && budget >= edge.minimumPoints)!
    expect(back.minimumPoints).toBeLessThanOrEqual(earliest)
    expect(maps[edge.target.location].spawns.has(edge.target.spawn)).toBe(true)
  }
})

it('validates unique sequence choices and accepts only the next item', () => {
  const books = houseChallenges['order-book-sizes']
  expect(validSort(books)).toBe(true)
  expect(validSort({ ...books, order: ['small-book', 'small-book', 'large-book'] })).toBe(false)
  expect(validSort({ ...books, order: ['small-book', 'medium-book', 'wet'] })).toBe(false)
  const start = [] as const
  expect(placeSortItem(books, start, 'large-book')).toBe(start)
  const first = placeSortItem(books, start, 'small-book')
  expect(first).toEqual(['small-book'])
  expect(placeSortItem(books, first, 'small-book')).toBe(first)
  const second = placeSortItem(books, first, 'medium-book')
  expect(placeSortItem(books, second, 'large-book')).toEqual(books.order)
})

it('requires one valid group per item and accepts categories in any item order', () => {
  const toys = houseChallenges['sort-toys']
  expect(validSort(toys)).toBe(true)
  expect(validSort({ ...toys, groups: ['plush', 'plush'] })).toBe(false)
  expect(validSort({ ...toys, assignments: { ...toys.assignments, shirt: 'vehicles' } })).toBe(false)
  expect(validSort({ ...toys, assignments: { ...toys.assignments, 'toy-car': undefined } })).toBe(false)
  const start = [] as const
  expect(placeSortItem(toys, start, 'toy-car', 'plush')).toBe(start)
  const placed = placeSortItem(toys, start, 'toy-rabbit', 'plush')
  expect(placed).toEqual(['toy-rabbit'])
  expect(placeSortItem(toys, placed, 'toy-car', 'vehicles')).toEqual(['toy-rabbit', 'toy-car'])
})

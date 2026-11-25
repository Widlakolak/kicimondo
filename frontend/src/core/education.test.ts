import { expect, it } from 'vitest'
import { challenges } from '../content/pack'
import { matchPair, mathQuestions } from './education'

const maths = challenges['count-water-drops']
const matching = challenges['prepare-cat-bed']

it('generates repeatable counting, addition and non-negative subtraction with one correct choice', () => {
  for (let seed = 0; seed < 60; seed++) {
    const questions = mathQuestions({ ...maths, seed })
    expect(questions).toEqual(mathQuestions({ ...maths, seed }))
    expect(questions.map(({ operation }) => operation)).toEqual(['count', 'add', 'subtract'])
    for (const { operation, left, right, answer, options } of questions) {
      expect(answer).toBe(operation === 'add' ? left + right : left - right)
      if (operation === 'count') expect(right).toBe(0)
      expect(left).toBeLessThanOrEqual(10)
      expect(right).toBeGreaterThanOrEqual(0)
      expect(options).toHaveLength(3)
      expect(new Set(options).size).toBe(3)
      expect(options.filter((option) => option === answer)).toHaveLength(1)
      expect(options.every((option) => Number.isInteger(option) && option >= 0 && option <= 10)).toBe(true)
    }
  }
})

it('honors a smaller maximum even when only three answer values are available', () => {
  for (const question of mathQuestions({ ...maths, maximum: 2 })) {
    expect([...question.options].sort()).toEqual([0, 1, 2])
  }
})

it('matches stable word and picture IDs in any order and keeps progress on an error', () => {
  const empty: string[] = []
  expect(matchPair(matching, empty, null, 'basket')).toBe(empty)
  expect(matchPair(matching, empty, 'blanket-pair', 'basket')).toBe(empty)
  const first = matchPair(matching, empty, 'basket-pair', 'basket')
  expect(first).toEqual(['basket-pair'])
  expect(matchPair(matching, first, 'basket-pair', 'basket')).toBe(first)
  const second = matchPair(matching, first, 'blanket-pair', 'blanket')
  expect(matchPair(matching, second, 'pillow-pair', 'pillow')).toEqual(['basket-pair', 'blanket-pair', 'pillow-pair'])
})

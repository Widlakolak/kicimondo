import type { MatchChallenge, MathChallenge, MathOperation, PictureId, SortChallenge, SortGroup, SortItemId } from '../content/pack.ts'

export type MathQuestion = {
  operation: MathOperation
  left: number
  right: number
  answer: number
  options: number[]
}

export function mathQuestions(challenge: MathChallenge): MathQuestion[] {
  let seed = challenge.seed >>> 0
  const pick = (length: number) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return Math.floor(seed / 2 ** 32 * length)
  }

  return challenge.operations.map((operation) => {
    const max = challenge.maximum
    const left = operation === 'add' ? 1 + pick(max - 1) : 2 + pick(max - 1)
    const right = operation === 'count' ? 0 : 1 + pick(operation === 'add' ? max - left : left)
    const answer = operation === 'add' ? left + right : left - right
    const distractors = Array.from({ length: max + 1 }, (_, value) => value).filter((value) => value !== answer)
    const options = [answer, distractors.splice(pick(distractors.length), 1)[0], distractors[pick(distractors.length)]]
    for (let i = options.length - 1; i > 0; i--) {
      const j = pick(i + 1)
      ;[options[i], options[j]] = [options[j], options[i]]
    }
    return { operation, left, right, answer, options }
  })
}

export function matchPair(challenge: MatchChallenge, matched: readonly string[], wordId: string | null, picture: PictureId) {
  const pair = challenge.pairs.find(({ id }) => id === wordId)
  return pair?.picture === picture && !matched.includes(pair.id) ? [...matched, pair.id] : matched
}

export function placeSortItem(
  challenge: SortChallenge, placed: readonly SortItemId[], item: SortItemId, group?: SortGroup,
): readonly SortItemId[] {
  if (placed.includes(item) || !challenge.items.some(({ id }) => id === item)) return placed
  const correct = challenge.mode === 'sequence'
    ? challenge.order[placed.length] === item
    : group !== undefined && challenge.groups.includes(group) && challenge.assignments[item] === group
  return correct ? [...placed, item] : placed
}

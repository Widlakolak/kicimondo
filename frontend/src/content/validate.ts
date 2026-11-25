import { clearCatRoute } from '../core/cat.ts'
import { mathQuestions } from '../core/education.ts'
import { solidsFor, type LocationMap } from '../core/tiledMap.ts'
import { pl } from '../i18n/pl.ts'
import { cats, challenges, locationIds, locations, mathOperations, pictureIds, quests, transitions, type LocationId } from './pack.ts'

export function validateContent(maps: Record<LocationId, LocationMap>) {
  const require = (condition: unknown, message: string) => {
    if (!condition) throw new Error('Invalid content: ' + message)
  }
  const unique = (ids: readonly string[]) => new Set(ids).size === ids.length
  for (const [id, challenge] of Object.entries(challenges)) {
    require(Object.hasOwn(pl.challenges, challenge.text), 'missing challenge text for ' + id)
    if (challenge.type === 'MATH_CHOICE') {
      require(Number.isSafeInteger(challenge.maximum) && challenge.maximum >= 2 && challenge.maximum <= 10 &&
        Number.isSafeInteger(challenge.seed) && challenge.operations.length > 0 &&
        challenge.operations.every((operation) => mathOperations.includes(operation)), 'invalid maths settings for ' + id)
      require(mathQuestions(challenge).every(({ answer, options }) => options.length === 3 &&
        new Set(options).size === 3 && options.filter((option) => option === answer).length === 1 &&
        options.every((option) => Number.isInteger(option) && option >= 0 && option <= challenge.maximum)),
      'invalid maths question for ' + id)
      continue
    }
    if (challenge.type === 'MATCH_PAIRS') {
      const { pairs, pictureOrder } = challenge
      require(pairs.length >= 2 && pairs.length === pictureOrder.length && unique(pictureOrder) &&
        unique(pairs.map((pair) => pair.id)) && unique(pairs.map((pair) => pl.match.words[pair.word])) &&
        unique(pairs.map((pair) => pair.picture)) && pairs.every(({ word, picture }) =>
          Object.hasOwn(pl.match.words, word) && pictureIds.includes(picture) && pictureOrder.some((id) => id === picture)),
      'ambiguous matching pairs for ' + id)
      continue
    }
    const { path, tolerance, coverage, targets } = challenge
    require(tolerance > 0 && tolerance <= 0.15 && coverage >= 0.9 && coverage <= 1 &&
      path.length >= 3 && path.every(({ x, y }, index) => x >= tolerance && x <= 1 - tolerance &&
        y >= tolerance && y <= 1 - tolerance &&
        (!index || Math.hypot(x - path[index - 1].x, y - path[index - 1].y) > 0)),
    'invalid tracing parameters for ' + id)
    require(targets.length >= 2 && targets[0] === 0 && targets.at(-1) === path.length - 1 &&
      targets.every((target, index) => Number.isInteger(target) && (!index || target > targets[index - 1])),
    'invalid alternative targets for ' + id)
  }

  require(unique(quests.map((quest) => quest.id)), 'duplicate quest ID')
  require(unique(quests.map((quest) => quest.reward.id)), 'duplicate reward ID')
  require(unique(cats.map(({ id }) => id)), 'duplicate cat ID')
  for (const cat of cats) {
    const map = maps[cat.location]
    const solids = solidsFor(map)
    require(Object.hasOwn(pl.cat.names, cat.name) && unique(cat.attractions.map(({ object }) => object)),
      'invalid resident cat ' + cat.id)
    for (const target of [cat.rest, ...cat.attractions.map(({ position }) => position)]) {
      require([cat.greet, target].every(({ x, y }) => x >= 5 && x <= map.width - 5 && y >= 3 && y <= map.height - 3) &&
        clearCatRoute(cat.greet, target, solids), 'blocked cat route for ' + cat.id)
    }
    for (const { object, activity } of cat.attractions) {
      require(map.furniture.some(({ id, art }) => id === object && art === (activity === 'drinking' ? 'bowl' : 'cat-bed')) &&
        quests.filter((quest) => quest.location === cat.location && quest.effects.some((effect) =>
          effect.type === 'RESTORE_ATTRACTION' && effect.object === object)).length === 1,
      'missing restoration quest or art for ' + object)
    }
  }
  const affectedObjects = quests.flatMap(({ location, effects }) => effects.map(({ object }) => location + '/' + object))
  require(unique(affectedObjects), 'object affected by multiple quest effects')
  for (const quest of quests) {
    require(Object.hasOwn(challenges, quest.challenge) && Number.isSafeInteger(quest.reward.points) &&
      quest.reward.points > 0, 'invalid challenge or reward for ' + quest.id)
    for (const effect of quest.effects) {
      require(maps[quest.location].furniture.some(({ id }) => id === effect.object), 'missing object ' + effect.object)
    }
  }

  for (const id of locationIds) {
    const map = maps[id]
    require(map.spawns.has(locations[id].entry), 'missing entry spawn for ' + id)
    const actions = [...quests, ...transitions].filter((action) => action.location === id)
    require(actions.length === map.anchors.length && unique(actions.map((action) => action.interaction)),
      'unexpected interactions for ' + id)
    for (const action of actions) {
      require(map.anchors.some((anchor) => anchor.id === action.interaction) &&
        Object.hasOwn(pl.interactions, action.interaction), 'missing anchor or text for ' + action.interaction)
    }
  }

  for (const { location, target, interaction, minimumPoints } of transitions) {
    require(maps[target.location]?.spawns.has(target.spawn) && Number.isSafeInteger(minimumPoints) &&
      minimumPoints >= 0, 'invalid transition ' + interaction)
    require(maps[location].furniture.some(({ id, art }) => id === interaction && art === 'door'),
      'missing door for ' + interaction)
    require(transitions.some((entry) => entry.location === target.location && entry.target.location === location),
      'missing return transition for ' + interaction)
  }

  // A gate can count only rewards reachable before taking that transition.
  const reachable = new Set<LocationId>(['bedroom'])
  let size = 0
  while (size !== reachable.size) {
    size = reachable.size
    const points = quests.filter((quest) => reachable.has(quest.location))
      .reduce((total, quest) => total + quest.reward.points, 0)
    for (const edge of transitions) {
      if (reachable.has(edge.location) && edge.minimumPoints <= points) reachable.add(edge.target.location)
    }
  }
  require(reachable.size === locationIds.length, 'location blocked by unavailable rewards')
}

import type { LocationMap } from '../core/tiledMap.ts'
import { pl } from '../i18n/pl.ts'
import { challenges, locationIds, locations, quests, transitions, type LocationId } from './pack.ts'

export function validateContent(maps: Record<LocationId, LocationMap>) {
  const require = (condition: unknown, message: string) => {
    if (!condition) throw new Error('Invalid content: ' + message)
  }
  const unique = (ids: readonly string[]) => new Set(ids).size === ids.length
  for (const [id, challenge] of Object.entries(challenges)) {
    const { path, tolerance, coverage, targets } = challenge
    require(Object.hasOwn(pl.challenges, challenge.text), 'missing challenge text for ' + id)
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

import { clearCatRoute } from '../core/cat.ts'
import { mathQuestions } from '../core/education.ts'
import { canStand, nearbyInteraction, type Point } from '../core/room.ts'
import { organizedArt, solidsFor, type LocationMap } from '../core/tiledMap.ts'
import { pl } from '../i18n/pl.ts'
import { attractions } from './catCatalog.ts'
import { reachableLocations } from './routes.ts'
import { cats, challenges, dialogues, locationIds, locations, mathOperations, pictureIds, quests, transitions, type Challenge, type LocationId, type SortChallenge } from './pack.ts'

const unique = (ids: readonly string[]) => new Set(ids).size === ids.length

export function validSort(challenge: SortChallenge): boolean {
  const ids = challenge.items.map(({ id }) => id)
  if (ids.length < 2 || ids.length > 6 || !unique(ids) ||
      !challenge.items.every(({ id, picture }) => Object.hasOwn(pl.sort.items, id) &&
        (picture === undefined || pictureIds.includes(picture))) ||
      !unique(ids.map((id) => pl.sort.items[id]))) return false
  if (challenge.mode === 'sequence') {
    return challenge.order.length === ids.length && unique(challenge.order) &&
      challenge.order.every((id) => ids.includes(id))
  }
  const { groups, assignments } = challenge
  return groups.length >= 2 && unique(groups) && groups.every((group) => Object.hasOwn(pl.sort.groups, group) &&
    ids.some((id) => assignments[id] === group)) && unique(groups.map((group) => pl.sort.groups[group])) &&
    Object.keys(assignments).length === ids.length &&
    ids.every((id) => groups.some((group) => assignments[id] === group))
}

function walkableFrom(map: LocationMap, entry: Point) {
  const solids = solidsFor(map)
  const index = ({ x, y }: Point) => y * map.width + x
  const seen = new Uint8Array(map.width * map.height)
  const queue: Point[] = [entry]
  seen[index(entry)] = 1
  for (let i = 0; i < queue.length; i++) {
    const { x, y } = queue[i]
    for (const step of [{ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }]) {
      if (step.x < 5 || step.x > map.width - 5 || step.y < 3 || step.y > map.height - 3) continue
      const key = index(step)
      if (seen[key]) continue
      if (canStand(step, solids)) queue.push(step)
      seen[key] = 1
    }
  }
  // Only tiles placed in the queue are reachable; visited walls stay at 1.
  for (const tile of queue) seen[index(tile)] = 2
  return (point: Point) => Number.isInteger(point.x) && Number.isInteger(point.y) && seen[index(point)] === 2
}

export function validateContent(maps: Record<LocationId, LocationMap>) {
  const require = (condition: unknown, message: string) => {
    if (!condition) throw new Error('Invalid content: ' + message)
  }
  for (const [id, challenge] of Object.entries<Challenge>(challenges)) {
    require(Object.hasOwn(pl.challenges, challenge.text), 'missing challenge text for ' + id)
    if (challenge.type === 'SORT_ORDER') {
      require(validSort(challenge), 'ambiguous sort solution for ' + id)
      continue
    }
    if (challenge.type === 'MATH_CHOICE') {
      require(Number.isSafeInteger(challenge.maximum) && challenge.maximum >= 2 && challenge.maximum <= 10 &&
        Number.isSafeInteger(challenge.seed) && (challenge.counter === undefined ||
          Object.hasOwn(pl.math.counters, challenge.counter)) && challenge.operations.length > 0 &&
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

  const stable = (ids: readonly string[]) => unique(ids) && ids.every((id) => /^[a-z][a-z0-9-]*$/.test(id))
  require(stable(quests.map((quest) => quest.id)), 'invalid or duplicate quest ID')
  require(stable(quests.map((quest) => quest.reward.id)), 'invalid or duplicate reward ID')
  require(stable(cats.map(({ id }) => id)), 'invalid or duplicate cat ID')
  require(unique(attractions.map(({ location, object }) => location + '/' + object)) &&
    unique(attractions.map(({ location, position: { x, y } }) => location + '/' + x + '/' + y)),
  'duplicate attraction object or activity spot')
  const gardenArt = {
    water: 'garden-bowl', bedding: 'garden-bed', scratch: 'garden-post', tunnel: 'garden-tunnel',
    toys: 'garden-toys', platform: 'garden-platform', shelter: 'garden-shelter', flowers: 'garden-flowers',
  } as const
  for (const spot of attractions) {
    const art = spot.location === 'garden' ? gardenArt[spot.tag] : spot.tag === 'water' ? 'bowl' : 'cat-bed'
    require(Object.hasOwn(pl.attractions, spot.tag) &&
      maps[spot.location].furniture.some((prop) => prop.id === spot.object && prop.art === art) &&
      quests.filter((quest) => quest.location === spot.location && quest.effects.some((effect) =>
        effect.type === 'RESTORE_ATTRACTION' && effect.object === spot.object)).length === 1,
    'missing restoration quest or art for ' + spot.object)
  }
  require(unique(cats.map(({ location, greet: { x, y } }) => location + '/' + x + '/' + y)),
    'duplicate cat greeting spot')
  for (const cat of cats) {
    const map = maps[cat.location]
    const solids = solidsFor(map)
    const available = attractions.filter(({ location }) => location === cat.location)
    require(Object.hasOwn(pl.cat.names, cat.id) && Object.hasOwn(pl.kicipedia.profiles, cat.id) &&
      stable(cat.attractions.map(({ object }) => object)) &&
      cat.attractions.every((spot) => available.includes(spot)) &&
      (!cat.requires || (cat.requires.length > 0 && unique(cat.requires) &&
        cat.requires.every((tag) => cat.attractions.some((spot) => spot.tag === tag)))),
    'invalid cat preferences or habitat for ' + cat.id)
    require(!cat.pace || (cat.pace.speed > 0 && cat.pace.speed <= 64 &&
      cat.pace.idleMs >= 1000 && cat.pace.idleMs <= 6000), 'invalid cat pace for ' + cat.id)
    if (cat.roam) {
      const stops = [cat.greet, cat.rest, ...cat.roam, ...cat.attractions.map(({ position }) => position)]
      require(stops.every((from) => stops.every((to) => clearCatRoute(from, to, solids))),
        'blocked roaming leg for ' + cat.id)
    }
    for (const target of [cat.rest, ...cat.attractions.map(({ position }) => position)]) {
      require([cat.greet, target].every(({ x, y }) => x >= 5 && x <= map.width - 5 && y >= 3 && y <= map.height - 3) &&
        clearCatRoute(cat.greet, target, solids), 'blocked cat route for ' + cat.id)
    }
  }
  const affectedObjects = quests.flatMap(({ location, effects }) => effects.map(({ object }) => location + '/' + object))
  require(unique(affectedObjects), 'object affected by multiple quest effects')
  for (const quest of quests) {
    require(Object.hasOwn(challenges, quest.challenge) && Number.isSafeInteger(quest.reward.points) &&
      quest.reward.points === 1, 'invalid challenge or reward for ' + quest.id)
    for (const effect of quest.effects) {
      const furniture = maps[quest.location].furniture.find(({ id }) => id === effect.object)
      require(furniture && (effect.type === 'HIDE_OBJECT' ||
        (effect.type === 'ORGANIZE_OBJECT' && organizedArt.some((art) => art === furniture.art)) ||
        (effect.type === 'RESTORE_ATTRACTION' && attractions.some(({ location, object }) =>
          location === quest.location && object === effect.object))), 'invalid world effect for ' + effect.object)
    }
  }

  for (const id of locationIds) {
    const map = maps[id]
    const entry = map.spawns.get(locations[id].entry)
    require(entry && Number.isInteger(entry.x) && Number.isInteger(entry.y), 'invalid entry spawn for ' + id)
    const reachable = walkableFrom(map, entry!)
    for (const [spawn, point] of map.spawns) {
      require(reachable(point), 'unreachable spawn ' + id + '/' + spawn)
    }
    for (const anchor of map.anchors) {
      require(reachable(anchor) && nearbyInteraction(anchor, map.anchors) === anchor.id,
        'unreachable or overlapping anchor ' + id + '/' + anchor.id)
    }
    for (const cat of cats.filter(({ location }) => location === id)) {
      require(reachable(cat.greet) && reachable(cat.rest) &&
        cat.attractions.every(({ position }) => reachable(position)), 'inaccessible cat encounter for ' + cat.id)
    }
    for (const spot of attractions.filter(({ location }) => location === id)) {
      require(reachable(spot.position), 'inaccessible activity spot ' + spot.object)
    }
    const actions = [...quests, ...transitions, ...dialogues].filter((action) => action.location === id)
    require(actions.length === map.anchors.length && unique(actions.map((action) => action.interaction)),
      'unexpected interactions for ' + id)
    for (const action of actions) {
      require(map.anchors.some((anchor) => anchor.id === action.interaction) &&
        Object.hasOwn(pl.interactions, action.interaction), 'missing anchor or text for ' + action.interaction)
    }
  }

  for (const { location, interaction, speaker, hints, gate, afterGate } of dialogues) {
    require(maps[location].furniture.some(({ id, art }) => id === interaction && art === 'guide') &&
      Object.hasOwn(pl.dialogue, speaker) && Object.hasOwn(pl.dialogue, afterGate) &&
      hints.length > 0 && unique(hints.map((hint) => hint.location)) && hints.every((hint) =>
        quests.some((quest) => quest.location === hint.location) && Object.hasOwn(pl.dialogue, hint.text)) &&
      transitions.some((edge) => edge.location === location && edge.interaction === gate && edge.minimumPoints > 0),
    'invalid dialogue references for ' + interaction)
  }

  for (const { location, target, interaction, minimumPoints, kind } of transitions) {
    require(maps[target.location]?.spawns.has(target.spawn) && Number.isSafeInteger(minimumPoints) &&
      minimumPoints >= 0, 'invalid transition ' + interaction)
    require(maps[location].furniture.some(({ id, art }) => id === interaction && art === (kind ?? 'door')),
      'missing transition art for ' + interaction)
  }

  // A gate can count only rewards reachable without using that gate.
  const availablePoints = (reachable: ReadonlySet<LocationId>) =>
    quests.filter((quest) => reachable.has(quest.location)).reduce((total, quest) => total + quest.reward.points, 0)
  for (const edge of transitions.filter(({ minimumPoints }) => minimumPoints > 0)) {
    const beforeGate = reachableLocations(availablePoints, transitions.filter((candidate) => candidate !== edge))
    require(beforeGate.has(edge.location) && availablePoints(beforeGate) >= edge.minimumPoints,
      'gate blocked by unavailable rewards: ' + edge.interaction)
  }
  require(reachableLocations(availablePoints).size === locationIds.length, 'location blocked by unavailable rewards')
  const gardenGate = transitions.find(({ target }) => target.location === 'garden')
  require(gardenGate?.minimumPoints === 16 && quests.length === 25 &&
    availablePoints(reachableLocations(availablePoints, transitions.filter((edge) => edge !== gardenGate))) === 17,
  'expected 17 indoor rewards and 25 total rewards')
  for (let budget = 0; budget <= quests.length; budget++) {
    const reachable = reachableLocations(budget)
    for (const edge of transitions) {
      if (!reachable.has(edge.location) || budget < edge.minimumPoints) continue
      require(transitions.some((back) => back.location === edge.target.location &&
        back.target.location === edge.location && back.minimumPoints <= budget),
      'missing return transition for ' + edge.interaction)
    }
  }
}

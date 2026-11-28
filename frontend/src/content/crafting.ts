import type { pl } from '../i18n/pl.ts'
import type { LocationId, PictureId, Quest } from './pack.ts'

type Recipe = {
  kit: keyof typeof pl.kits
  picture: PictureId
  source: Quest['id']
  quest: Quest['id']
}

export const recipes: readonly Recipe[] = [
  { kit: 'cardboard', picture: 'cardboard-kit', source: 'basement-sort-storage-boxes', quest: 'workshop-build-cardboard-hideout' },
  { kit: 'felt', picture: 'felt-kit', source: 'basement-count-felt-pieces', quest: 'workshop-build-felt-ball' },
  { kit: 'fabric', picture: 'fabric-kit', source: 'basement-match-drawer-symbols', quest: 'workshop-build-resting-mat' },
  { kit: 'ramp', picture: 'ramp-kit', source: 'storage-sort-ramp-blocks', quest: 'workshop-build-cat-ramp' },
  { kit: 'scratch', picture: 'scratch-kit', source: 'storage-count-scratch-pieces', quest: 'workshop-build-scratch-board' },
  { kit: 'tube', picture: 'tube-kit', source: 'storage-match-cardboard-tubes', quest: 'workshop-build-play-tunnel' },
]

export const recipeFor = (quest: string) => recipes.find((recipe) => recipe.quest === quest)

export function kitStatus(recipe: Recipe, completed: readonly string[]) {
  if (completed.includes(recipe.quest)) return 'built'
  return completed.includes(recipe.source) ? 'available' : 'waiting'
}

export function obtainableQuests(candidates: readonly Quest[], locations: ReadonlySet<LocationId>) {
  const obtained = new Set<string>()
  const inReach = candidates.filter(({ location }) => locations.has(location))
  let previous = -1
  while (previous !== obtained.size) {
    previous = obtained.size
    for (const { id } of inReach) {
      const recipe = recipeFor(id)
      if (!obtained.has(id) && (!recipe || obtained.has(recipe.source))) obtained.add(id)
    }
  }
  return obtained
}

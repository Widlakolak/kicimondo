import { challenges } from '../pack.ts'

export const educationalCompatibilityVersion = 4

// Only the seven existing v4 exercises accept downloadable variants.
export const downloadableMath = {
  'count-fruit': challenges['count-fruit'],
  'count-garden-flowers': challenges['count-garden-flowers'],
  'count-school-supplies': challenges['count-school-supplies'],
  'count-towels': challenges['count-towels'],
  'count-water-drops': challenges['count-water-drops'],
  'fill-garden-water': challenges['fill-garden-water'],
  'restore-scratching-post': challenges['restore-scratching-post'],
}

export function isDownloadableMath(id: string): id is keyof typeof downloadableMath {
  return Object.prototype.hasOwnProperty.call(downloadableMath, id)
}

import { attractions, cats, type CatDefinition, type CatId } from '../content/catCatalog.ts'
import type { LocationId } from '../content/pack.ts'

export function eligibleCats(location: LocationId, restored: readonly string[]): CatDefinition[] {
  const tags = new Set(attractions.filter((spot) => spot.location === location && restored.includes(spot.object))
    .map(({ tag }) => tag))
  return cats.filter((cat) => cat.location === location && (!cat.requires || cat.requires.every((tag) => tags.has(tag))))
}

export const visitorCapacity = 3
export const rotationInterval = 8000

export class VisitorRotation {
  private eligible: readonly CatId[] = []
  private present: CatId[] = []
  private waiting: CatId[] = []
  private elapsed = 0

  step(eligible: readonly CatId[], delta: number, paused: boolean, isPetting: (id: CatId) => boolean): readonly CatId[] {
    if (paused) return this.present
    if (eligible !== this.eligible) {
      this.eligible = eligible
      this.present = this.present.filter((id) => eligible.includes(id) || isPetting(id))
      this.waiting = this.waiting.filter((id) => eligible.includes(id))
      for (const id of eligible) {
        if (!this.present.includes(id) && !this.waiting.includes(id)) this.waiting.push(id)
      }
    }
    // Restorations only add eligibility in normal gameplay. Keep a petting visitor if a caller changes the habitat.
    const departing = this.present.findIndex((id) => !eligible.includes(id) && !isPetting(id))
    if (departing >= 0) this.present = this.present.filter((_, i) => i !== departing)
    if (this.present.length < visitorCapacity && this.waiting.length) {
      this.present = [...this.present, ...this.waiting.splice(0, visitorCapacity - this.present.length)]
    }
    if (!this.waiting.length) {
      this.elapsed = 0
      return this.present
    }
    this.elapsed += Math.max(0, delta)
    if (this.elapsed >= rotationInterval) {
      const index = this.present.findIndex((id) => !isPetting(id))
      if (index >= 0) {
        const leaving = this.present[index]
        this.present = [...this.present.filter((_, i) => i !== index), this.waiting.shift()!]
        if (eligible.includes(leaving)) this.waiting.push(leaving)
        this.elapsed = 0
      }
    }
    return this.present
  }
}

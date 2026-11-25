import { cats, type CatDefinition, type CatId } from '../content/catCatalog.ts'
import type { LocationId } from '../content/pack.ts'
import { canPet, petCat, startCat, stepCat, type CatState } from './cat.ts'
import { eligibleCats, VisitorRotation } from './habitat.ts'
import type { Box, Point } from './room.ts'

export const petRadius = 25

export type CatEntity = { definition: CatDefinition; state: CatState }

export class CatPopulation {
  private readonly entities = new Map<CatId, CatEntity>()
  private readonly occupied = new Map<string, CatId>()
  private readonly rotation = new VisitorRotation()
  private readonly visitors = new Map<CatId, CatDefinition>()
  private eligible: CatId[] = []
  private roster: readonly CatId[] = []
  private restored: readonly string[] = []

  constructor(private readonly location: LocationId) {
    for (const cat of cats) {
      if (cat.location !== location) continue
      if (cat.requires) this.visitors.set(cat.id, cat)
      else this.add(cat)
    }
  }

  setRestored(objects: readonly string[]) {
    this.restored = objects
    if (this.visitors.size) this.eligible = eligibleCats(this.location, objects).map(({ id }) => id)
  }

  get visitorIds() { return this.roster }
  get members() { return this.entities.values() }
  has(id: CatId) { return this.entities.has(id) }

  private add(definition: CatDefinition) {
    this.entities.set(definition.id, { definition, state: startCat(definition) })
  }

  step(delta: number, solids: readonly Box[], paused: boolean) {
    if (paused) return
    if (this.visitors.size) {
      const next = this.rotation.step(this.eligible, Math.min(delta, 40), false, this.isPetting)
      if (next !== this.roster) {
        for (const id of this.roster) {
          if (next.includes(id)) continue
          const spot = this.entities.get(id)?.state.spot
          if (spot) this.occupied.delete(spot)
          this.entities.delete(id)
        }
        for (const id of next) {
          if (!this.entities.has(id)) this.add(this.visitors.get(id)!)
        }
        this.roster = next
      }
    }
    for (const entity of this.entities.values()) {
      const before = entity.state.spot
      const state = stepCat(entity.state, entity.definition, delta, this.restored, solids, false, this.occupied)
      entity.state = state
      if (before !== state.spot) {
        if (before) this.occupied.delete(before)
        if (state.spot) this.occupied.set(state.spot, entity.definition.id)
      }
    }
  }

  private readonly isPetting = (id: CatId) => this.entities.get(id)?.state.activity === 'petting'

  nearest(point: Point): CatEntity | null {
    let nearest = null
    let distance = petRadius ** 2
    for (const entity of this.entities.values()) {
      const { x, y } = entity.state.position
      const squared = (point.x - x) ** 2 + (point.y - y) ** 2
      if (squared > distance || (nearest && squared === distance)) continue
      nearest = entity
      distance = squared
    }
    return nearest
  }

  pet(id: CatId): boolean {
    const entity = this.entities.get(id)
    if (!entity || !canPet(entity.state)) return false
    entity.state = petCat(entity.state)
    return true
  }
}

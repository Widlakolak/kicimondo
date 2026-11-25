import Phaser from 'phaser'
import type { Checkpoint } from '../content/pack'
import type { CatId } from '../content/catCatalog'
import { locations } from '../content/pack'
import { maps } from '../content/world'
import { solidsFor } from '../core/tiledMap'
import { canPet } from '../core/cat'
import { CatPopulation, type CatEntity } from '../core/catPopulation'
import { canObserve } from '../core/discovery'
import { catFrame, paintCat } from './catArt'
import type { Avatar } from '../core/profile'
import { moveInRoom, nearbyInteraction, type Direction, type InteractionId } from '../core/room'
import { paintAvatar, type Paint } from './avatarArt'
import { paintFurniture, paintRoom } from './locationArt'
import type { RoomInput } from './RoomInput'
export type WorldState = {
  hidden: readonly string[]
  openDoors: readonly string[]
  restored: readonly string[]
  active: readonly string[]
  discovered: readonly CatId[]
}

export type CatCue = 'ready' | 'space' | 'petting'

function painter(graphics: Phaser.GameObjects.Graphics): Paint {
  return (color, x, y, width, height) => {
    graphics.fillStyle(color).fillRect(x, y, width, height)
  }
}

export function createRoom(
  parent: HTMLElement,
  avatar: Avatar,
  input: RoomInput,
  checkpoint: Checkpoint,
  initialWorld: WorldState,
  onNearby: (id: InteractionId | null, cue: CatCue | null) => void,
  onInteract: (id: InteractionId) => void,
  onObserve: (id: CatId) => void,
) {
  const map = maps[checkpoint.location]
  const spawn = map.spawns.get(checkpoint.spawn) ?? map.spawns.get(locations[checkpoint.location].entry)
  if (!spawn) throw new Error('No spawn for location')
  let world = initialWorld
  const population = new CatPopulation(checkpoint.location)
  const observed = new Set(initialWorld.discovered)
  const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((id, i) => id === b[i])

  class LocationScene extends Phaser.Scene {
    private backdrop!: Phaser.GameObjects.Graphics
    private drawnWorld: WorldState | null = null
    private solids = solidsFor(map)
    private anchors = map.anchors
    private player!: Phaser.GameObjects.Graphics
    private readonly catSprites = new Map<CatId, { graphic: Phaser.GameObjects.Graphics; frame: string }>()
    private drawnRoster: readonly CatId[] | null = null
    private catCue: CatCue | null = null
    private marker!: Phaser.GameObjects.Graphics
    private position = { ...spawn! }
    private facing: Direction = 'down'
    private nearby: InteractionId | null = null
    private walkTime = 0
    private lastFrame = ''

    create() {
      this.backdrop = this.add.graphics()
      this.drawWorld()
      this.marker = this.add.graphics()
      this.player = this.add.graphics()
      this.renderPlayer(false, 0)
      this.renderCats()
    }

    private drawWorld() {
      this.drawnWorld = world
      const paint = painter(this.backdrop.clear())
      paintRoom(paint, locations[checkpoint.location].art)
      for (const { id, art, box } of map.furniture) {
        if (!world.hidden.includes(id)) paintFurniture(paint, art, box, world.openDoors.includes(id) || world.restored.includes(id))
      }
      this.solids = solidsFor(map, world.hidden)
      this.anchors = map.anchors.filter(({ id }) => world.active.includes(id))
      population.setRestored(world.restored)
    }

    update(_time: number, delta: number) {
      if (this.drawnWorld !== world) this.drawWorld()
      if (input.isPaused() || document.hidden) return
      const direction = input.direction()
      const seconds = Math.min(delta, 40) / 1000
      const next = moveInRoom(this.position, {
        x: direction.x * seconds * 89,
        y: direction.y * seconds * 89,
      }, this.solids)
      const walking = next.x !== this.position.x || next.y !== this.position.y
      this.position = next
      if (direction.y) this.facing = direction.y < 0 ? 'up' : 'down'
      else if (direction.x) this.facing = direction.x < 0 ? 'left' : 'right'

      this.renderPlayer(walking, delta)
      const anchor = nearbyInteraction(next, this.anchors)
      // Record observations before a simultaneous interaction can change the room.
      this.observeCats(next)
      const requested = input.takeInteraction()
      if (requested && anchor) {
        input.setPaused(true)
        onInteract(anchor)
      } else if (requested) {
        const cat = population.nearest(next)
        if (cat && population.pet(cat.definition.id)) onInteract(cat.definition.id)
      }
      population.step(delta, this.solids, input.isPaused())
      this.renderCats()
      const cat = anchor ? null : population.nearest(next)
      const nearby = anchor ?? cat?.definition.id ?? null
      const cue: CatCue | null = cat
        ? canPet(cat.state) ? 'ready' : cat.state.activity === 'petting' ? 'petting' : 'space'
        : null
      if (this.nearby !== nearby || this.catCue !== cue) {
        this.nearby = nearby
        this.catCue = cue
        this.marker.clear()
        const furniture = map.furniture.find((item) => item.id === nearby)
        if (furniture) {
          const { x, y, width } = furniture.box
          const center = Math.round(x + width / 2)
          this.marker.fillStyle(0xffe195).fillTriangle(center - 4, y - 7, center + 4, y - 7, center, y - 2)
        }
        onNearby(nearby, cue)
      }
    }

    private observeCats(position: { x: number; y: number }) {
      for (const { definition, state } of population.members) {
        const { id } = definition
        if (observed.has(id) || !canObserve(position, state.position, this.solids)) continue
        observed.add(id)
        onObserve(id)
      }
    }

    private renderCats() {
      const roster = population.visitorIds
      if (roster !== this.drawnRoster) {
        for (const [id, sprite] of this.catSprites) {
          if (population.has(id)) continue
          sprite.graphic.destroy()
          this.catSprites.delete(id)
        }
        if (checkpoint.location === 'garden') parent.dataset.visitors = roster.join(' ')
        this.drawnRoster = roster
      }
      for (const entity of population.members) this.renderCat(entity)
    }

    private renderCat({ definition, state }: CatEntity) {
      let sprite = this.catSprites.get(definition.id)
      if (!sprite) {
        sprite = { graphic: this.add.graphics(), frame: '' }
        this.catSprites.set(definition.id, sprite)
      }
      const x = Math.round(state.position.x)
      const y = Math.round(state.position.y)
      if (sprite.graphic.x !== x || sprite.graphic.y !== y) sprite.graphic.setPosition(x, y)
      const frame = catFrame(state)
      const frameKey = state.activity + ':' + state.facing + ':' + frame
      if (frameKey !== sprite.frame) {
        sprite.frame = frameKey
        paintCat(painter(sprite.graphic.clear()), state, frame, definition.appearance)
      }
      if (sprite.graphic.depth !== y) sprite.graphic.setDepth(y)
      if (definition.id !== 'amber') return
      if (parent.dataset.catActivity !== state.activity) parent.dataset.catActivity = state.activity
      if (parent.dataset.catX !== String(x)) parent.dataset.catX = String(x)
      if (parent.dataset.catY !== String(y)) parent.dataset.catY = String(y)
      const elapsed = String(Math.floor(state.elapsed))
      if (parent.dataset.catElapsed !== elapsed) parent.dataset.catElapsed = elapsed
    }

    private renderPlayer(walking: boolean, delta: number) {
      this.walkTime = walking ? this.walkTime + delta : 0
      const step = walking ? (Math.floor(this.walkTime / 120) % 2 ? 1 : -1) : 0
      const frame = `${this.facing}:${step}`
      if (this.lastFrame !== frame) {
        this.lastFrame = frame
        this.player.clear()
        this.player.fillStyle(0x604656, 0.32).fillEllipse(8, 22, 16, 5)
        paintAvatar(painter(this.player), avatar, this.facing, step)
      }
      const x = Math.round(this.position.x)
      const y = Math.round(this.position.y)
      this.player.setPosition(x - 8, y - 21)
      if (this.player.depth !== y) this.player.setDepth(y)
      // Expose the rendered feet position for browser checks without reading pixels.
      if (parent.dataset.x !== String(x)) parent.dataset.x = String(x)
      if (parent.dataset.y !== String(y)) parent.dataset.y = String(y)
    }
  }

  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    width: map.width,
    height: map.height,
    parent,
    pixelArt: true,
    audio: { noAudio: true },
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    scale: { mode: Phaser.Scale.NONE },
    scene: LocationScene,
  })
  return {
    setWorld(next: WorldState) {
      for (const id of next.discovered) observed.add(id)
      if (!same(world.hidden, next.hidden) || !same(world.restored, next.restored) ||
          !same(world.openDoors, next.openDoors) || !same(world.active, next.active)) world = next
    },
    setBackgrounded(backgrounded: boolean) {
      if (backgrounded) game.pause()
      else game.resume()
    },
    destroy() { game.destroy(true) },
  }
}

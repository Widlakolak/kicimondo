import Phaser from 'phaser'
import type { Checkpoint } from '../content/pack'
import { cats, locations } from '../content/pack'
import { maps } from '../content/world'
import { solidsFor } from '../core/tiledMap'
import { canPet, petCat, startCat, stepCat } from '../core/cat'
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
) {
  const map = maps[checkpoint.location]
  const spawn = map.spawns.get(checkpoint.spawn) ?? map.spawns.get(locations[checkpoint.location].entry)
  if (!spawn) throw new Error('No spawn for location')
  let world = initialWorld
  const resident = cats.find(({ location }) => location === checkpoint.location)

  class LocationScene extends Phaser.Scene {
    private backdrop!: Phaser.GameObjects.Graphics
    private drawnWorld: WorldState | null = null
    private solids = solidsFor(map)
    private anchors = map.anchors
    private player!: Phaser.GameObjects.Graphics
    private catSprite?: Phaser.GameObjects.Graphics
    private cat = resident ? startCat(resident) : null
    private lastCatFrame = ''
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
      if (this.cat) this.catSprite = this.add.graphics()
      this.player = this.add.graphics()
      this.renderPlayer(false, 0)
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
    }

    update(_time: number, delta: number) {
      if (this.drawnWorld !== world) this.drawWorld()
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
      const catNear = resident && this.cat &&
        Math.hypot(next.x - this.cat.position.x, next.y - this.cat.position.y) <= 25
      const nearby = anchor ?? (catNear ? resident.id : null)
      const requested = input.takeInteraction()
      if (requested && anchor) {
        input.setPaused(true)
        onInteract(anchor)
      }
      if (resident && this.cat) {
        if (requested && !anchor && catNear && canPet(this.cat)) {
          this.cat = petCat(this.cat)
          onInteract(resident.id)
        }
        this.cat = stepCat(this.cat, resident, delta, world.restored, this.solids, input.isPaused() || document.hidden)
        this.renderCat()
      }
      const cue: CatCue | null = nearby === resident?.id && this.cat
        ? canPet(this.cat) ? 'ready' : this.cat.activity === 'petting' ? 'petting' : 'space'
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

    private renderCat() {
      const cat = this.cat
      if (!cat || !this.catSprite) return
      const x = Math.round(cat.position.x)
      const y = Math.round(cat.position.y)
      this.catSprite.setPosition(x, y)
      const frame = catFrame(cat)
      const frameKey = cat.activity + ':' + cat.facing + ':' + frame
      if (frameKey !== this.lastCatFrame) {
        this.lastCatFrame = frameKey
        paintCat(painter(this.catSprite.clear()), cat, frame)
      }
      // Depth sorting leaves the cat and avatar free to share walkable space.
      this.catSprite.setDepth(y)
      this.player.setDepth(Math.round(this.position.y))
      if (parent.dataset.catActivity !== cat.activity) parent.dataset.catActivity = cat.activity
      if (parent.dataset.catX !== String(x)) parent.dataset.catX = String(x)
      if (parent.dataset.catY !== String(y)) parent.dataset.catY = String(y)
      const elapsed = String(Math.floor(cat.elapsed))
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
    setWorld(next: WorldState) { world = next },
    setBackgrounded(backgrounded: boolean) {
      if (backgrounded) game.pause()
      else game.resume()
    },
    destroy() { game.destroy(true) },
  }
}

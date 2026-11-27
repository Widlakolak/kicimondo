import Phaser from 'phaser'
import type { Checkpoint } from '../content/pack'
import type { CatId } from '../content/catCatalog'
import { locations, quests } from '../content/pack'
import { maps } from '../content/world'
import { solidsFor } from '../core/tiledMap'
import { canPet } from '../core/cat'
import { CatPopulation, petRadius, type CatEntity } from '../core/catPopulation'
import { canObserve } from '../core/discovery'
import { catFrame, paintCat } from './catArt'
import type { Avatar } from '../core/profile'
import { moveInRoom, nearbyInteraction, type Direction, type InteractionId } from '../core/room'
import { paintAvatar, type Paint } from './avatarArt'
import { paintFurniture, paintRoom } from './locationArt'
import type { RoomInput } from './RoomInput'
import { cameraScroll, cameraViewport, canvasToWorld, type Viewport } from '../core/camera'
import type { Box, Point } from '../core/room'
import { clearSegment, routeTo } from '../core/navigation'
export type WorldState = {
  hidden: readonly string[]
  openDoors: readonly string[]
  restored: readonly string[]
  active: readonly string[]
  quests: readonly string[]
  doors: readonly string[]
  exit: string | null
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
  onFirstMove: () => void,
) {
  const map = maps[checkpoint.location]
  const spawn = map.spawns.get(checkpoint.spawn) ?? map.spawns.get(locations[checkpoint.location].entry)
  if (!spawn) throw new Error('No spawn for location')
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const measure = () => cameraViewport({ width: parent.clientWidth, height: parent.clientHeight })
  let view = measure()
  let scene: LocationScene | null = null
  const ready = (locationScene: LocationScene) => { scene = locationScene }
  const targets = map.anchors.map((anchor) => {
    const quest = quests.find(({ location, interaction }) => location === checkpoint.location && interaction === anchor.id)
    const prop = map.furniture.find(({ id }) => id === (quest?.effects[0]?.object ?? anchor.id))
    return { id: anchor.id, box: prop?.box ?? { x: anchor.x - 6, y: anchor.y - 6, width: 12, height: 12 } }
  })
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
    private scroll: Point | undefined
    private cameraTarget: Point | undefined
    private quests!: Phaser.GameObjects.Graphics
    private guidance!: Phaser.GameObjects.Graphics
    private destination!: Phaser.GameObjects.Graphics
    private route: Point[] = []
    private feedbackMs = 0
    private inputRevision = input.revision
    private lastGuidance = ''
    private firstMoved = false

    resize(next: Viewport) {
      this.cameras.main.setSize(next.width, next.height)
      this.updateCamera(0, true)
      this.drawGuidance()
    }

    private updateCamera(delta: number, snap = false) {
      const target = cameraScroll(this.position, map, view, snap ? undefined : this.cameraTarget)
      this.cameraTarget = target
      const factor = snap || reducedMotion.matches || !this.scroll ? 1 : 1 - Math.exp(-Math.min(delta, 40) / 65)
      const dx = target.x - (this.scroll?.x ?? target.x)
      const dy = target.y - (this.scroll?.y ?? target.y)
      this.scroll = {
        x: Math.abs(dx) < 0.4 ? target.x : target.x - dx * (1 - factor),
        y: Math.abs(dy) < 0.4 ? target.y : target.y - dy * (1 - factor),
      }
      const x = Math.round(this.scroll.x)
      const y = Math.round(this.scroll.y)
      const camera = this.cameras.main
      if (x !== camera.scrollX || y !== camera.scrollY || snap) {
        camera.setScroll(x, y)
        parent.dataset.cameraX = String(x)
        parent.dataset.cameraY = String(y)
      }
    }

    create() {
      ready(this)
      this.cameras.main.roundPixels = true
      this.backdrop = this.add.graphics()
      this.quests = this.add.graphics().setDepth(1000)
      this.guidance = this.add.graphics().setDepth(1002).setScrollFactor(0)
      this.destination = this.add.graphics().setDepth(1001)
      this.drawWorld()
      this.marker = this.add.graphics()
      this.player = this.add.graphics()
      this.renderPlayer(false, 0)
      this.renderCats()
      this.resize(view)
    }

    private drawWorld() {
      this.drawnWorld = world
      const paint = painter(this.backdrop.clear())
      paint(0x4d3947, 0, 0, map.width, map.height)
      paintRoom(paint, locations[checkpoint.location].art)
      for (const { id, art, box } of map.furniture) {
        if (!world.hidden.includes(id)) paintFurniture(paint, art, box, world.openDoors.includes(id) || world.restored.includes(id))
      }
      this.solids = solidsFor(map, world.hidden)
      this.anchors = map.anchors.filter(({ id }) => world.active.includes(id))
      population.setRestored(world.restored)
      this.drawMarkers()
    }

    private clearRoute() {
      this.inputRevision = input.revision
      this.route = []
      this.feedbackMs = 0
      this.destination.clear()
      delete parent.dataset.destination
    }

    private interact(id: InteractionId) {
      input.setPaused(true)
      this.clearRoute()
      onInteract(id)
    }

    tap(point: Point) {
      if (input.isPaused()) return
      input.clear()
      this.clearRoute()
      const inside = (box: Box, pad = 0) => point.x >= box.x - pad && point.x <= box.x + box.width + pad &&
        point.y >= box.y - pad && point.y <= box.y + box.height + pad
      const furniture = targets.find(({ id, box }) => this.anchors.some((anchor) => anchor.id === id) &&
        (inside(box) || (world.quests.includes(id) &&
          Math.hypot(point.x - box.x - box.width / 2, point.y - Math.max(10, box.y - 9)) <= 8)))
      const anchor = furniture ? this.anchors.find(({ id }) => id === furniture.id) : undefined
      if (anchor && Math.hypot(this.position.x - anchor.x, this.position.y - anchor.y) <= anchor.radius) {
        this.interact(anchor.id)
        return
      }
      if (!anchor) {
        for (const { definition, state } of population.members) {
          if (!inside({ x: state.position.x - 11, y: state.position.y - 16, width: 22, height: 19 })) continue
          if (Math.hypot(this.position.x - state.position.x, this.position.y - state.position.y) <= petRadius) {
            if (population.pet(definition.id)) onInteract(definition.id)
            return
          }
          this.walkTo(state.position)
          return
        }
      }
      this.walkTo(anchor ?? point)
    }

    private walkTo(point: Point) {
      const route = routeTo(this.position, point, map, this.solids)
      this.route = route ?? []
      this.feedbackMs = route ? 0 : 650
      this.destination.lineStyle(2, route ? 0xffefbc : 0x663847)
      if (route) this.destination.strokeCircle(point.x, point.y, 5)
      else this.destination.lineBetween(point.x - 4, point.y - 4, point.x + 4, point.y + 4)
        .lineBetween(point.x - 4, point.y + 4, point.x + 4, point.y - 4)
      parent.dataset.destination = route ? 'walking' : 'blocked'
    }

    private drawMarkers() {
      const graphic = this.quests.clear()
      parent.dataset.quests = world.quests.join(' ')
      if (world.exit) parent.dataset.exit = world.exit
      else delete parent.dataset.exit
      for (const { id, box } of targets) {
        const quest = world.quests.includes(id)
        if (!quest && !world.doors.includes(id)) continue
        const x = Math.round(box.x + box.width / 2), y = Math.max(10, box.y - 9)
        if (quest) {
          graphic.lineStyle(1, 0xffe182, 0.85).strokeRoundedRect(box.x - 1, box.y - 1, box.width + 2, box.height + 2, 2)
          this.star(graphic, x, y)
        } else {
          graphic.fillStyle(0x493144).fillRoundedRect(x - 7, y - 6, 14, 12, 3)
          if (world.openDoors.includes(id)) {
            if (id === world.exit) {
              graphic.lineStyle(2, 0xffd766).strokeRoundedRect(box.x - 2, box.y - 2, box.width + 4, box.height + 4, 3)
            }
            graphic.fillStyle(0xffe8ad).fillRect(x - 4, y - 1, 5, 2).fillTriangle(x, y - 4, x + 5, y, x, y + 4)
          } else {
            graphic.lineStyle(1, 0xffe8ad).strokeRoundedRect(x - 2, y - 4, 4, 5, 2)
            graphic.fillStyle(0xffe8ad).fillRect(x - 3, y - 1, 6, 5)
          }
        }
      }
    }

    private star(graphic: Phaser.GameObjects.Graphics, x: number, y: number) {
      graphic.fillStyle(0x65444a).fillCircle(x, y, 7)
      graphic.fillStyle(0xffd766).fillPoints([
        {x, y: y - 5}, {x: x + 2, y: y - 1}, {x: x + 6, y: y - 1},
        {x: x + 3, y: y + 2}, {x: x + 4, y: y + 6}, {x, y: y + 4},
        {x: x - 4, y: y + 6}, {x: x - 3, y: y + 2}, {x: x - 6, y: y - 1}, {x: x - 2, y: y - 1},
      ], true)
    }

    private drawGuidance() {
      const { scrollX, scrollY } = this.cameras.main
      const goals = world.quests.length ? world.quests : world.exit ? [world.exit] : []
      let nearest: Point | null = null
      let distance = Infinity
      for (const { id, box } of targets) {
        if (!goals.includes(id)) continue
        const x = box.x + box.width / 2
        const y = Math.max(10, box.y - 9)
        if (x >= scrollX + 7 && x <= scrollX + view.width - 7 &&
            y >= scrollY + 7 && y <= scrollY + view.height - 7) continue
        const next = Math.hypot(x - this.position.x, y - this.position.y)
        if (next < distance) { distance = next; nearest = { x, y } }
      }
      const x = nearest ? Math.round(Math.max(12, Math.min(view.width - 12, nearest.x - scrollX))) : 0
      const y = nearest ? Math.round(Math.max(12, Math.min(view.height - 12, nearest.y - scrollY))) : 0
      const dx = nearest ? Math.sign(nearest.x - scrollX - x) : 0
      const dy = nearest ? Math.sign(nearest.y - scrollY - y) : 0
      const key = nearest ? `${x}:${y}:${dx}:${dy}:${world.quests.length > 0}` : ''
      if (key === this.lastGuidance) return
      this.lastGuidance = key
      this.guidance.clear()
      if (!nearest) {
        delete parent.dataset.guide
        return
      }
      parent.dataset.guide = world.quests.length ? 'quest' : 'exit'
      if (world.quests.length) this.star(this.guidance, x, y)
      else this.guidance.fillStyle(0x65444a).fillCircle(x, y, 7)
      this.guidance.fillStyle(0xffe8ad)
        .fillTriangle(x + 9 * dx, y + 9 * dy, x + 4 * dx - 3 * dy, y + 4 * dy + 3 * dx,
          x + 4 * dx + 3 * dy, y + 4 * dy - 3 * dx)
    }

    update(_time: number, delta: number) {
      const worldChanged = this.drawnWorld !== world
      if (worldChanged) {
        this.drawWorld()
        this.drawGuidance()
      }
      if (this.inputRevision !== input.revision) this.clearRoute()
      if (input.isPaused() || document.hidden) return
      if (this.feedbackMs > 0) {
        this.feedbackMs -= Math.min(delta, 40)
        if (this.feedbackMs <= 0) this.clearRoute()
      }
      let direction = input.direction()
      const waypoint = this.route[0]
      const dx = waypoint ? waypoint.x - this.position.x : 0
      const dy = waypoint ? waypoint.y - this.position.y : 0
      const distance = Math.hypot(dx, dy)
      if (distance) direction = { x: dx / distance, y: dy / distance }
      const seconds = Math.min(delta, 40) / 1000
      const step = waypoint ? Math.min(distance, seconds * 89) : seconds * 89
      const movement = { x: direction.x * step, y: direction.y * step }
      const next = waypoint
        ? (distance <= step ? waypoint : { x: this.position.x + movement.x, y: this.position.y + movement.y })
        : moveInRoom(this.position, movement, this.solids)
      if (waypoint && !clearSegment(this.position, next, this.solids)) {
        this.clearRoute()
        return
      }
      if (waypoint && distance <= step) {
        this.route.shift()
        if (!this.route.length) this.clearRoute()
      }
      const walking = next.x !== this.position.x || next.y !== this.position.y
      this.position = next
      if (walking && !this.firstMoved) {
        this.firstMoved = true
        onFirstMove()
      }
      if (direction.y) this.facing = direction.y < 0 ? 'up' : 'down'
      else if (direction.x) this.facing = direction.x < 0 ? 'left' : 'right'

      this.renderPlayer(walking, delta)
      const cameraMoving = this.cameraTarget?.x !== this.scroll?.x || this.cameraTarget?.y !== this.scroll?.y
      if (walking || cameraMoving) {
        this.updateCamera(delta)
        this.drawGuidance()
      }
      const anchor = nearbyInteraction(next, this.anchors)
      // Record observations before a simultaneous interaction can change the room.
      this.observeCats(next)
      const requested = input.takeInteraction()
      if (requested && anchor) this.interact(anchor)
      else if (requested) {
        const cat = population.nearest(next)
        if (cat && population.pet(cat.definition.id)) { this.clearRoute(); onInteract(cat.definition.id) }
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
    width: view.width,
    height: view.height,
    backgroundColor: 0x4d3947,
    parent,
    pixelArt: true,
    audio: { noAudio: true },
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    scale: { mode: Phaser.Scale.NONE },
    scene: LocationScene,
  })
  const observer = new ResizeObserver(() => {
    if (!parent.clientWidth || !parent.clientHeight) return
    const next = measure()
    if (next.width === view.width && next.height === view.height) return
    input.clear()
    view = next
    game.scale.resize(view.width, view.height)
    scene?.resize(view)
  })
  observer.observe(parent)
  return {
    tap(client: Point) {
      if (!scene) return
      const rect = game.canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const camera = scene.cameras.main
      scene.tap(canvasToWorld(client, rect, { x: camera.scrollX, y: camera.scrollY, ...view }))
    },
    setWorld(next: WorldState) {
      for (const id of next.discovered) observed.add(id)
      if (!same(world.hidden, next.hidden) || !same(world.restored, next.restored) ||
          !same(world.openDoors, next.openDoors) || !same(world.active, next.active) ||
          !same(world.quests, next.quests) || world.exit !== next.exit) world = next
    },
    setBackgrounded(backgrounded: boolean) {
      if (backgrounded) game.pause()
      else game.resume()
    },
    destroy() { observer.disconnect(); scene = null; game.destroy(true) },
  }
}

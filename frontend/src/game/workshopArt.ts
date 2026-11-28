import type { Box } from '../core/room'
import { workshopProps, type FurnitureArt, type WorkshopProp } from '../core/tiledMap'
import type { Paint } from './avatarArt'

const ink = 0x634857
const cream = 0xffe6b4
const oak = 0xd79760
const teal = 0x659789
const rose = 0xc77b80
const amber = 0xe8ac57
const lilac = 0x9e81aa

const rooms = {
  basement: { wall: 0xbc8f76, trim: 0x876357, floor: 0xe6bb8b, seam: 0xcf9f77, runner: 0xaec1ad, edge: 0x748d7c },
  storage: { wall: 0x9c9c82, trim: 0x6b7565, floor: 0xe4bd8f, seam: 0xcaa17a, runner: 0xe2cb94, edge: 0xb79361 },
  workshop: { wall: 0xbf9296, trim: 0x8f617c, floor: 0xe8bc95, seam: 0xdca780, runner: 0xb6a5ba, edge: 0x896e9d },
}

export function paintBasementRoom(paint: Paint, room: keyof typeof rooms, width: number, height: number) {
  const { wall, trim, floor, seam, runner, edge } = rooms[room]
  paint(trim, 7, 6, width - 14, height - 13)
  paint(wall, 16, 8, width - 32, 24)
  paint(floor, 16, 32, width - 32, height - 48)
  for (let y = 32; y < height - 16; y += 16) {
    paint(seam, 16, y, width - 32, 1)
    for (let x = 32 + (y % 32) * 2; x < width - 20; x += 64) {
      paint(seam, x, y, 1, 16)
      paint(cream, x + 2, y + 5, Math.min(12, width - x - 18), 1)
    }
  }
  paint(trim, 16, 30, width - 32, 4)
  for (const x of [width / 4, width / 2, width * 3 / 4]) {
    paint(trim, x - 9, 11, 18, 14)
    paint(amber, x - 7, 13, 14, 10)
    paint(cream, x - 5, 14, 10, 6)
    paint(0xf5d1a4, x - 18, 35, 36, 4)
  }
  const x = width / 2 - 62
  const y = room === 'basement' ? 110 : room === 'storage' ? 109 : 123
  const h = room === 'workshop' ? 78 : 86
  paint(edge, x, y, 124, h)
  paint(runner, x + 4, y + 4, 116, h - 8)
  paint(cream, x + 9, y + 8, 106, 2)
  paint(cream, x + 9, y + h - 10, 106, 2)
  for (let left = x + 17; left < x + 110; left += 22) {
    paint(edge, left, y + h / 2 - 5, 10, 2)
    paint(edge, left + 3, y + h / 2 - 8, 4, 8)
  }
  if (room === 'workshop') {
    for (const x of [26, width - 45]) {
      paint(ink, x, 12, 19, 15)
      paint(cream, x + 2, 14, 15, 11)
      paint(rose, x + 6, 17, 7, 5)
      for (let offset = 4; offset <= 12; offset += 4) paint(rose, x + offset, 15, 2, 2)
    }
  }
}

const trayColours = {
  'sock-tray': lilac, 'crayon-tin': teal, 'shape-board': amber, 'wash-kit': teal, 'block-tray': rose,
  'build-board': lilac, 'snack-tray': oak, 'day-board': amber, 'leaf-path': 0x66895c, 'seed-tray': oak,
  'cardboard-crate': oak, 'felt-basket': rose, 'fabric-drawers': lilac, 'route-basket': oak,
  'block-bin': teal, 'board-bundle': oak, 'tube-rack': lilac, 'size-crates': amber, 'label-rack': teal,
} as const

type PreparationProp = keyof typeof trayColours

function pieces(paint: Paint, art: PreparationProp, w: number, h: number, ready: boolean) {
  const colour = trayColours[art]
  const shelf = ['fabric-drawers', 'cardboard-crate', 'label-rack', 'tube-rack'].includes(art)
  paint(shelf ? ink : colour, 0, 0, w, h - 3)
  paint(shelf ? colour : cream, 2, 2, w - 4, h - 7)
  paint(colour, 1, h - 5, w - 2, 5)
  if (art === 'leaf-path') {
    for (let i = 0; i < 5; i++) {
      paint(0x426e4f, 2 + i * 6, 2 + (i % 2) * 6, 7, 7)
      paint(ready ? 0xeed09c : 0x829a62, 3 + i * 6, 6 + (i % 2) * 4, 5, 4)
    }
    return
  }
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(w * (i * 2 + 1) / 6)
    const y = ready ? 6 : 4 + (i % 2) * 5
    const detail = [teal, rose, amber][i]
    if (art === 'crayon-tin' || art === 'board-bundle' || art === 'tube-rack') {
      const tall = art === 'crayon-tin' ? 8 : h - 15 - i * 2
      paint(detail, x - 3, y + i, 6, tall)
      paint(ink, x - 3, y + i, 6, 2)
      paint(cream, x - 2, y + i + 3, 4, 1)
    } else if (art === 'snack-tray' || art === 'felt-basket') {
      paint(detail, x - 4, y + 3, 8, 5)
      paint(detail, x - 3, y + 2, 6, 7)
      paint(art === 'snack-tray' ? 0x6c7f4f : cream, x, y, 2, 2)
    } else if (art === 'sock-tray') {
      paint(detail, x, y - 1, 4, 6)
      paint(detail, x - 3, y + 3, 6, 3)
      paint(cream, x + 1, y, 2, 1)
      if (ready) paint(detail, x - 3, y - 1, 2, 3)
    } else {
      const size = art === 'size-crates' ? 6 + 3 * (ready ? i : (i + 1) % 3) : Math.min(12, Math.floor(w / 4))
      paint(detail, x - Math.floor(size / 2), y + 1, size, Math.min(size, h - y - 5))
      paint(cream, x - 2, y + 3, i === 2 ? 5 : 4, 2)
      if (ready) {
        paint(ink, x - 2, h - 5, 4, 1)
        if (art === 'build-board' || art === 'block-tray') paint(teal, x - 2, y - 3, 5, 3)
      }
    }
  }
  if (ready) paint(cream, w - 7, h - 4, 5, 2)
  if (shelf) paint(ink, 0, h - 7, w, 2)
}

export function isWorkshopProp(art: FurnitureArt): art is WorkshopProp {
  return workshopProps.some((prop) => prop === art)
}

export function paintWorkshopFurniture(paint: Paint, art: WorkshopProp | 'workbench' | 'basement-stair', box: Box, ready: boolean) {
  const { x, y, width: w, height: h } = box
  const rect: Paint = (colour, left, top, width, height) => paint(colour, x + left, y + top, width, height)
  if (art === 'basement-stair') {
    rect(ink, 0, 0, w, h)
    rect(ready ? oak : 0xab7b6f, 3, 2, w - 6, h - 3)
    for (let i = 0; i < 4; i++) {
      rect(ready ? 0xcd8f63 - i * 0x110702 : 0xac8e83, 7 + i * 2, 2 + i * 4, w - 14 - i * 4, 3)
    }
    rect(cream, 3, 3, 3, h - 5)
    rect(cream, w - 6, 3, 3, h - 5)
    if (!ready) {
      rect(ink, 6, 7, w - 12, 5)
      for (let i = 10; i < w - 9; i += 8) rect(amber, i, 8, 4, 3)
    }
    return
  }

  if (art === 'workbench') {
    rect(ink, 3, 5, w - 6, h - 5)
    rect(oak, 0, 0, w, 24)
    rect(cream, 2, 2, w - 4, 2)
    rect(0xa76d56, 7, 25, w - 14, 9)
    rect(cream, w / 2 - 5, 27, 10, 2)
    rect(teal, 9, 8, 15, 10)
    rect(cream, 11, 10, 11, 5)
    rect(lilac, w - 19, 8, 12, 11)
    return
  }

  if (Object.prototype.hasOwnProperty.call(trayColours, art)) {
    pieces(rect, art as PreparationProp, w, h, ready)
    return
  }
  // The same footprints remain solid before and after building.
  rect(ready ? 0xcfa381 : 0xd7ae91, 2, h - 7, w - 4, 7)
  if (!ready) {
    rect(0xb78e83, 5, 3, w - 10, h - 10)
    rect(0xf2cfad, 7, 5, w - 14, h - 14)
    rect(0xd5a47d, w / 2 - 7, h / 2 - 6, 14, 9)
    rect(cream, w / 2 - 2, h / 2 - 6, 4, 5)
    return
  }
  switch (art) {
    case 'cardboard-hideout':
      rect(ink, 6, 9, w - 12, h - 13)
      rect(oak, 9, 7, w - 18, h - 13)
      rect(amber, 3, 4, w - 6, 9)
      rect(cream, 7, 5, w - 14, 2)
      rect(ink, 20, 22, w - 40, h - 26)
      rect(ink, 24, 18, w - 48, 5)
      rect(cream, 13, 15, 6, 5)
      break
    case 'felt-ball':
      rect(rose, w / 2 - 13, 12, 26, 16)
      rect(rose, w / 2 - 9, 8, 18, 24)
      rect(cream, w / 2 - 10, 16, 20, 3)
      rect(lilac, w / 2 - 4, 19, 8, 9)
      break
    case 'resting-mat':
      rect(ink, 4, 8, w - 8, h - 13)
      rect(teal, 7, 10, w - 14, h - 17)
      for (let left = 10; left < w - 10; left += 9) {
        rect(cream, left, 12, 3, h - 21)
        rect(cream, left, h - 7, 2, 3)
      }
      break
    case 'cat-ramp':
      for (let step = 0; step < 4; step++) {
        rect(ink, 5 + step * 14, 21 - step * 5, 14, 10 + step * 5)
        rect(step % 2 ? teal : amber, 6 + step * 14, 21 - step * 5, 12, 5)
      }
      break
    case 'scratch-board':
      rect(ink, 5, 3, w - 10, h - 9)
      rect(oak, 7, 5, w - 14, h - 13)
      for (let left = 10; left < w - 11; left += 4) rect(cream, left, 7, 1, h - 17)
      rect(teal, 5, h - 12, w - 10, 5)
      break
    case 'play-tunnel':
      rect(lilac, 8, 8, w - 19, h - 14)
      rect(lilac, 12, 3, w - 27, 8)
      for (const left of [22, 35, 48]) rect(rose, left, 7, 4, h - 13)
      rect(cream, 8, 11, 16, h - 18)
      rect(ink, 10, 14, 11, h - 24)
      rect(amber, 51, 10, 7, h - 18)
      break
  }
}

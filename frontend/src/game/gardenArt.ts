import type { FurnitureArt } from '../core/tiledMap'
import type { Box } from '../core/room'
import type { Paint } from './avatarArt'

function tree(paint: Paint, x: number, y: number) {
  paint(0x795e51, x - 3, y + 9, 6, 11)
  paint(0x4e765c, x - 12, y + 1, 24, 13)
  paint(0x568363, x - 8, y - 3, 16, 18)
  paint(0x73965e, x - 7, y, 12, 8)
  paint(0xacc079, x - 5, y + 2, 5, 2)
}

export function paintGarden(paint: Paint) {
  paint(0x435749, 0, 0, 320, 240)
  paint(0xa6b77f, 12, 28, 296, 200)
  for (let row = 0; row < 12; row++) {
    const y = 32 + row * 16
    paint(row % 2 ? 0xa6b77f : 0xa1b37b, 16, y, 288, 16)
    for (let x = 23 + (row % 3) * 8; x < 296; x += 24) {
      paint(0x869d6e, x, y + 5, 5, 1)
      paint(0x8da571, x + 1, y + 3, 1, 3)
    }
  }
  paint(0x96a575, 18, 100, 284, 44)
  paint(0xe0c59b, 18, 104, 284, 36)
  paint(0x96a575, 144, 139, 32, 86)
  paint(0xe0c59b, 148, 136, 24, 89)
  for (let x = 24; x < 295; x += 18) {
    paint(0xc9ac85, x, 109 + x % 22, 4, 2)
    paint(0xf3d9aa, x + 5, 132 - x % 13, 3, 1)
  }
  for (const y of [81, 160]) {
    for (const x of [50, 120, 200, 270]) {
      paint(0xbec590, x - 20, y - 3, 40, 7)
      paint(0xd7d4a1, x - 18, y - 1, 36, 3)
    }
  }

  for (const y of [20, 223]) {
    paint(0x845f56, 8, y, 304, 7)
    paint(0xd2a87e, 10, y + 1, 300, 2)
    for (let x = 12; x < 310; x += 18) {
      paint(0x906a60, x, y - 4, 4, 14)
      paint(0xe1b68d, x, y - 4, 4, 2)
    }
  }
  paint(0x8b6759, 8, 26, 5, 201)
  paint(0x8b6759, 307, 26, 5, 201)
  for (const x of [36, 98, 156, 226, 285]) tree(paint, x, 8)
  for (const [x, y] of [[22, 73], [17, 161], [302, 93], [302, 148]]) {
    paint(0x628766, x - 3, y, 6, 5)
    paint(0xb88091, x - 1, y - 2, 3, 3)
  }
}

export type GardenFurniture = Extract<FurnitureArt, `garden-${string}` | 'gate'>

export function paintGardenFurniture(paint: Paint, art: GardenFurniture, box: Box, ready: boolean) {
  const rect: Paint = (color, x, y, w, h) => {
    const left = Math.round(x * box.width / 32)
    const top = Math.round(y * box.height / 24)
    paint(color, box.x + left, box.y + top, Math.round((x + w) * box.width / 32) - left,
      Math.round((y + h) * box.height / 24) - top)
  }
  const ink = 0x6e5555
  const wood = 0xb58466
  const gold = 0xe3bb83
  const blue = 0x7db9be
  const rose = 0xc48591
  const green = 0x7b9e77
  if (art === 'gate') {
    rect(ink, 1, 1, 4, 23)
    rect(ink, 27, 1, 4, 23)
    rect(gold, 1, 1, 4, 3)
    rect(gold, 27, 1, 4, 3)
    if (ready) {
      rect(wood, 4, 7, 5, 16)
      rect(wood, 23, 7, 5, 16)
    } else {
      rect(wood, 4, 7, 24, 14)
      for (let x = 7; x <= 24; x += 5) rect(gold, x, 5, 2, 17)
      rect(0xf2d487, 14, 11, 5, 6)
      rect(ink, 16, 13, 1, 2)
    }
    return
  }
  rect(0x748267, 1, 19, 30, 4)
  if (!ready) {
    rect(0x9d856d, 2, 15, 28, 6)
    rect(0xb29777, 3, 14, 26, 3)
    rect(0x846a61, 7, 16, 4, 2)
    rect(0x846a61, 21, 18, 5, 2)
  }

  switch (art) {
    case 'garden-bowl':
      rect(ink, 5, 10, 22, 8)
      rect(ready ? blue : 0x978884, 4, 9, 24, 5)
      rect(0x597f8b, 7, 14, 18, 4)
      if (ready) rect(0xc9e6df, 8, 10, 7, 1)
      break
    case 'garden-bed':
      rect(wood, 3, 7, 3, 13)
      rect(wood, 26, 7, 3, 13)
      rect(ink, 4, 16, 24, 5)
      if (ready) {
        rect(0xb88573, 1, 4, 30, 5)
        rect(gold, 3, 4, 26, 1)
        rect(green, 6, 14, 20, 5)
        rect(0xf3dbac, 18, 14, 7, 3)
      }
      break
    case 'garden-post':
      rect(wood, 6, 16, 20, 5)
      rect(ink, 13, ready ? 4 : 10, 6, ready ? 13 : 7)
      if (ready) {
        for (let y = 6; y < 17; y += 2) rect(gold, 13, y, 6, 1)
        rect(green, 10, 2, 12, 4)
      }
      break
    case 'garden-tunnel':
      rect(ready ? 0x618583 : 0x927884, 3, ready ? 9 : 14, 26, ready ? 12 : 6)
      if (ready) {
        for (let x = 7; x < 25; x += 5) rect(blue, x, 8, 2, 12)
        rect(ink, 23, 11, 6, 10)
        rect(0xacceb5, 23, 9, 7, 2)
      }
      break
    case 'garden-toys':
      rect(wood, 3, 13, 26, 8)
      rect(ink, 4, 13, 24, 2)
      if (ready) {
        rect(rose, 6, 7, 8, 7)
        rect(0xedd3a2, 8, 8, 3, 2)
        rect(blue, 19, 5, 8, 9)
        rect(0xcde2bd, 21, 6, 3, 2)
      }
      break
    case 'garden-platform':
      rect(wood, 14, 5, 5, 16)
      rect(green, 7, 2, 18, 8)
      rect(0x9eb67c, 10, 1, 11, 6)
      if (ready) {
        rect(ink, 6, 11, 22, 4)
        rect(gold, 6, 10, 22, 3)
        rect(wood, 22, 13, 3, 8)
      }
      break
    case 'garden-shelter':
      rect(wood, 5, 10, 22, 12)
      if (ready) {
        rect(rose, 7, 6, 18, 5)
        rect(rose, 11, 3, 10, 4)
        rect(ink, 3, 9, 26, 2)
        rect(ink, 13, 14, 8, 8)
        rect(gold, 15, 18, 5, 2)
      }
      break
    case 'garden-flowers':
      rect(wood, 2, 12, 28, 9)
      rect(0x775e60, 4, 13, 24, 6)
      if (ready) {
        for (const [x, y, color] of [[6, 7, rose], [13, 9, gold], [20, 6, 0xb797b8], [25, 9, 0xe4a178]]) {
          rect(green, x + 1, y + 2, 2, 15 - y)
          rect(color, x - 1, y, 6, 3)
          rect(0xf4d293, x + 1, y - 1, 2, 4)
        }
      }
      break
  }
}

import type { FurnitureArt } from '../core/tiledMap'
import type { LocationId } from '../content/pack'
import type { Box } from '../core/room'
import type { Paint } from './avatarArt'
import { paintGarden, paintGardenFurniture } from './gardenArt'
import { paintHouseRoom, paintHouseFurniture } from './houseArt'

import { isWorkshopProp, paintBasementRoom, paintWorkshopFurniture } from './workshopArt'

export function paintRoom(paint: Paint, theme: LocationId, width: number, height: number) {
  if (theme === 'basement' || theme === 'storage' || theme === 'workshop') {
    paintBasementRoom(paint, theme, width, height)
    return
  }
  if (theme === 'garden') {
    paintGarden(paint)
    return
  }
  if (theme !== 'bedroom' && theme !== 'landing') {
    paintHouseRoom(paint, theme)
    return
  }
  paint(0x4d3947, 0, 0, 320, 240)
  paint(0x8a6270, 8, 7, 304, 219)
  paint(0xb2908f, 16, 8, 288, 24)
  paint(0xe4b282, 16, 32, 288, 192)
  for (let row = 0; row < 12; row++) {
    const y = 32 + row * 16
    paint(row % 2 ? 0xd8a878 : 0xe7b78a, 16, y, 288, 15)
    for (let x = 32 + (row % 2) * 21; x < 291; x += 43) {
      paint(0xc9926a, x, y, 1, 15)
      paint(0xedc198, x + 3, y + 4, 12, 1)
    }
  }
  paint(0xbd8863, 16, 32, 288, 3)
  paint(0x674954, 8, 224, 304, 7)
  paint(0xaf827e, 16, 228, 288, 2)

  if (theme === 'landing') {
    // A framed window and a woven runner mark the small landing.
    paint(0x687b75, 72, 11, 38, 19)
    paint(0xf4e2c5, 74, 11, 34, 16)
    paint(0x9ebec2, 77, 12, 28, 12)
    paint(0xf4e2c5, 89, 12, 3, 12)
    paint(0x69867c, 125, 118, 70, 74)
    paint(0x91aa94, 129, 122, 62, 66)
    paint(0xe8d6a4, 133, 127, 54, 2)
    paint(0xe8d6a4, 133, 181, 54, 2)
    for (const y of [141, 153, 165]) {
      paint(0xbdd0ad, 155, y + 2, 10, 4)
      paint(0xbdd0ad, 158, y, 4, 8)
    }
    return
  }

  // Window frame, glass, and sill.
  paint(0x674954, 37, 8, 51, 22)
  paint(0xf4e2c5, 39, 8, 47, 20)
  paint(0x91b7bf, 42, 9, 41, 15)
  paint(0xc4dde0, 44, 11, 10, 2)
  paint(0xc4dde0, 66, 17, 11, 2)
  paint(0xf4e2c5, 61, 9, 3, 16)
  paint(0xdfbaa0, 36, 26, 53, 4)
  paint(0x996e7e, 29, 8, 8, 24)
  paint(0x996e7e, 88, 8, 8, 24)

  // Rug with a woven border.
  paint(0x9a5f60, 62, 163, 80, 42)
  paint(0xc48278, 66, 166, 72, 36)
  paint(0xd69b8a, 69, 170, 66, 2)
  paint(0xd69b8a, 69, 196, 66, 2)
  for (let x = 74; x < 135; x += 14) {
    paint(0xe8b59a, x, 182, 6, 6)
    paint(0xe8b59a, x + 2, 180, 2, 10)
  }
  for (const x of [59, 142]) {
    for (let y = 166; y < 205; y += 5) paint(0xe8b59a, x, y, 3, 2)
  }

  // Small floor cushion and plant, outside the walking obstacles.
  paint(0xc8956f, 251, 181, 33, 19)
  paint(0x9a7b92, 253, 180, 30, 16)
  paint(0xb995af, 256, 181, 24, 11)
  paint(0xd3b6c8, 262, 184, 13, 2)
  paint(0x966c57, 275, 101, 13, 9)
  paint(0xcc8e6e, 274, 98, 15, 4)
  paint(0x4f7558, 279, 88, 3, 12)
  paint(0x688b64, 273, 90, 7, 4)
  paint(0x71956c, 282, 86, 6, 6)
}

export function paintFurniture(paint: Paint, art: FurnitureArt, box: Box, ready: boolean) {
  if (art === 'basement-stair' || art === 'workbench' || isWorkshopProp(art)) {
    paintWorkshopFurniture(paint, art, box, ready)
    return
  }
  const { x, y, width: w, height: h } = box
  const rect: Paint = (color, left, top, width, height) =>
    paint(color, x + left, y + top, width, height)

  switch (art) {
    case 'bed':
      rect(0x674954, 0, 0, w, h)
      rect(0x956e5c, 3, 2, w - 6, h - 5)
      rect(0xeed8ba, 4, 8, w - 8, h - 14)
      rect(0xffeed6, 8, 10, w - 16, 13)
      rect(0xc0aaa3, 9, 21, w - 18, 3)
      rect(0x739397, 4, 26, w - 8, h - 33)
      rect(0x9ab3ad, 4, 27, w - 8, 6)
      rect(0x597a83, 4, h - 11, w - 8, 4)
      for (let left = 10; left < w - 9; left += 9) {
        rect(0xb1c5b7, left, 41, 3, 3)
        rect(0xb1c5b7, left + 2, 49, 3, 3)
      }
      break
    case 'desk':
      rect(0xc18e6b, 3, h - 7, w - 3, 7)
      rect(0x664753, 1, 3, w - 2, h - 4)
      rect(0x9b665b, 4, 27, w - 8, h - 29)
      rect(0xd8a47e, 0, 0, w, 27)
      rect(0xecbb90, 2, 2, w - 4, 3)
      rect(0xb78b70, 6, 7, 20, 15)
      rect(0x789088, 5, 6, 20, 13)
      rect(0xf3dfb7, 8, 8, 14, 9)
      rect(0xcbb2a2, 14, 8, 1, 9)
      rect(0x7c5164, w - 16, 13, 8, 7)
      rect(0xeab960, w - 15, 8, 2, 6)
      rect(0x6c8d91, w - 11, 6, 2, 8)
      rect(0xe6b07e, w - 19, 31, 8, 2)
      if (ready) {
        rect(0x79698a, 27, 8, 15, 12)
        rect(0xffeed6, 28, 9, 13, 9)
        rect(0xb89085, 34, 9, 1, 9)
      }
      break
    case 'wardrobe':
      rect(0x6a4652, 0, 0, w, h)
      rect(0xb17c69, 3, 3, w - 6, h - 11)
      rect(0xce9879, 6, 7, w / 2 - 8, h - 20)
      rect(0xce9879, w / 2 + 2, 7, w / 2 - 8, h - 20)
      rect(0xf3cc89, w / 2 - 6, h / 2, 3, 3)
      rect(0xf3cc89, w / 2 + 3, h / 2, 3, 3)
      rect(0x885a55, 2, h - 9, w - 4, 5)
      break
    case 'door':
      rect(0x634652, 0, 0, w, h)
      if (ready) {
        rect(0x493d4e, 4, 2, w - 8, h - 2)
        rect(0xc79a75, 5, h - 5, w - 10, 5)
        rect(0x926057, 4, 3, 7, h - 6)
        rect(0xe5ba7c, 7, h - 11, 2, 2)
        break
      }
      rect(0xa66c61, 3, 2, w - 6, h - 2)
      rect(0xc48970, 6, 4, w - 12, h - 8)
      rect(0xf0cc86, w - 10, h - 10, 3, 3)
      rect(0x78505b, 0, h - 2, w, 2)
      break
    case 'clothes':
      rect(0xc98d71, 1, h - 4, w - 2, 4)
      rect(0xa5657c, 5, 2, 11, 12)
      rect(0xa5657c, 2, 4, 17, 5)
      rect(0xe4a5a2, 7, 2, 7, 3)
      rect(0x72899a, w - 9, 8, 8, 8)
      rect(0x91a9ac, w - 9, 8, 8, 2)
      rect(0x72899a, w - 10, 14, 4, 4)
      rect(0x72899a, w - 4, 14, 4, 4)
      break
    case 'bowl':
      rect(0x986a57, 1, 8, w - 2, 4)
      rect(0x6b7e8c, 0, 3, w, 5)
      rect(0x88a1aa, 2, 5, w - 4, 5)
      rect(0x6b7e8c, 3, 9, w - 6, 2)
      rect(ready ? 0x87c8d1 : 0x695d61, 3, 3, w - 6, 4)
      if (ready) rect(0xc9e5de, 6, 4, 7, 1)
      else rect(0xc4afa0, 6, 5, 4, 1)
      break
    case 'cat-bed':
      rect(0xa5785d, 0, 4, w, h - 4)
      rect(0xd49b72, 2, 0, w - 4, h - 3)
      rect(ready ? 0x7a9584 : 0x9b7b6c, 5, 4, w - 10, h - 10)
      rect(ready ? 0xc3cba3 : 0xb09378, 6, 5, w - 12, 4)
      rect(0xa5785d, 1, h - 6, w - 2, 5)
      if (ready) {
        rect(0xe8d0a6, w - 15, 8, 9, 5)
        rect(0x9db39a, 8, 12, 13, 3)
        rect(0x9db39a, 10, 16, 11, 2)
      }
      break
    case 'gate':
    case 'garden-bowl':
    case 'garden-bed':
    case 'garden-post':
    case 'garden-tunnel':
    case 'garden-toys':
    case 'garden-platform':
    case 'garden-shelter':
    case 'garden-flowers':
      paintGardenFurniture(paint, art, box, ready)
      break
    default:
      paintHouseFurniture(paint, art, box, ready)
  }
}

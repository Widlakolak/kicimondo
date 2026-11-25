import type { FurnitureId } from '../core/bedroom'
import type { Box } from '../core/room'
import type { Paint } from './avatarArt'

export function paintRoom(paint: Paint) {
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

export function paintFurniture(paint: Paint, id: FurnitureId, box: Box) {
  const { x, y, width: w, height: h } = box
  const rect: Paint = (color, left, top, width, height) =>
    paint(color, x + left, y + top, width, height)

  switch (id) {
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
    case 'closed-door':
      rect(0x634652, 0, 0, w, h)
      rect(0xa66c61, 3, 2, w - 6, h - 2)
      rect(0xc48970, 6, 4, w - 12, h - 8)
      rect(0xf0cc86, w - 10, h - 10, 3, 3)
      rect(0x78505b, 0, h - 2, w, 2)
      break
    case 'scattered-clothes':
      rect(0xc98d71, 1, h - 4, w - 2, 4)
      rect(0xa5657c, 5, 2, 11, 12)
      rect(0xa5657c, 2, 4, 17, 5)
      rect(0xe4a5a2, 7, 2, 7, 3)
      rect(0x72899a, w - 9, 8, 8, 8)
      rect(0x91a9ac, w - 9, 8, 8, 2)
      rect(0x72899a, w - 10, 14, 4, 4)
      rect(0x72899a, w - 4, 14, 4, 4)
      break
  }
}

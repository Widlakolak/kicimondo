import type { Box } from '../core/room'
import type { FurnitureArt } from '../core/tiledMap'
import type { Paint } from './avatarArt'

const palettes = {
  study:    { wall: 0xaa9189, floor: 0xe1b489, line: 0xc99472, rug: 0x7b9587 },
  bathroom: { wall: 0x92afab, floor: 0xb6cec1, line: 0x92b3af, rug: 0x619598 },
  playroom: { wall: 0xb598ae, floor: 0xe9bf9b, line: 0xcfa582, rug: 0xb584a0 },
  hall:     { wall: 0xc4ab91, floor: 0xd5bc9c, line: 0xba9b7c, rug: 0x8f737d },
  kitchen:  { wall: 0xb7b896, floor: 0xe9d4a9, line: 0xcaac8a, rug: 0xad8270 },
  living:   { wall: 0xad8c8d, floor: 0xd7a780, line: 0xbc866e, rug: 0x73978b },
}

export function paintHouseRoom(paint: Paint, location: keyof typeof palettes) {
  const { wall, floor, line, rug } = palettes[location]
  const tile = location === 'bathroom' || location === 'kitchen' || location === 'hall'
  paint(0x4d3947, 0, 0, 320, 240)
  paint(0x735465, 8, 7, 304, 221)
  paint(wall, 16, 8, 288, 24)
  paint(floor, 16, 32, 288, 192)
  for (let y = 32; y < 224; y += 16) {
    paint(line, 16, y, 288, 1)
    for (let x = tile ? 32 : 32 + (y % 32); x < 304; x += tile ? 16 : 48) {
      paint(line, x, y, 1, 16)
    }
  }
  paint(0x674954, 16, 30, 288, 3)
  paint(0xa8847e, 16, 226, 288, 3)

  const windowX = location === 'hall' ? 142 : 108
  paint(0x674954, windowX, 8, 32, 21)
  paint(0xf7e2c3, windowX + 2, 9, 28, 17)
  paint(0x8fb3bc, windowX + 4, 10, 24, 12)
  paint(0xd6e7d3, windowX + 7, 12, 9, 2)
  paint(0xf7e2c3, windowX + 15, 10, 2, 13)

  const x = location === 'hall' ? 125 : location === 'living' ? 111 : 117
  const width = location === 'hall' ? 70 : location === 'living' ? 98 : 86
  const y = location === 'hall' ? 125 : 112
  paint(0x715963, x - 2, y - 2, width + 4, 52)
  paint(rug, x, y, width, 48)
  paint(0xe4cfa5, x + 4, y + 4, width - 8, 2)
  paint(0xe4cfa5, x + 4, y + 42, width - 8, 2)
  for (let i = 10; i < width - 8; i += 12) {
    paint(0xd6c4a5, x + i, y + 23, 6, 2)
    paint(0xd6c4a5, x + i + 2, y + 21, 2, 6)
  }
}

type HouseFurniture = Exclude<FurnitureArt, 'bed' | 'desk' | 'wardrobe' | 'door' | 'clothes' | 'bowl' | 'cat-bed'>

export function paintHouseFurniture(paint: Paint, art: HouseFurniture, box: Box, ready: boolean) {
  const { x, y, width, height } = box
  const rect: Paint = (color, left, top, w, h) => {
    const startX = Math.round(left * width / 32)
    const startY = Math.round(top * height / 24)
    paint(color, x + startX, y + startY, Math.round((left + w) * width / 32) - startX,
      Math.round((top + h) * height / 24) - startY)
  }
  const shadow = 0x624955
  const wood = 0xb07865
  const light = 0xe9b886
  const paper = 0xf5e6c5
  const blue = 0x78a6a7
  const leaf = 0x67917a
  const rose = 0xbe7784
  const trim = (top: number, fill = wood) => {
    rect(shadow, 0, top, 32, 24 - top)
    rect(fill, 2, top + 1, 28, 21 - top)
    rect(light, 2, top + 1, 28, 2)
  }
  const cubby = (color: number, left: number, top: number) => {
    rect(color, left, top, 6, 6)
    rect(paper, left + 2, top + 2, 3, 1)
  }

  switch (art) {
    case 'stairs':
      rect(shadow, 0, 0, 32, 24)
      for (let y = 1; y < 23; y += 4) {
        rect(ready ? wood : 0x876e79, 3, y, 26, 3)
        rect(ready ? light : 0xad9299, 3, y, 26, 1)
      }
      rect(0x885c60, 0, 0, 3, 24)
      rect(0x885c60, 29, 0, 3, 24)
      if (!ready) {
        rect(0x7e5866, 3, 12, 26, 5)
        rect(0xf0cc86, 13, 11, 6, 7)
        rect(shadow, 15, 13, 2, 3)
      }
      break
    case 'guide':
      rect(0x926851, 8, 2, 16, 12)
      rect(0xddab81, 10, 5, 12, 8)
      rect(shadow, 11, 8, 2, 2)
      rect(shadow, 19, 8, 2, 2)
      rect(rose, 7, 13, 18, 8)
      rect(paper, 13, 14, 7, 6)
      rect(shadow, 8, 21, 6, 2)
      rect(shadow, 18, 21, 6, 2)
      break
    case 'plant':
      rect(wood, 8, 15, 16, 9)
      rect(light, 7, 15, 18, 2)
      rect(0x486e62, 14, 2, 4, 14)
      rect(leaf, 5, 5, 10, 6)
      rect(0x82a47a, 18, 2, 9, 7)
      rect(leaf, 18, 10, 6, 4)
      break
    case 'bench':
      rect(shadow, 3, 12, 4, 12)
      rect(shadow, 25, 12, 4, 12)
      rect(wood, 0, 2, 32, 16)
      rect(light, 2, 4, 28, 4)
      rect(rose, 3, 10, 26, 4)
      break
    case 'sofa':
      rect(shadow, 0, 1, 32, 22)
      rect(0x737a87, 2, 2, 28, 18)
      rect(0xa193a8, 4, 4, 24, 4)
      rect(0xa8a09c, 5, 10, 10, 8)
      rect(0xbab4a0, 17, 10, 10, 8)
      rect(rose, 5, 6, 7, 5)
      rect(leaf, 22, 6, 5, 5)
      break
    case 'tub':
      trim(1, blue)
      rect(paper, 3, 4, 26, 14)
      rect(0xadcbca, 5, 5, 22, 10)
      rect(0x5f8190, 24, 2, 4, 2)
      break
    case 'basket':
      trim(5)
      rect(0x8f685f, 4, 2, 24, 5)
      for (let y = 10; y < 22; y += 4) rect(light, 3, y, 26, 1)
      break
    case 'counter':
      trim(0, 0xa88c79)
      rect(paper, 3, 2, 26, 10)
      rect(shadow, 5, 4, 9, 7)
      rect(blue, 19, 4, 8, 6)
      rect(paper, 7, 16, 5, 2)
      rect(paper, 21, 16, 5, 2)
      break
    case 'satchel':
      trim(5)
      rect(0x684e69, 9, 2, 15, 18)
      rect(rose, 10, 4, 13, ready ? 8 : 14)
      rect(paper, 14, 10, 4, 3)
      if (!ready) {
        rect(blue, 4, 9, 4, 8)
        rect(leaf, 25, 5, 4, 7)
      }
      break
    case 'supplies':
      trim(5)
      for (let i = 0; i < 4; i++) {
        rect(i % 2 ? rose : blue, ready ? 5 + i * 6 : 4 + i * 7, ready ? 8 : 5 + (i % 3) * 3, 3, 9)
      }
      break
    case 'books':
      trim(0)
      rect(shadow, 4, 3, 24, 14)
      for (let i = 0; i < 4; i++) {
        const height = ready ? 6 + i * 2 : [9, 12, 6, 10][i]
        rect([rose, blue, leaf, 0xe1af67][i], 5 + i * 6, 16 - height, 4, height)
      }
      break
    case 'sink':
      trim(2, blue)
      rect(paper, 4, 3, 24, 11)
      rect(0xbaccca, 8, 5, 16, 6)
      rect(0x668797, 14, 1, 4, 5)
      if (ready) { rect(rose, 25, 5, 4, 6); rect(paper, 23, 16, 5, 5) }
      break
    case 'bath-shelf':
    case 'toy-box':
    case 'household-shelf': {
      trim(0, art === 'toy-box' ? 0xa4768b : wood)
      rect(shadow, 3, 4, 26, 15)
      if (ready) rect(light, 15, 5, 2, 14)
      cubby(rose, ready ? 6 : 5, ready ? 7 : 5)
      cubby(leaf, ready ? 20 : 19, ready ? 7 : 11)
      if (!ready) cubby(blue, 11, 12)
      if (ready) { rect(paper, 7, 15, 4, 1); rect(paper, 21, 15, 4, 1) }
      break
    }
    case 'fruit':
      trim(4)
      rect(0x987c81, 6, 12, 20, 7)
      rect(paper, 5, 11, 22, 2)
      for (let i = 0; i < 4; i++) {
        rect(i % 2 ? 0xb55d5f : 0xcc785b, ready ? 7 + i * 5 : 3 + i * 7, ready ? 7 + i % 2 : 6 + i % 3 * 3, 4, 5)
      }
      break
    case 'table':
      trim(3)
      for (const x of [5, 20]) {
        rect(ready ? blue : 0xc39173, x, 6, 8, 11)
        if (ready) { rect(paper, x + 1, 8, 6, 6); rect(paper, x + 8, 7, 1, 9) }
      }
      break
  }
}

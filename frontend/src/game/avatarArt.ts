import type { Avatar } from '../core/profile'
import type { Direction } from '../core/room'

export type Paint = (color: number, x: number, y: number, width: number, height: number) => void

export function paintAvatar(paint: Paint, avatar: Avatar, facing: Direction, step: number) {
  const hair = avatar === 'boy' ? 0x604035 : 0x773d34
  const shirt = avatar === 'boy' ? 0x528779 : 0x9c597c
  const skin = 0xf7bd91
  const shoes = 0x384155
  const profile = facing === 'left' ? -2 : facing === 'right' ? 2 : 0
  paint(shoes, 4, 17 + step, 3, 5)
  paint(shoes, 9, 17 - step, 3, 5)
  paint(shirt, 3, 11, 10, 7)
  paint(0xf2dab4, 6, 13, 4, 3)
  paint(skin, 2, 13, 2, 4)
  paint(skin, 12, 13, 2, 4)
  paint(hair, 3, 2, 10, avatar === 'girl' ? 11 : 8)
  paint(hair, 5, 1, 6, 2)
  if (facing !== 'up') {
    paint(skin, 4, 5, 8, 6)
    paint(hair, 4, 4, 5, 2)
    paint(shoes, 6 + profile, 7, 1, 1)
    paint(shoes, 9 + profile, 7, 1, 1)
    paint(0xd77b70, 7 + profile, 9, 2, 1)
  }
  if (avatar === 'girl') paint(0xe8b65c, 11, 4, 2, 2)
}

import { canPet, type CatState } from '../core/cat'
import type { Paint } from './avatarArt'

export function paintCat(paint: Paint, cat: CatState) {
  const { activity, elapsed, facing } = cat
  const stripe = 0xa75c39
  const coat = 0xd78a4f
  const cream = 0xf3c993
  const ink = 0x4a333c
  const blush = 0xb96972
  const beat = Math.floor(elapsed / (activity === 'walking' ? 125 : 260)) % 2
  const lying = activity === 'resting' || activity === 'petting'
  const head = activity === 'drinking' ? -7 + beat : lying ? -9 : -13
  const rect: Paint = (color, x, y, width, height) =>
    paint(color, facing === 1 ? x : -x - width, y, width, height)

  rect(0xba886b, -12, 0, 23, 2)
  rect(stripe, -14, -8 + beat, 7, 3)
  rect(coat, -15, -10 + beat, 4, 3)
  rect(stripe, -9, -8, 15, 8)
  rect(coat, -8, lying ? -6 - beat : -9, 13, 7)
  rect(stripe, -5, -9 + Number(lying), 2, 4)
  rect(stripe, -1, -9 + Number(lying), 2, 3)
  if (activity === 'walking') {
    rect(cream, -8 + beat * 3, -2, 4, 3)
    rect(cream, 3 - beat * 3, -2, 4, 3)
  } else {
    rect(cream, -7, -2, 5, 2)
    rect(cream, 3, -2, 6, 2)
  }
  rect(stripe, 1, head, 10, 8)
  rect(coat, 2, head + 1, 9, 7)
  rect(stripe, 2, head - 3, 3, 4)
  rect(stripe, 8, head - 3 + Number(canPet(cat) && beat === 1), 3, 4)
  rect(cream, 7, head + 5, 6, 3)
  rect(ink, 8, head + 3, 2, lying || (canPet(cat) && elapsed % 2200 > 1950) ? 1 : 2)
  rect(blush, 12, head + 5, 2, 1)

  if (activity === 'drinking') {
    rect(0x648eaa, 11 + beat, head + 8, 3, 2)
    rect(0xb1d5d9, 15 - beat, head + 10, 3, 1)
  } else if (canPet(cat) || activity === 'petting') {
    const height = activity === 'petting' ? -24 - beat * 3 : -23
    rect(0xbb626a, -4, height, 3, 3)
    rect(0xbb626a, 0, height, 3, 3)
    rect(0xbb626a, -4, height + 2, 7, 2)
    rect(0xbb626a, -3, height + 4, 5, 1)
    rect(0xbb626a, -1, height + 5, 2, 1)
    rect(0xf5ceb0, -3, height, 1, 1)
  }
}

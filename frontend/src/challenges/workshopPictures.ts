import type { workshopPictures } from '../content/workshopChallenges'

type PixelPath = readonly [string, string]
type Drawing = readonly PixelPath[]
type WorkshopPicture = (typeof workshopPictures)[number]

const plum = '#67536e'
const clay = '#aa7057'
const ivory = '#fff1cb'
const pink = '#b9606b'
const sky = '#588999'
const green = '#699176'
const gold = '#ddb24e'
const lavender = '#a48caf'

const stripe = 'M6 6h12v2H6zm0 5h12v2H6zm0 5h12v2H6z'
const dot = 'M7 7h3v3H7zm7 0h3v3h-3zm-7 7h3v3H7zm7 0h3v3h-3z'
const check = 'M5 5h5v5H5zm9 0h5v5h-5zm-4 5h4v4h-4zm-5 4h5v5H5zm9 0h5v5h-5z'
const round = 'M8 3h8v2h4v3h2v8h-2v3h-4v2H8v-2H4v-3H2V8h2V5h4z'
const square = 'M4 4h16v16H4z'
const triangle = 'M11 3h2v4h2v4h2v4h2v4h2v2H3v-2h2v-4h2v-4h2V7h2z'
const starMark = 'M11 3h2v5h6v2h-3v4h3v3h-3v-2h-3v5h-2v-5H8v2H5v-3h3v-4H5V8h6z'
const moonMark = 'M12 3h4v2h-5v3H9v7h3v2h7v-3h2v4h-2v2H8v-2H5v-4H3V9h2V6h3V4h4z'
const heartMark = 'M4 6h6v2h4V6h6v2h2v6h-3v3h-3v3h-3v2h-2v-2H8v-3H5v-3H2V8h2z'

function cloth(colour: string, pattern: string): Drawing {
  return [[colour, 'M4 4h16v15H4zm1 15h2v2H5zm6 0h2v2h-2zm6 0h2v2h-2z'], [ivory, pattern]]
}

function sock(colour: string, pattern: string): Drawing {
  return [[colour, 'M11 3h9v14h-2v4H5v-2H3v-5h8z'], [ivory, pattern]]
}

function block(colour: string, shape: string): Drawing {
  return [[colour, shape], [ivory, 'M10 10h4v2h-4z']]
}

function tray(fill: string, glyph: string): Drawing {
  return [[clay, 'M2 5h20v15H2z'], [fill, 'M3 7h18v8H3z'], [plum, glyph], [ivory, 'M9 17h6v1H9z']]
}

const cabinet = (mark: string): Drawing => [
  [plum, 'M2 3h20v18H2z'], [lavender, 'M4 5h16v14H4z'], [ivory, mark],
]

function tube(width: number, height: number): Drawing {
  const y = 12 - height / 2
  return [[clay, `M3 ${y}h${width}v${height}H3z`], [gold, `M4 ${y + 1}h${width - 3}v2H4z`],
    [plum, `M${width} ${y + 2}h2v${height - 4}h-2z`]]
}

function bin(left: number, top: number): Drawing {
  return [[plum, `M${left} ${top}h${24 - 2 * left}v2h-1v${20 - top}h-${22 - 2 * left}V${top + 2}h-1z`],
    [sky, `M${left + 2} ${top + 3}h${20 - 2 * left}v${17 - top}H${left + 2}z`],
    [ivory, `M10 ${top + 4}h4v2h-4z`]]
}

const footing: PixelPath = [clay, 'M3 16h18v5H3z']
const walls: PixelPath = [gold, 'M4 8h4v10H4zm12 0h4v10h-4z']
const stack: PixelPath = [sky, 'M7 11h10v5H7zm2-5h6v5H9z']
const steps = (top: number): Drawing => [[clay, `M4 ${top}h16v${21 - top}H4z`], [gold, `M4 ${top}h16v3H4z`]]

export const workshopIllustrations = {
  'blue-striped-sock': sock(sky, 'M11 6h9v2h-9zm0 4h9v2h-9zM5 16h8v2H5z'),
  'red-striped-sock': sock(pink, 'M11 6h9v2h-9zm0 4h9v2h-9zM5 16h8v2H5z'),
  'blue-dotted-sock': sock(sky, 'M13 6h2v2h-2zm4 4h2v2h-2zM6 16h2v2H6zm5 0h2v2h-2z'),
  'red-dotted-sock': sock(pink, 'M13 6h2v2h-2zm4 4h2v2h-2zM6 16h2v2H6zm5 0h2v2h-2z'),
  circle: [[sky, round]], square: [[sky, square]], triangle: [[sky, triangle]],
  'square-window': [[clay, 'M3 3h18v18H3z'], [sky, 'M5 5h6v6H5zm8 0h6v6h-6zM5 13h6v6H5zm8 0h6v6h-6z']],
  pennant: [[pink, 'M5 4h15L5 19z'], [clay, 'M4 4h2v17H4z']],
  'soap-symbol': [[sky, 'M4 13h7v2H4zM6 8h4v4H6zm6 3h7v7h-7zm4-7h4v4h-4z'], [ivory, 'M14 13h3v2h-3z']],
  'tooth-symbol': [[sky, 'M5 4h6v2h2V4h6v2h2v7h-2v8h-5v-7h-4v7H5v-8H3V6h2z']],
  'comb-symbol': [[plum, 'M4 6h16v3H4zm1 3h2v9H5zm4 0h2v9H9zm4 0h2v9h-2zm4 0h2v9h-2z']],
  toothbrush: [[sky, 'M3 14h18v3H3z'], [pink, 'M14 11h7v5h-7z'], [ivory, 'M14 8h2v4h-2zm3 0h2v4h-2zm3 0h2v4h-2z']],
  'yellow-round-block': block(gold, round), 'green-round-block': block(green, round),
  'yellow-square-block': block(gold, square), 'green-square-block': block(green, square),
  'yellow-triangle-block': block(gold, triangle), 'green-triangle-block': block(green, triangle),
  base: [footing], tower: [footing, stack], 'tower-flag': [footing, stack, [pink, 'M13 2h7v4h-5v3h-2z']],
  'morning-book': [[gold, 'M3 2h5v5H3zm8 1h3v2h-3zm-9 6h2v3H2z'], [green, 'M4 12h7l1 2 1-2h7v9h-7l-1 1-1-1H4z'], [ivory, 'M6 14h4v2H6zm8 0h4v2h-4z']],
  'noon-plate': [[gold, 'M9 3h6v5H9zM6 4h2v3H6zm10 0h2v3h-2z'], [sky, 'M4 12h16v6h-3v3H7v-3H4z'], [ivory, 'M7 13h10v4H7z']],
  'evening-pillow': [[plum, 'M3 3h10v2H7v5h6v2H5l-2-3z'], [lavender, 'M4 14h16v6H4z'], [ivory, 'M6 15h12v3H6z']],
  'book-box': tray(gold, 'M7 8h5v6H7zm6 0h4v6h-4z'),
  'pencil-box': tray(gold, 'M7 13l7-6 3 2-7 5H7z'),
  'ball-box': tray(green, 'M9 8h6v1h2v4h-2v1H9v-1H7V9h2z'),
  'bear-box': tray(green, 'M6 7h4v2h4V7h4v4h-2v3H8v-3H6z'),
  'star-mark': [[gold, starMark]], 'moon-mark': [[sky, moonMark]], 'heart-mark': [[pink, heartMark]],
  'star-drawer': cabinet(starMark), 'moon-drawer': cabinet(moonMark), 'heart-drawer': cabinet(heartMark),
  'short-tube': tube(9, 6), 'long-tube': tube(17, 6), 'wide-tube': tube(13, 12),
  'small-bin': bin(8, 13), 'medium-bin': bin(6, 9), 'large-bin': bin(3, 4),
  'cardboard-kit': [[clay, 'M4 7h17v12H4z'], [gold, 'M2 5h17v12H2z'], [ivory, 'M4 8h13v2H4zm0 4h13v2H4z']],
  'felt-kit': [[plum, round], [pink, 'M8 7h8v4h3v4h-3v3H8v-3H5v-4h3z']],
  'fabric-kit': cloth(green, check),
  'ramp-kit': [[green, 'M3 13h8v7H3z'], [gold, 'M12 20l9-12v12z'], [plum, 'M4 19h18v2H4z']],
  'scratch-kit': [[clay, 'M4 5h4v15H4zm6 0h4v15h-4zm6 0h4v15h-4z'], [gold, 'M5 7h2v10H5zm6 0h2v10h-2zm6 0h2v10h-2z']],
  'tube-kit': [[clay, 'M3 5h17v5H3zm2 7h16v7H5z'], [gold, 'M4 6h14v1H4zm3 7h12v2H7z'], [plum, 'M18 8h2v2h-2zm1 8h2v3h-2z']],
  'cardboard-base': [footing], 'cardboard-walls': [footing, walls],
  'cardboard-roof': [footing, walls, [pink, 'M3 5h18v5H3z'], [ivory, 'M5 6h14v1H5z']],
  stripes: cloth(sky, stripe), dots: cloth(green, dot), checks: cloth(plum, check),
  'striped-fabric': cloth(lavender, stripe), 'dotted-fabric': cloth(pink, dot), 'checked-fabric': cloth(green, check),
  'low-step': steps(15), 'middle-step': steps(10), 'high-step': steps(5),
  crayon: [[pink, 'M4 10h4V8h11v8H8v-2H4z'], [plum, 'M10 8h2v8h-2zm6 0h2v8h-2z']],
  'seed-packet': [[green, 'M5 4h14v2h1v15H4V6h1z'], [ivory, 'M7 8h10v9H7z'], [clay, 'M10 12h5v3h-5z']],
  'felt-circle': [[pink, round], [ivory, 'M8 7h6v2H8zm-2 3h2v4H6z']],
} satisfies Record<WorkshopPicture, Drawing>

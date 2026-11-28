import type { PictureId } from '../content/pack'
import { workshopIllustrations } from './workshopPictures'

const pencil = (width: number): readonly (readonly [string, string])[] => [
  ['#aa7454', `M2 9h${width}l3 3-3 3H2z`], ['#e6ba73', `M4 10h${width - 2}v3H4z`],
]
const board = (width: number): readonly (readonly [string, string])[] => [
  ['#825e4d', `M2 8h${width}v8H2z`], ['#d8a172', `M3 9h${width - 2}v5H3z`], ['#b98063', 'M5 11h5v1H5z'],
]
const ball = (border: string, fill: string): readonly (readonly [string, string])[] => [
  [border, 'M8 3h8v2h4v3h2v8h-2v3h-4v2H8v-2H4v-3H2V8h2V5h4z'], [fill, 'M8 6h8v2h3v7h-3v3H8v-3H5V8h3z'],
]

const pictures: Record<Exclude<PictureId, 'blanket' | 'pillow' | 'basket'>, readonly (readonly [string, string])[]> = {
  ...workshopIllustrations,
  lamp: [['#7b5e72', 'M11 7h2v12h5v2H6v-2h5z'], ['#d49665', 'M8 4h8l4 9H4z'], ['#f6dc9b', 'M7 10h10v2H7z']],
  book: [['#84759e', 'M3 5h8l1 2 1-2h8v15h-8l-1 1-1-1H3z'], ['#f6e8c5', 'M5 7h5l2 2 2-2h5v10h-5l-2 2-2-2H5z']],
  paper: [['#887377', 'M5 3h10l4 4v14H5z'], ['#fff1d5', 'M6 4h8v4h4v12H6z'], ['#9d8688', 'M8 11h8v1H8zm0 4h8v1H8z']],
  roof: [['#b86b68', 'M12 3 23 13l-3 3-8-7-8 7-3-3z'], ['#754c5d', 'M5 15h14v3H5z'], ['#eaa38b', 'M9 8h6v2H9z']],
  apple: [['#a44b54', 'M5 8h5l2 1 2-1h5v3h2v6h-2v3h-5l-2-1-2 1H5v-3H3v-6h2z'], ['#5c8461', 'M11 4h2v5h-2zm2-1h5v3h-5z']],
  pear: [['#8d9a63', 'M9 5h6v5h2v3h3v5h-3v3H7v-3H4v-5h3v-3h2z'], ['#785a4d', 'M11 3h2v4h-2z']],
  'short-pencil': pencil(9), 'mid-pencil': pencil(13), 'long-pencil': pencil(17),
  'short-board': board(10), 'mid-board': board(15), 'long-board': board(20),
  'blue-ball': ball('#4f718d', '#8bb8c8'), 'red-ball': ball('#a75265', '#db8e8a'),
  pencil: [['#d39b48', 'M4 17 16 5l4 4L8 21H4z'], ['#5d484a', 'M4 17l4 4H4z'], ['#b06673', 'm16 5 2-2 4 4-2 2z']],
  eraser: [['#a55f73', 'M3 12 12 4l9 8-9 8H9z'], ['#e0a0a9', 'm3 12 6 6 5-5-6-5z'], ['#f0d7ac', 'm12 17 5-5 3 1-8 7z']],
  notebook: [['#5a807a', 'M5 3h15v18H5z'], ['#f3e4c3', 'M8 6h10v7H8z'], ['#775964', 'M3 5h4v2H3zm0 5h4v2H3zm0 5h4v2H3z']],
  soap: [['#a56a89', 'M4 8h16v2h2v6h-2v2H4v-2H2v-6h2z'], ['#edbbca', 'M5 9h14v6H5z'], ['#fff0db', 'M8 10h5v2H8zm7-7h3v3h-3z']],
  towel: [['#377a83', 'M4 4h16v16H4z'], ['#79b8b0', 'M6 6h12v12H6z'], ['#eae7bd', 'M6 14h12v2H6zM3 20h2v2H3zm6 0h2v2H9zm6 0h2v2h-2z']],
  comb: [['#976348', 'M3 6h18v4H3zm2 4h2v8H5zm4 0h2v8H9zm4 0h2v8h-2zm4 0h2v8h-2z']],
  plate: [['#628c97', 'M7 3h10v2h4v4h2v6h-2v4h-4v2H7v-2H3v-4H1V9h2V5h4z'], ['#f1e1bb', 'M7 6h10v2h3v8h-3v2H7v-2H4V8h3z'], ['#fff8e3', 'M8 9h8v6H8z']],
  cup: [['#5c7e86', 'M3 6h13v2h5v8h-5v3H5v-3H3zm13 4v4h3v-4z'], ['#94bcad', 'M5 8h9v8H5z'], ['#e1dfbb', 'M5 10h9v2H5z']],
  spoon: [['#627d91', 'M9 3h6v2h3v6h-3v2h-2v9h-2v-9H9v-2H6V5h3z'], ['#c6d5ce', 'M9 5h6v5H9z']],
  'small-book': [['#6e5b82', 'M6 10h12v11H6z'], ['#d0abcb', 'M8 12h8v2H8z']],
  'medium-book': [['#688c78', 'M5 6h14v15H5z'], ['#b8c987', 'M7 9h10v2H7z']],
  'large-book': [['#aa685a', 'M4 2h16v19H4z'], ['#f1be95', 'M6 6h12v2H6z']],
  'toy-car': [['#bd6f67', 'M3 11h4l3-5h6l3 5h3v7H2v-5z'], ['#f7dcad', 'M10 8h5l2 3H8z'], ['#554a54', 'M5 16h4v4H5zm10 0h4v4h-4z']],
  'toy-train': [['#5b7e82', 'M3 8h4v4h5V6h8v12H2v-4h1z'], ['#efc780', 'M14 8h4v5h-4z'], ['#554a54', 'M5 16h4v4H5zm10 0h4v4h-4z']],
  'toy-bear': [['#9b6e51', 'M4 4h5v3h6V4h5v5h-2v5h2v6H4v-6h2V9H4z'], ['#eac79c', 'M8 13h8v5H8z'], ['#513d42', 'M8 9h2v2H8zm6 0h2v2h-2z']],
  'toy-rabbit': [['#a78ba3', 'M6 2h4v8h4V2h4v9h2v8h-3v3H7v-3H4v-8h2z'], ['#eed6c7', 'M8 15h8v5H8z'], ['#574855', 'M8 12h2v2H8zm6 0h2v2h-2z']],
  shirt: [['#9c6b87', 'M7 4h3v3h4V4h3l6 5-4 5-2-2v9H7v-9l-2 2-4-5z'], ['#dbc0bb', 'M9 14h6v2H9z']],
  sock: [['#467b81', 'M11 3h8v14h-2v4H5v-2H3v-5h8z'], ['#e0cd9f', 'M11 4h8v3h-8zM5 16h4v4H5z']],
}

export function Picture({ id }: { id: PictureId }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" shapeRendering="crispEdges">
      {id === 'blanket' ? <>
        <path fill="#9c695e" d="M4 4h16v15H4zM5 19h2v3H5zM9 19h2v3H9zM13 19h2v3h-2zM17 19h2v3h-2z" />
        <path fill="#d9907d" d="M6 6h12v11H6z" />
        <path fill="#f9cd95" d="M6 9h12v2H6zM6 14h12v2H6z" />
      </> : id === 'pillow' ? <>
        <path fill="#648d80" d="M4 7h16v2h2v7h-2v2H4v-2H2V9h2z" />
        <path fill="#a6c8aa" d="M5 9h14v7H5z" />
        <path fill="#d3ddaf" d="M7 10h9v2H7z" />
      </> : id === 'basket' ? <>
        <path fill="#946648" d="M5 13V7h2V4h10v3h2v6h3v4h-2v4H4v-4H2v-4zm2 0h10V8h-2V6H9v2H7z" />
        <path fill="#d4a56e" d="M3 13h18v3H3zM6 17h12v3H6z" />
        <path fill="#a77653" d="M8 16h2v4H8zM14 16h2v4h-2z" />
      </> : pictures[id].map(([fill, path]) => <path key={path} fill={fill} d={path} />)}
    </svg>
  )
}

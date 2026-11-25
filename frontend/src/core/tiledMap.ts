import { canStand, type Anchor, type Box, type Point } from './room.ts'

type MapObject = Box & {
  id: number
  name: string
  point?: boolean
  rotation?: number
  properties?: { name: string; value: unknown }[]
}

type RoomMap = {
  orientation: string
  infinite: boolean
  width: number
  height: number
  tilewidth: number
  tileheight: number
  layers: { name: string; type: string; objects: MapObject[] }[]
}

export const furnitureArt = ['bed', 'desk', 'wardrobe', 'door', 'clothes', 'bowl', 'cat-bed'] as const
export type FurnitureArt = (typeof furnitureArt)[number]
export type LocationMap = {
  width: number
  height: number
  furniture: { id: string; art: FurnitureArt; box: Box; solid: boolean }[]
  walls: Box[]
  anchors: Anchor[]
  spawns: Map<string, Point>
}

export const solidsFor = (map: LocationMap, hidden: readonly string[] = []) => [
  ...map.walls, ...map.furniture.filter((item) => item.solid && !hidden.includes(item.id)).map((item) => item.box),
]

const property = (object: MapObject, name: string) =>
  object.properties?.find((entry) => entry.name === name)?.value

export function readMap(map: RoomMap): LocationMap {
  const check = (condition: unknown, message: string) => {
    if (!condition) throw new Error(`Invalid location map: ${message}`)
  }
  const width = map.width * map.tilewidth
  const height = map.height * map.tileheight
  check(map.orientation === 'orthogonal' && !map.infinite && width === 320 && height === 240 &&
    map.tilewidth === 16 && map.tileheight === 16, 'expected a 320 × 240 orthogonal map with 16 px tiles')

  const objectIds = new Set<number>()
  const objects = (name: string) => {
    const layers = map.layers.filter((layer) => layer.name === name && layer.type === 'objectgroup')
    check(layers.length === 1, `expected one ${name} object layer`)
    for (const object of layers[0].objects) {
      const { id, x, y, width: w, height: h } = object
      check(Number.isInteger(id) && id > 0 && !objectIds.has(id), `duplicate or invalid object ID ${id}`)
      objectIds.add(id)
      check([x, y, w, h].every(Number.isFinite) && x >= 0 && y >= 0 &&
        x + w <= width && y + h <= height && !object.rotation &&
        (object.point ? w === 0 && h === 0 : w > 0 && h > 0), `invalid geometry for ${object.name}`)
    }
    return layers[0].objects
  }

  const uniqueNames = (name: string) => {
    const entries = objects(name)
    check(entries.every((object) => /^[a-z][a-z0-9-]*$/.test(object.name)) &&
      new Set(entries.map((object) => object.name)).size === entries.length, `invalid or duplicate name in ${name}`)
    return entries
  }
  const furniture = uniqueNames('Furniture').map((box) => {
    const art = furnitureArt.find((candidate) => candidate === property(box, 'art'))
    if (!art || box.point) throw new Error(`Invalid furniture: ${box.name}`)
    return { id: box.name, art, box, solid: property(box, 'solid') === true }
  })
  const walls = objects('Collisions')
  check(walls.length > 0 && walls.every((wall) => !wall.point), 'expected wall rectangles')
  const solids = [...walls, ...furniture.filter((item) => item.solid).map((item) => item.box)]
  const walkable = (point: MapObject) => point.point && point.x >= 5 && point.x <= width - 5 &&
    point.y >= 3 && point.y <= height - 3 && canStand(point, solids)
  const anchors = uniqueNames('Interactions').map((anchor): Anchor => {
    check(walkable(anchor), `expected a walkable ${anchor.name} anchor`)
    const radius = property(anchor, 'radius')
    if (typeof radius !== 'number' || !Number.isFinite(radius) || radius <= 0) {
      throw new Error(`Invalid location map: invalid radius for ${anchor.name}`)
    }
    return { id: anchor.name, x: anchor.x, y: anchor.y, radius }
  })

  const spawns = new Map(uniqueNames('SpawnPoints').map((spawn) => {
    check(walkable(spawn), `expected a walkable ${spawn.name} spawn`)
    return [spawn.name, { x: spawn.x, y: spawn.y }]
  }))
  check(spawns.size > 0, 'expected at least one spawn')
  return { width, height, furniture, walls, anchors, spawns }
}

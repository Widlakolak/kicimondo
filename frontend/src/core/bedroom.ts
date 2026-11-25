import { canStand, interactionIds, type Anchor, type Box } from './room.ts'

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

const furnitureIds = ['bed', 'desk', 'wardrobe', ...interactionIds] as const
export type FurnitureId = (typeof furnitureIds)[number]

const property = (object: MapObject, name: string) =>
  object.properties?.find((entry) => entry.name === name)?.value

export function readBedroom(map: RoomMap) {
  const check = (condition: unknown, message: string) => {
    if (!condition) throw new Error(`Invalid bedroom map: ${message}`)
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

  const props = objects('Furniture')
  check(props.length === furnitureIds.length, 'unexpected furniture count')
  const furniture = furnitureIds.map((id) => {
    const matches = props.filter((object) => object.name === id)
    check(matches.length === 1 && !matches[0]?.point, `expected one ${id} rectangle`)
    return { id, box: matches[0], solid: property(matches[0], 'solid') === true }
  })
  const walls = objects('Collisions')
  check(walls.length > 0 && walls.every((wall) => !wall.point), 'expected wall rectangles')
  const solids = [...walls, ...furniture.filter((item) => item.solid).map((item) => item.box)]
  const interactions = objects('Interactions')
  check(interactions.length === interactionIds.length, 'unexpected interaction count')
  const anchors: Anchor[] = interactionIds.map((id) => {
    const matches = interactions.filter((object) => object.name === id)
    const anchor = matches[0]
    check(matches.length === 1 && anchor?.point && canStand(anchor, solids), `expected a walkable ${id} anchor`)
    const radius = property(anchor, 'radius')
    if (typeof radius !== 'number' || !Number.isFinite(radius) || radius <= 0) {
      throw new Error(`Invalid bedroom map: invalid radius for ${id}`)
    }
    return { id, x: anchor.x, y: anchor.y, radius }
  })

  const spawns = objects('SpawnPoints')
  const spawn = spawns[0]
  check(spawns.length === 1 && spawn?.name === 'bedside' &&
    spawn.point && canStand(spawn, solids), 'expected one walkable bedside spawn')
  return { width, height, furniture, solids, anchors, spawn: { x: spawn.x, y: spawn.y } }
}

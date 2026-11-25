import { loadMaps } from './loadMaps'

const sources = import.meta.glob<string>('../game/maps/*.tmj', { eager: true, query: '?raw', import: 'default' })

export const maps = loadMaps((location) => sources[`../game/maps/${location}.tmj`])

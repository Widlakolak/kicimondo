import { readFileSync, writeFileSync } from 'node:fs'
import { argv } from 'node:process'
import { URL } from 'node:url'
import { downloadableMath, educationalCompatibilityVersion } from '../src/content/remote/compatibility.ts'

const manifest = {
  gameContentVersion: educationalCompatibilityVersion,
  math: Object.fromEntries(Object.entries(downloadableMath)
    .sort(([a], [b]) => a.localeCompare(b, 'en'))
    .map(([id, { maximum, operations }]) => [id, { maximum, operations }])),
}
const file = new URL('../../contracts/compatibility.json', import.meta.url)
const json = JSON.stringify(manifest, null, 2) + '\n'
if (argv.includes('--check')) {
  if (readFileSync(file, 'utf8').replace(/\r\n/g, '\n') !== json) {
    throw new Error('Regenerate contracts/compatibility.json with npm run contracts:generate')
  }
} else {
  writeFileSync(file, json)
}

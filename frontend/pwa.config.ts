import { createHash } from 'node:crypto'
import { copyFile, readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

export function pwa(): Plugin {
  let output: string
  let source: string
  return {
    name: 'kicimondo-pwa',
    apply: 'build',
    configResolved(config) {
      output = resolve(config.root, config.build.outDir)
      source = resolve(config.root, 'pwa')
    },
    transformIndexHtml() {
      return [{ tag: 'link', attrs: { rel: 'manifest', href: './manifest.webmanifest' }, injectTo: 'head' }]
    },
    async writeBundle() {
      for (const file of ['manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) {
        await copyFile(resolve(source, file), resolve(output, file))
      }
      const worker = await readFile(resolve(source, 'worker.js'), 'utf8')
      const assets = await Promise.all((await readdir(output, { recursive: true, withFileTypes: true }))
        .filter((entry) => entry.isFile())
        .map((entry) => resolve(entry.parentPath, entry.name))
        .sort()
        .map(async (file) => {
          const bytes = await readFile(file)
          const hash = createHash('sha256').update(bytes).digest('base64')
          return [file.slice(output.length + 1).replaceAll('\\', '/'), 'sha256-' + hash, bytes.length] as const
        }))
      const manifest = JSON.stringify(assets.map(([path, integrity]) => [path, integrity]))
      const version = createHash('sha256').update(manifest).update(worker).digest('hex')
      await writeFile(resolve(output, 'sw.js'),
        `const CACHE = 'kicimondo:' + new URL(self.registration.scope).pathname + ':${version}';\n` +
        `const ASSETS = ${manifest};\n${worker}`)
      console.log(`PWA precache (${assets.length} files):`)
      for (const [path, , bytes] of assets) console.log(`  ${path} (${bytes} bytes)`)
    },
  }
}

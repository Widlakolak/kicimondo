import { createServer } from 'node:http'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, join, resolve, sep } from 'node:path'
import { expect, test } from '@playwright/test'
import { build } from 'vite'
import { buttonAlternative, enterRoom, saveRecord, stage, walkToClothes } from './roomHelpers'

test('a fresh build waits for every open window and preserves the previous save', async ({ context, page }) => {
  test.setTimeout(65000)
  const versionTwo = await mkdtemp(join(tmpdir(), 'kicimondo-update-'))
  let folder = resolve('dist')
  const media: Record<string, string> = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.png': 'image/png', '.webmanifest': 'application/manifest+json',
  }
  const server = createServer(async (request, response) => {
    try {
      const path = new URL(request.url!, 'http://localhost').pathname
      const file = resolve(folder, '.' + (path === '/' ? '/index.html' : path))
      if (!file.startsWith(folder + sep)) throw new Error('Invalid asset path')
      const body = await readFile(file)
      response.writeHead(200, { 'Content-Type': media[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' })
      response.end(body)
    } catch {
      response.writeHead(404).end()
    }
  })
  try {
    await build({
      build: { outDir: versionTwo, emptyOutDir: true },
      logLevel: 'error',
      plugins: [{
        name: 'change-welcome-copy',
        enforce: 'pre',
        transform(code, id) {
          if (id.endsWith('/src/i18n/pl.ts')) return code.replace('Witaj w Kicimondo!', 'Witaj ponownie w Kicimondo!')
        },
      }],
    })
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Missing test server port')
    const url = `http://127.0.0.1:${address.port}/`
    await page.goto(url)
    await expect(page.getByText('Gra gotowa do działania bez internetu.')).toBeVisible()
    await enterRoom(page)
    await walkToClothes(page)

    const other = await context.newPage()
    await other.goto(url)
    await expect(other.getByRole('heading', { name: 'Witaj w Kicimondo!' })).toBeVisible()
    folder = versionTwo
    await other.evaluate(async () => (await navigator.serviceWorker.ready).update())
    await expect.poll(() => other.evaluate(async () => Boolean((await navigator.serviceWorker.ready).waiting))).toBe(true)
    await expect(other.getByText('Jest nowa wersja gry.', { exact: false })).toBeVisible()
    await expect(page.getByText('Jest nowa wersja gry.', { exact: false })).toHaveCount(0)
    await expect(page.getByRole('dialog', { name: 'Rozrzucone ubrania' })).toBeVisible()
    await buttonAlternative(page)
    await page.getByRole('button', { name: 'Zamknij' }).click()
    const saved = await saveRecord(page)

    // This window has never loaded the old room bundle, and the new server no longer has it.
    await other.getByRole('button', { name: 'Wróć do gry' }).click()
    await expect(stage(other).locator('canvas')).toBeVisible()
    await other.close()
    await expect.poll(() => page.evaluate(async () => Boolean((await navigator.serviceWorker.ready).waiting))).toBe(true)
    await page.close()

    const reopened = await context.newPage()
    await expect.poll(async () => {
      await reopened.goto(url)
      const updated = await reopened.getByRole('heading', { name: 'Witaj ponownie w Kicimondo!' }).isVisible()
      if (!updated) await reopened.goto('about:blank')
      return updated
    }).toBe(true)
    await reopened.getByRole('button', { name: 'Wróć do gry' }).click()
    await expect(reopened.getByText('1 PS', { exact: true })).toBeVisible()
    expect(await saveRecord(reopened)).toEqual(saved)
  } finally {
    const closed = new Promise<void>((done) => server.close(() => done()))
    server.closeAllConnections()
    await closed
    await rm(versionTwo, { recursive: true, force: true })
  }
})

import { expect, test, type BrowserContext, type Page, type TestInfo } from '@playwright/test'
import { challenges, type TraceChallenge } from '../src/content/pack'
import type { Point } from '../src/core/room'
import { earn, fromHouse, travel } from './gardenFixtures'
import { buttonAlternative, enterRoom, expectRoomReady, holdKey, pixelAt, reach, saveRecord, stage, walkToClothes, worldClient } from './roomHelpers'

const landscape = { width: 640, height: 360 }
const clothes = 'Rozrzucone ubrania'
const close = (page: Page) => page.getByRole('button', { name: 'Zamknij', exact: true }).click()
const resume = (page: Page) => page.getByRole('button', { name: 'Wróć do gry' }).click()
const reward = (page: Page) => page.getByRole('dialog', { name: 'Brawo!' })
const points = (page: Page) => page.locator('.points strong')
const world = (page: Page) => stage(page).locator('canvas')
const board = (page: Page) => page.getByRole('img', { name: 'Ścieżka od startu do mety' })

async function capture(page: Page, info: TestInfo, name: string) {
  if (process.env.KICIMONDO_VISUAL_REVIEW === '1') {
    await page.screenshot({ path: info.outputPath(`visual-${name}.png`), animations: 'disabled' })
  }
}

async function tapWorld(page: Page, point: Point) {
  const { x, y } = await worldClient(page, point)
  expect(x).toBeGreaterThan(0)
  expect(y).toBeGreaterThan(0)
  expect(x).toBeLessThan(page.viewportSize()!.width)
  expect(y).toBeLessThan(page.viewportSize()!.height)
  await page.touchscreen.tap(x, y)
}

async function draw(page: Page, context: BrowserContext, challenge: TraceChallenge) {
  const points = [...challenge.path]
  const mid = Math.floor(points.length / 2)
  points.splice(mid + 1, 0, { x: points[mid].x, y: 0.02 }, points[mid])
  const samples = await board(page).evaluate((svg, points) => {
    const matrix = (svg as unknown as SVGSVGElement).getScreenCTM()!
    return points.map(({ x, y }) => {
      const screen = new DOMPoint(x * 100, y * 100).matrixTransform(matrix)
      return { x: screen.x, y: screen.y }
    })
  }, points)
  const device = await context.newCDPSession(page)
  await device.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [samples[0]] })
  for (const sample of samples.slice(1, mid + 1)) {
    await device.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [sample] })
  }
  const accepted = Number(await board(page).getAttribute('data-progress'))
  expect(accepted).toBeGreaterThan(0)
  await device.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [samples[mid + 1]] })
  await expect(board(page).locator('.trace-ink')).toHaveAttribute('d', /L/)
  expect(Number(await board(page).getAttribute('data-progress'))).toBeGreaterThanOrEqual(accepted)
  for (const sample of samples.slice(mid + 2)) {
    await device.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [sample] })
  }
  // The dialog and durable reward must appear while the finger is still down.
  await expect(reward(page)).toContainText('+1')
  await device.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await device.detach()
}

async function adultMenu(page: Page) {
  await page.getByRole('button', { name: 'Pauza', exact: true }).click()
  await page.getByRole('button', { name: 'Wróć do menu' }).click()
  await page.getByText('Dla dorosłych', { exact: true }).click()
}

test.describe('direct touch in the game world', () => {
  test.use({ viewport: landscape, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })

  test('walks, resolves exact object taps across camera scroll, scratches the clothes and unlocks the landing', async ({ page, context }, info) => {
    await page.goto('/')
    await enterRoom(page)
    await expect(page.getByText('Dotknij podłogi', { exact: true })).toBeVisible()
    await expect(stage(page)).toHaveAttribute('data-guide', 'quest')
    await tapWorld(page, { x: 128, y: 114 })
    await expect(page.getByText('Znajdź gwiazdkę', { exact: true })).toBeVisible()
    await reach(page, 'x', 127, 1)
    const offset = Number(await stage(page).getAttribute('data-camera-x'))
    const before = await pixelAt(page, 181, 150)

    await tapWorld(page, { x: 181, y: 150 })
    await expect(stage(page)).toHaveAttribute('data-destination', 'walking')
    await reach(page, 'y', 153, 1)
    await expect(stage(page)).not.toHaveAttribute('data-destination', 'walking')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(Number(await stage(page).getAttribute('data-camera-x'))).toBeGreaterThan(offset)
    await capture(page, info, 'scrolled-camera')
    await tapWorld(page, { x: 181, y: 150 })
    await expect(page.getByRole('dialog', { name: clothes })).toBeVisible()
    await expect(page.locator('.tutorial-task')).toContainText('Zrób zadanie')
    await expect(page.getByRole('button', { name: 'Anuluj' })).toBeInViewport({ ratio: 1 })

    await draw(page, context, challenges['clothes-to-basket'])
    await expect(reward(page)).toContainText('Nowy pokój otwarty!')
    await capture(page, info, 'reward')
    await close(page)
    await expectRoomReady(page)
    await expect(stage(page)).not.toHaveAttribute('data-quests', /scattered-clothes/)
    await expect.poll(() => pixelAt(page, 181, 150)).not.toEqual(before)
    await expect(points(page)).toHaveText('1')

    const full = page.getByRole('button', { name: /Pełny ekran|Powiększ grę/ })
    // Reproduce the first post-trace tap for which Chromium omits the compatibility click.
    await page.evaluate(() => window.addEventListener('click', (event) => event.stopImmediatePropagation(),
      { capture: true, once: true }))
    await full.tap()
    await expect(page.getByRole('button', { name: 'Ukryj strzałki' })).toBeVisible()
    await page.getByRole('button', { name: 'Ukryj strzałki' }).tap()
    await expect(page.getByRole('group', { name: 'Sterowanie' })).toHaveCount(0)
    await capture(page, info, 'hidden-controls')
    await tapWorld(page, { x: 160, y: 85 })
    await reach(page, 'y', 86, -1)
    await expect(stage(page)).not.toHaveAttribute('data-destination', 'walking')
    await expect.poll(async () => Number(await stage(page).getAttribute('data-camera-y'))).toBeLessThan(23)
    await tapWorld(page, { x: 160, y: 23 })
    await reach(page, 'y', 45, -1)
    await expect(stage(page)).not.toHaveAttribute('data-destination', 'walking')
    await tapWorld(page, { x: 160, y: 23 })
    await expect(page.getByRole('heading', { name: 'Półpiętro' })).toBeVisible()
    await expect(stage(page)).toHaveAttribute('data-exit', 'study-door')
    await expect(page.getByRole('group', { name: 'Sterowanie' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Pokaż strzałki' }).tap()
    await expect(page.getByRole('button', { name: 'W górę' })).toBeVisible()

    await page.reload()
    await resume(page)
    await expect(page.getByRole('heading', { name: 'Półpiętro' })).toBeVisible()
    await expect(page.getByText('Dotknij podłogi', { exact: true })).toHaveCount(0)
    expect(await saveRecord(page)).toMatchObject({
      completed: ['bedroom-clean-clothes'],
      rewards: [{ id: 'bedroom-clean-clothes-first', points: 1 }],
      hidden: [{ location: 'bedroom', object: 'scattered-clothes' }],
    })
  })

  test('scratches the garden tunnel offline and restores its art and reward after reloading', async ({ page, context }, info) => {
    await page.setViewportSize({ width: 960, height: 600 })
    await page.goto('/')
    await expect(page.getByText('Gra gotowa do działania bez internetu.')).toBeVisible()
    const seed = travel(earn(fromHouse(), ({ id }) => id === 'living-match-living-items'), 'garden')
    await page.evaluate((save) => new Promise<void>((resolve, reject) => {
      const opening = indexedDB.open('kicimondo')
      opening.onerror = () => reject(opening.error)
      opening.onsuccess = () => {
        const db = opening.result
        const write = db.transaction('saves', 'readwrite')
        write.objectStore('saves').put(save, 'current')
        write.oncomplete = () => { db.close(); resolve() }
        write.onabort = () => { db.close(); reject(write.error) }
      }
    }), seed)
    await context.setOffline(true)
    await page.reload()
    await resume(page)
    await expect(stage(page)).toHaveAttribute('data-x', '160')
    await tapWorld(page, { x: 270, y: 90 })
    await reach(page, 'x', 269, 1)
    await expect(stage(page)).not.toHaveAttribute('data-destination', 'walking')
    const before = await pixelAt(page, 270, 53)
    await tapWorld(page, { x: 270, y: 53 })
    await expect(page.getByRole('dialog', { name: 'Droga przez tunel' })).toBeVisible()
    await capture(page, info, 'tunnel')
    await draw(page, context, challenges['clear-tunnel'])
    await close(page)
    await expect(points(page)).toHaveText('17')
    await expect(stage(page)).not.toHaveAttribute('data-quests', /garden-tunnel/)
    await expect.poll(() => pixelAt(page, 270, 53)).not.toEqual(before)

    await page.reload()
    await resume(page)
    await expect(points(page)).toHaveText('17')
    await expect(stage(page)).not.toHaveAttribute('data-quests', /garden-tunnel/)
    const save = await saveRecord(page)
    expect(save.completed.filter((id) => id === 'garden-clear-tunnel')).toHaveLength(1)
    expect(save.restored).toContainEqual({ location: 'garden', object: 'garden-tunnel' })
    expect(save.rewards).toHaveLength(17)
  })

  test('rejects furniture targets, overrides a route with a keyboard and pauses on rotation', async ({ page }, info) => {
    await page.addInitScript(() => {
      Object.defineProperty(Document.prototype, 'fullscreenEnabled', { get: () => false })
      Object.defineProperty(screen.orientation, 'lock', { value: () => {
        document.documentElement.dataset.lockAttempt = 'landscape'
        return Promise.reject(new DOMException('Lock not allowed', 'SecurityError'))
      } })
    })
    await page.goto('/')
    await enterRoom(page)
    await expect(page.locator('html')).toHaveAttribute('data-lock-attempt', 'landscape')
    await tapWorld(page, { x: 35, y: 58 })
    await expect(stage(page)).toHaveAttribute('data-destination', 'blocked')
    await expect(stage(page)).toHaveAttribute('data-x', '106')
    await expect(stage(page)).not.toHaveAttribute('data-destination', 'blocked')
    await tapWorld(page, { x: 200, y: 105 })
    await expect(stage(page)).toHaveAttribute('data-destination', 'walking')
    await holdKey(page, 'a', () => reach(page, 'x', 92, -1))
    await expect(stage(page)).not.toHaveAttribute('data-destination', 'walking')
    await tapWorld(page, { x: 190, y: 109 })
    await expect(stage(page)).toHaveAttribute('data-destination', 'walking')
    await page.setViewportSize({ width: 360, height: 640 })
    await expect(page.getByText('Obróć ekran')).toBeVisible()
    await capture(page, info, 'portrait-rotation')
    await expect(stage(page)).not.toHaveAttribute('data-destination', 'walking')
    await page.setViewportSize(landscape)
    await page.getByRole('button', { name: 'Powiększ grę' }).tap()
    await expect(page.getByRole('button', { name: 'Zmniejsz grę' })).toBeInViewport()
    await expect.poll(async () => (await world(page).boundingBox())?.width).toBe(landscape.width)
    await page.getByRole('button', { name: 'Ukryj strzałki' }).tap()
    await expect(page.getByRole('button', { name: 'W górę' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Pauza', exact: true }).tap()
    await page.keyboard.press('Escape')
    await expectRoomReady(page)
    await page.getByRole('button', { name: 'Zmniejsz grę' }).tap()
    await expect(page.getByRole('button', { name: 'W górę' })).toBeInViewport()
  })
})

test('offers manual PWA installation, uses a browser offer when available and hides it after installation', async ({ page }) => {
  await page.addInitScript(() => window.addEventListener('beforeinstallprompt', (event) => {
    if (event.isTrusted) event.stopImmediatePropagation()
  }, true))
  await page.goto('/')
  await page.getByText('Dla dorosłych', { exact: true }).click()
  const install = page.getByRole('button', { name: 'Zainstaluj grę' })
  await install.click()
  await expect(page.getByText('Otwórz menu przeglądarki', { exact: false })).toBeVisible()
  await page.evaluate(() => {
    const offer = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt() {
        document.documentElement.dataset.installPrompt = 'shown'
        return Promise.resolve()
      },
    })
    window.dispatchEvent(offer)
  })
  await install.click()
  await expect(page.locator('html')).toHaveAttribute('data-install-prompt', 'shown')
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')))
  await expect(install).toHaveCount(0)
})

test('keeps the same canvas through the landscape matrix and offers browser fullscreen on purpose', async ({ page }, info) => {
  await page.setViewportSize(landscape)
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Wejdź do pokoju' })).toBeInViewport({ ratio: 1 })
  await enterRoom(page)
  await world(page).evaluate((canvas) => { canvas.setAttribute('data-test-scene', 'original') })
  for (const viewport of [landscape, { width: 844, height: 390 }, { width: 960, height: 600 },
    { width: 1920, height: 1200 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport)
    await expect(page.getByRole('button', { name: 'Sprawdź' })).toBeInViewport({ ratio: 1 })
    const rect = (await world(page).boundingBox())!
    expect(rect.width / viewport.width).toBeGreaterThanOrEqual(0.6)
    expect(rect.width / viewport.width).toBeLessThanOrEqual(0.7)
    expect(rect.height / viewport.height).toBeGreaterThan(0.92)
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(viewport.height)
    await capture(page, info, `${viewport.width}x${viewport.height}`)
  }
  await page.getByRole('button', { name: 'Pełny ekran' }).click()
  await expect(page.getByRole('button', { name: 'Wyjdź z pełnego ekranu' })).toBeVisible()
  expect(await page.evaluate(() => document.fullscreenElement?.matches('.room'))).toBe(true)
  await expect.poll(async () => (await world(page).boundingBox())?.width).toBe(1920)
  await expect(world(page)).toHaveAttribute('data-test-scene', 'original')
  await capture(page, info, 'fullscreen')
  await page.getByRole('button', { name: 'Wyjdź z pełnego ekranu' }).click()
  await expect(page.getByRole('button', { name: 'Pełny ekran' })).toBeVisible()
  await expect(world(page)).toHaveAttribute('data-test-scene', 'original')
})

test('reset cancels at both steps, rolls back failure, blocks an old tab and allows new progress', async ({ page, context }) => {
  await page.goto('/')
  await enterRoom(page)
  await walkToClothes(page)
  await buttonAlternative(page)
  await close(page)
  const before = await saveRecord(page)
  const stale = await context.newPage()
  await stale.goto('/')
  await resume(stale)
  await expect(stage(stale)).toHaveAttribute('data-x', '106')
  await page.bringToFront()

  await adultMenu(page)
  const reset = page.getByRole('button', { name: 'Zacznij od nowa', exact: true })
  await expect(page.getByRole('link', { name: 'Pobierz APK (Android)' })).toHaveAttribute('href', /frontend.yml\?query=branch%3Amain/)
  await reset.click()
  await page.getByRole('button', { name: 'Anuluj' }).click()
  expect(await saveRecord(page)).toEqual(before)
  await reset.click()
  await page.getByRole('button', { name: 'Dalej', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('odkryte koty, ich zaufanie')
  await page.keyboard.press('Escape')
  expect(await saveRecord(page)).toEqual(before)

  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value, key) {
      if (key === 'generation') throw new DOMException('Disk full', 'QuotaExceededError')
      return put.call(this, value, key)
    }
  })
  async function confirm() {
    await reset.click()
    await page.getByRole('button', { name: 'Dalej', exact: true }).click()
    await page.getByRole('button', { name: 'Usuń postęp i zacznij od nowa' }).click()
  }
  await confirm()
  await expect(page.getByText('Nie udało się zapisać nowej gry.', { exact: false })).toBeVisible()
  expect(await saveRecord(page)).toEqual(before)

  await page.reload()
  await page.getByText('Dla dorosłych', { exact: true }).click()
  await confirm()
  await expect(page.getByText('Dotknij podłogi', { exact: true })).toBeVisible()
  await expect(points(page)).toHaveText('0')
  await expect(stage(page)).toHaveAttribute('data-x', '106')
  const resetSave = await saveRecord(page)
  expect(resetSave).toMatchObject({
    profile: before.profile, completed: [], rewards: [], restored: [], trust: [], discovered: [],
    checkpoint: { location: 'bedroom', spawn: 'bedside' },
  })
  await stale.getByRole('button', { name: 'Pauza', exact: true }).click()
  await stale.getByRole('button', { name: 'Zmień postać' }).click()
  await stale.getByLabel('Pseudonim', { exact: true }).fill('Stary zapis')
  await stale.getByRole('button', { name: 'Wejdź do pokoju' }).click()
  await expect(stale.getByText('Gra została rozpoczęta od nowa w innej karcie.', { exact: false })).toBeVisible()
  expect(await saveRecord(stale)).toEqual(resetSave)
  await stale.close()

  await page.reload()
  await resume(page)
  await expect(points(page)).toHaveText('0')
  await walkToClothes(page)
  await buttonAlternative(page)
  await close(page)
  expect(await saveRecord(page)).toMatchObject({ rewards: before.rewards, profile: before.profile })
})

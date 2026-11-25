import { expect, test } from '@playwright/test'
import { enterRoom, saveRecord, stage, walkToClothes } from './roomHelpers'

test('Android bridge handling cancels an unfinished quest and freezes the canvas while inactive', async ({ page }) => {
  await page.addInitScript(() => {
    const listeners = new Map<string, { name: string; callback: (event: object) => void }>()
    let nextId = 0
    Object.assign(window, {
      androidBridge: {},
      Capacitor: {
        PluginHeaders: [{
          name: 'App',
          methods: [
            { name: 'addListener', rtype: 'callback' },
            { name: 'removeListener', rtype: 'promise' },
            { name: 'getState', rtype: 'promise' },
            { name: 'minimizeApp', rtype: 'promise' },
          ],
        }],
        nativeCallback(_plugin: string, _method: string, options: { eventName: string }, callback: (event: object) => void) {
          const id = String(nextId++)
          listeners.set(id, { name: options.eventName, callback })
          return id
        },
        async nativePromise(_plugin: string, method: string, options?: { callbackId: string }) {
          if (method === 'removeListener' && options) listeners.delete(options.callbackId)
          if (method === 'getState') return { isActive: true }
        },
      },
    })
    window.addEventListener('test-android', ((event: CustomEvent<{ name: string; data: object }>) => {
      for (const listener of listeners.values()) {
        if (listener.name === event.detail.name) listener.callback(event.detail.data)
      }
    }) as EventListener)
  })
  await page.goto('/')
  await enterRoom(page)
  const dispatch = (name: string, data: object = {}) => page.evaluate((detail) => {
    window.dispatchEvent(new CustomEvent('test-android', { detail }))
  }, { name, data })
  await walkToClothes(page)
  await dispatch('backButton')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect((await saveRecord(page)).completed).toEqual([])
  await dispatch('backButton')
  await expect(page.getByRole('dialog', { name: 'Pauza' })).toBeVisible()
  await dispatch('backButton')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await dispatch('appStateChange', { isActive: false })
  const elapsed = await stage(page).getAttribute('data-cat-elapsed')
  await page.keyboard.down('d')
  await stage(page).evaluate(async () => {
    for (let frame = 0; frame < 8; frame++) await new Promise(requestAnimationFrame)
  })
  const x = await stage(page).getAttribute('data-x')
  await expect(stage(page)).toHaveAttribute('data-cat-elapsed', elapsed!)
  await dispatch('appStateChange', { isActive: true })
  await expect(stage(page)).not.toHaveAttribute('data-cat-elapsed', elapsed!)
  await expect(stage(page)).toHaveAttribute('data-x', x!)
  await page.keyboard.up('d')
})

test('tablet view preserves usable controls and canvas proportions on rotation', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1200 })
  await page.goto('/')
  await enterRoom(page)
  for (const viewport of [{ width: 1920, height: 1200 }, { width: 960, height: 600 }, { width: 600, height: 960 }]) {
    await page.setViewportSize(viewport)
    const control = page.getByRole('button', { name: 'W górę' })
    await expect(control).toBeInViewport({ ratio: 1 })
    const target = (await control.boundingBox())!
    expect(target.width).toBeGreaterThanOrEqual(44)
    expect(target.height).toBeGreaterThanOrEqual(44)
    const canvas = (await stage(page).locator('canvas').boundingBox())!
    expect(canvas.width / canvas.height).toBeCloseTo(4 / 3, 2)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width)
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(viewport.height)
  }
  await expect(stage(page)).toHaveAttribute('data-x', '106')
  await walkToClothes(page)
  await page.setViewportSize({ width: 960, height: 600 })
  await expect(page.getByRole('dialog', { name: 'Rozrzucone ubrania' })).toBeInViewport({ ratio: 1 })
  await expect(page.getByRole('button', { name: 'Anuluj' })).toBeInViewport({ ratio: 1 })
})

test.describe('unsupported WebView diagnostic', () => {
  test.use({ userAgent: 'Mozilla/5.0 (Linux; Android 8.0; wv) Chrome/60.0.3112.107 Mobile Safari/537.36' })

  test('the Polish diagnostic stays visible when application scripts cannot load', async ({ page }) => {
    await page.route('**/assets/*.js', (route) => route.abort())
    await page.goto('/')
    await expect(page.getByText('Jeśli gra się nie otwiera', { exact: false })).toBeVisible()
    await expect(page.getByLabel('Pseudonim')).toHaveCount(0)
  })

  test('the Chromium 60 gate prevents gameplay even when a new browser parses the bundle', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).not.toHaveAttribute('data-compatible')
    await expect(page.getByText('Jeśli gra się nie otwiera', { exact: false })).toBeVisible()
    await expect(page.getByLabel('Pseudonim')).toHaveCount(0)
  })
})

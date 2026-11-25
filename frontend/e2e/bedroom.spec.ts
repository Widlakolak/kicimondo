import { expect, test, type Page } from '@playwright/test'

const start = 'Wejdź do pokoju'
const roomTitle = 'Twój pokój'
const nickname = 'Żółwik'
const clothes = 'Rozrzucone ubrania'
const profileKey = 'kicimondo.profile'
const stage = (page: Page) => page.getByRole('img', { name: 'Widok pokoju z góry' }).locator('.stage')
const position = async (page: Page, axis: 'x' | 'y') => Number(await stage(page).getAttribute(`data-${axis}`))

async function enterRoom(page: Page) {
  await page.getByLabel('Pseudonim', { exact: true }).fill(nickname)
  await page.getByRole('button', { name: start }).click()
  await expect(page.getByRole('heading', { name: roomTitle })).toBeVisible()
  await expect(stage(page)).toHaveAttribute('data-x', '106')
  await expect(stage(page).locator('canvas')).toBeVisible()
}

async function holdKey(page: Page, key: string, until: () => Promise<void>) {
  await page.keyboard.down(key)
  try {
    await until()
  } finally {
    await page.keyboard.up(key)
  }
}

async function reach(page: Page, axis: 'x' | 'y', target: number, direction: 1 | -1) {
  await page.waitForFunction(({ axis, target, direction }) => {
    const value = Number(document.querySelector<HTMLElement>('.stage')?.dataset[axis])
    return direction * value >= direction * target
  }, { axis, target, direction }, { timeout: 5000 })
}

async function expectStill(page: Page, axis: 'x' | 'y') {
  const samples = await stage(page).evaluate(async (element, key) => {
    const coordinates = [element.getAttribute(`data-${key}`)]
    for (let frame = 0; frame < 8; frame++) {
      await new Promise(requestAnimationFrame)
      coordinates.push(element.getAttribute(`data-${key}`))
    }
    return coordinates
  }, axis)
  expect(new Set(samples).size).toBe(1)
}

test('chooses and edits an avatar, validates the nickname, and keeps the saved profile on reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Pseudonim', { exact: true }).fill('   ')
  await page.getByRole('button', { name: start }).click()
  await expect(page.getByRole('alert')).toHaveText('Wpisz pseudonim.')
  await page.getByLabel('Pseudonim', { exact: true }).fill('ą'.repeat(21))
  await page.getByRole('button', { name: start }).click()
  await expect(page.getByRole('alert')).toHaveText('Pseudonim może mieć najwyżej 20 znaków.')
  await page.getByRole('radio', { name: 'Dziewczynka' }).check()
  await enterRoom(page)

  await page.reload()
  await expect(page.getByText(nickname, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Wróć do pokoju' }).click()
  await expect(stage(page)).toHaveAttribute('data-x', '106')
  await page.getByRole('button', { name: 'Zmień postać' }).click()
  await expect(page.getByRole('radio', { name: 'Dziewczynka' })).toBeChecked()
  await expect(page.getByLabel('Pseudonim', { exact: true })).toHaveValue(nickname)
  await page.getByRole('radio', { name: 'Chłopiec' }).check()
  await page.getByRole('button', { name: start }).click()
  await expect(stage(page)).toHaveAttribute('data-x', '106')
  await expect(stage(page).locator('canvas')).toHaveCount(1)
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), profileKey))
    .toEqual({ schemaVersion: 1, avatar: 'boy', nickname })
})

test('keyboard movement stops at furniture and walls and nearby interactions require deliberate input', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await enterRoom(page)
  const interact = page.getByRole('button', { name: 'Sprawdź' })
  await expect(interact).toBeDisabled()
  await page.keyboard.press('e')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await holdKey(page, 'ArrowLeft', async () => {
    await reach(page, 'x', 92, -1)
    await expect.poll(async () => {
      try {
        await expectStill(page, 'x')
        return true
      } catch {
        return false
      }
    }).toBe(true)
    expect(await position(page, 'x')).toBeGreaterThanOrEqual(89)
  })
  await holdKey(page, 'd', () => reach(page, 'x', 183, 1))
  await expectStill(page, 'x')
  await holdKey(page, 's', () => reach(page, 'y', 144, 1))
  await expect(page.getByText('Obok leżą rozrzucone ubrania.')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.keyboard.press('e')
  const modal = page.getByRole('dialog', { name: clothes })
  await expect(modal).toBeVisible()
  await expect(modal).toContainText('Zadanie ze sprzątaniem będzie dostępne w kolejnym etapie gry.')
  await holdKey(page, 'ArrowDown', () => expectStill(page, 'y'))
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
  await expect(page.getByRole('heading', { name: roomTitle })).toBeFocused()
  await expect(interact).toBeEnabled()

  await holdKey(page, 'ArrowUp', async () => {
    await reach(page, 'y', 131, -1)
    await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    await expectStill(page, 'y')
  })
  await holdKey(page, 'ArrowLeft', () => reach(page, 'x', 164, -1))
  await holdKey(page, 'ArrowUp', async () => {
    await expect(page.getByText('Drzwi są zamknięte.', { exact: true })).toBeVisible()
    await reach(page, 'y', 38, -1)
  })
  expect(await position(page, 'y')).toBeGreaterThanOrEqual(35)
  await interact.click()
  await expect(page.getByRole('dialog', { name: 'Zamknięte drzwi' })).toBeVisible()
  await page.getByRole('button', { name: 'Zamknij' }).click()
  await expect(interact).toBeFocused()
  expect(errors).toEqual([])
})

test.describe('touch layout and movement', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 740 } })

  test('touch hold, cancel, release, and interaction work in the room', async ({ page, context }) => {
    await page.goto('/')
    await enterRoom(page)
    const device = await context.newCDPSession(page)
    async function touch(label: string, end: 'touchEnd' | 'touchCancel', until: () => Promise<void>) {
      const button = page.getByRole('button', { name: label })
      await button.scrollIntoViewIfNeeded()
      const box = (await button.boundingBox())!
      await device.send('Input.dispatchTouchEvent', {
        type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
      })
      try {
        await until()
      } finally {
        await device.send('Input.dispatchTouchEvent', { type: end, touchPoints: [] })
      }
    }

    await touch('W prawo', 'touchCancel', () => reach(page, 'x', 183, 1))
    await expectStill(page, 'x')
    await touch('W dół', 'touchEnd', () => reach(page, 'y', 144, 1))
    await expect(page.getByText('Obok leżą rozrzucone ubrania.')).toBeVisible()
    await expectStill(page, 'y')
    await page.getByRole('button', { name: 'Sprawdź' }).tap()
    await expect(page.getByRole('dialog', { name: clothes })).toBeVisible()
    await page.getByRole('button', { name: 'Zamknij' }).tap()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await touch('W prawo', 'touchEnd', async () => {
      await reach(page, 'x', 205, 1)
      await page.setViewportSize({ width: 320, height: 640 })
      await expectStill(page, 'x')
    })

    for (const viewport of [{ width: 320, height: 640 }, { width: 740, height: 390 }]) {
      await page.setViewportSize(viewport)
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width)
      const canvas = (await stage(page).locator('canvas').boundingBox())!
      expect(canvas.width / canvas.height).toBeCloseTo(4 / 3, 2)
      await expect(page.getByRole('button', { name: 'W lewo' })).toBeVisible()
    }
  })
})

test('recovers from malformed storage and can play when writing is blocked', async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, '{broken')
    Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError') }
  }, profileKey)
  await page.goto('/')
  await expect(page.getByRole('status')).toContainText('Nie udało się odczytać zapisanego profilu.')
  await enterRoom(page)
  await expect(page.getByText('Zapis na tym urządzeniu jest niedostępny.', { exact: false })).toBeVisible()
  expect(await page.evaluate((key) => localStorage.getItem(key), profileKey)).toBe('{broken')
})

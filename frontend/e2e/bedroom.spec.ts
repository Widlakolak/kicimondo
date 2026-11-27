import { expect, test, type Page } from '@playwright/test'
import { challenges } from '../src/content/pack'
import { enterRoom, holdKey, nickname, pixelAt, reach, roomTitle, saveRecord, stage, start, walkToClothes, buttonAlternative } from './roomHelpers'

const clothes = 'Rozrzucone ubrania'
const profileKey = 'kicimondo.profile'
const board = (page: Page) => page.getByRole('img', { name: 'Ścieżka od startu do mety' })
const path = challenges['clothes-to-basket'].path
const continueButton = 'Wróć do gry'
const rewardTitle = 'Brawo!'
const position = async (page: Page, axis: 'x' | 'y') => Number(await stage(page).getAttribute(`data-${axis}`))

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

async function traceCoordinates(page: Page) {
  const box = (await board(page).boundingBox())!
  return path.map(({ x, y }) => ({ x: box.x + x * box.width, y: box.y + y * box.height }))
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
  await page.getByRole('button', { name: continueButton }).click()
  await expect(stage(page)).toHaveAttribute('data-x', '106')
  await page.getByRole('button', { name: 'Pauza', exact: true }).click()
  await page.getByRole('button', { name: 'Zmień postać' }).click()
  await expect(page.getByRole('radio', { name: 'Dziewczynka' })).toBeChecked()
  await expect(page.getByLabel('Pseudonim', { exact: true })).toHaveValue(nickname)
  await page.getByRole('radio', { name: 'Chłopiec' }).check()
  await page.getByRole('button', { name: start }).click()
  await expect(stage(page)).toHaveAttribute('data-x', '106')
  await expect(stage(page).locator('canvas')).toHaveCount(1)
  expect((await saveRecord(page)).profile).toEqual({ avatar: 'boy', nickname })
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
  await expect(board(page)).toBeVisible()
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
  await expect(page.getByRole('dialog', { name: 'Zamknięte drzwi' })).toContainText('Brakuje 1 gwiazdki.')
  await page.getByRole('button', { name: 'Zamknij' }).click()
  await expect(interact).toBeFocused()
  expect(errors).toEqual([])
})

test.describe('touch layout and movement', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 740, height: 390 } })

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
    await board(page).scrollIntoViewIfNeeded()
    const trace = async (stop: number, finish: 'touchEnd' | 'touchCancel') => {
      const coordinates = await traceCoordinates(page)
      await device.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [coordinates[0]] })
      for (const point of coordinates.slice(1, stop)) {
        await device.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] })
      }
      await device.send('Input.dispatchTouchEvent', { type: finish, touchPoints: [] })
    }
    await trace(5, 'touchCancel')
    await expect(board(page)).toHaveAttribute('data-progress', /^[1-9]\d*$/)
    await expect(page.getByRole('dialog', { name: clothes })).toBeVisible()
    await page.getByRole('button', { name: 'Od początku' }).tap()
    await trace(path.length, 'touchEnd')
    await expect(page.getByRole('dialog', { name: rewardTitle })).toBeVisible()
    await page.getByRole('button', { name: 'Zamknij' }).tap()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('.points strong').filter({ hasText: /^1$/ })).toBeVisible()

    await touch('W prawo', 'touchEnd', async () => {
      await reach(page, 'x', 205, 1)
      await page.setViewportSize({ width: 320, height: 640 })
      await expectStill(page, 'x')
    })

    for (const viewport of [{ width: 320, height: 640 }, { width: 740, height: 390 }]) {
      await page.setViewportSize(viewport)
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width)
      if (viewport.width < viewport.height) {
        await expect(page.getByText('Obróć ekran')).toBeVisible()
        await expect(page.getByRole('button', { name: 'W lewo' })).toBeHidden()
      } else {
        await expect(page.getByRole('button', { name: 'W lewo' })).toBeVisible()
        await expect(page.getByText('Obróć ekran')).toHaveCount(0)
      }
    }
  })
})


test('migrates the Stage 01 profile without replacing it and treats a malformed legacy profile safely', async ({ page, context }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, '{"schemaVersion":1,"avatar":"girl","nickname":"Żółwik"}')
  }, profileKey)
  await page.goto('/')
  await expect(page.getByText(nickname, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: continueButton })).toBeVisible()
  expect((await saveRecord(page)).profile).toEqual({ avatar: 'girl', nickname })

  const malformed = await context.browser()!.newPage()
  try {
    await malformed.addInitScript((key) => localStorage.setItem(key, '{broken'), profileKey)
    await malformed.goto(new URL('/', page.url()).href)
    await expect(malformed.getByText('Nie udało się odczytać dawnego profilu.', { exact: false })).toBeVisible()
    await enterRoom(malformed)
    expect((await saveRecord(malformed)).profile.nickname).toBe(nickname)
  } finally {
    await malformed.close()
  }
})

test('mouse tracing rejects shortcuts, resumes after lifting and removes the clothes on success', async ({ page }) => {
  await page.goto('/')
  await enterRoom(page)
  const clothesBefore = await pixelAt(page, 181, 150)
  const doorBefore = await pixelAt(page, 160, 20)
  await walkToClothes(page)
  let coordinates = await traceCoordinates(page)
  const end = coordinates.at(-1)!
  await page.mouse.click(end.x, end.y)
  await expect(page.getByText('Zacznij od pola Start.')).toBeVisible()
  await page.getByRole('button', { name: 'Podpowiedź' }).click()
  await expect(page.getByText('Idź wzdłuż przerywanej linii.', { exact: false })).toBeVisible()
  coordinates = await traceCoordinates(page)
  await page.mouse.move(coordinates[0].x, coordinates[0].y)
  await page.mouse.down()
  await page.mouse.move(coordinates.at(-1)!.x, coordinates.at(-1)!.y)
  await expect(page.getByText('Linia zeszła ze ścieżki.', { exact: false })).toBeVisible()
  await page.mouse.up()
  await expect(page.getByRole('dialog', { name: clothes })).toBeVisible()
  expect((await saveRecord(page)).rewards).toEqual([])
  await page.getByRole('button', { name: 'Od początku' }).click()
  coordinates = await traceCoordinates(page)
  await page.mouse.move(coordinates[0].x, coordinates[0].y)
  await page.mouse.down()
  for (const point of coordinates.slice(1, 5)) await page.mouse.move(point.x, point.y)
  await page.mouse.up()
  await expect(page.getByText('Kontynuuj od zielonej kropki.')).toBeVisible()
  await page.setViewportSize({ width: 960, height: 740 })
  coordinates = await traceCoordinates(page)
  const checkpoint = (await board(page).locator('.trace-checkpoint').boundingBox())!
  await page.mouse.move(checkpoint.x + checkpoint.width / 2, checkpoint.y + checkpoint.height / 2)
  await page.mouse.down()
  for (const point of coordinates.slice(5)) await page.mouse.move(point.x, point.y)
  await page.mouse.up()

  await expect(page.getByRole('dialog', { name: rewardTitle })).toContainText('+1')
  await page.getByRole('button', { name: 'Zamknij' }).click()
  await expect(page.getByRole('button', { name: 'Sprawdź' })).toBeDisabled()
  await expect.poll(() => pixelAt(page, 181, 150)).not.toEqual(clothesBefore)
  await expect.poll(() => pixelAt(page, 160, 20)).not.toEqual(doorBefore)
  expect((await saveRecord(page)).rewards).toEqual([{ id: 'bedroom-clean-clothes-first', points: 1 }])
})

test('keyboard alternative awards once, opens the path upstairs, and keeps progress after reload and return', async ({ page }) => {
  await page.goto('/')
  await enterRoom(page)
  await walkToClothes(page)
  await buttonAlternative(page)
  await page.getByRole('button', { name: 'Zamknij' }).click()
  await expect(page.locator('.points strong').filter({ hasText: /^1$/ })).toBeVisible()
  await page.keyboard.press('e')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await holdKey(page, 'a', () => reach(page, 'x', 162, -1))
  await holdKey(page, 'w', () => reach(page, 'y', 52, -1))
  await expect(page.getByText('Drzwi są otwarte.', { exact: false })).toBeVisible()
  await page.keyboard.press('e')
  await expect(page.getByRole('heading', { name: 'Półpiętro' })).toBeVisible()
  await expect(stage(page)).toHaveAttribute('data-y', '72')
  await page.reload()
  await page.getByRole('button', { name: continueButton }).click()
  await expect(page.getByRole('heading', { name: 'Półpiętro' })).toBeVisible()
  await expect(stage(page)).toHaveAttribute('data-y', '72')
  await expect(page.locator('.points strong').filter({ hasText: /^1$/ })).toBeVisible()
  await holdKey(page, 'w', () => reach(page, 'y', 52, -1))
  await expect(page.getByText('Tędy wrócisz do pokoju.')).toBeVisible()
  await page.getByRole('button', { name: 'Sprawdź' }).click()
  await expect(page.getByRole('heading', { name: roomTitle })).toBeVisible()
  await expect(stage(page)).toHaveAttribute('data-y', '69')
  await holdKey(page, 'd', () => reach(page, 'x', 183, 1))
  await holdKey(page, 's', () => reach(page, 'y', 144, 1))
  await expect(page.getByRole('button', { name: 'Sprawdź' })).toBeDisabled()
  expect(await saveRecord(page)).toMatchObject({
    checkpoint: { location: 'bedroom', spawn: 'from-landing' },
    completed: ['bedroom-clean-clothes'],
    rewards: [{ id: 'bedroom-clean-clothes-first', points: 1 }],
    hidden: [{ location: 'bedroom', object: 'scattered-clothes' }],
  })
})

test('shows a failed-save notice and never persists a partial reward', async ({ page }) => {
  await page.goto('/')
  await enterRoom(page)
  await walkToClothes(page)
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value, key) {
      if (key === 'current') throw new DOMException('Disk full', 'QuotaExceededError')
      return put.call(this, value, key)
    }
  })
  await buttonAlternative(page)
  await expect(page.getByRole('dialog', { name: rewardTitle })).toContainText('Nie można zapisać gry')
  expect(await saveRecord(page)).toMatchObject({ completed: [], rewards: [], hidden: [] })
  await page.reload()
  await page.getByRole('button', { name: continueButton }).click()
  await expect(page.locator('.points strong').filter({ hasText: /^0$/ })).toBeVisible()
})

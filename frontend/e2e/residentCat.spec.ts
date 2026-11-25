import { expect, test, type Page } from '@playwright/test'
import { enterRoom, holdKey, nickname, pixelAt, reach, roomTitle, saveRecord, stage, matchBed, fillWater } from './roomHelpers'

const interact = (page: Page) => page.getByRole('button', { name: 'Sprawdź' })
const trust = (page: Page, count: number) => page.getByText(`Zaufanie · Bursztynek: ${count}`, { exact: true })

async function catClock(page: Page) {
  return stage(page).evaluate(async (element: HTMLElement) => {
    const first = element.dataset.catElapsed
    for (let frame = 0; frame < 8; frame++) await new Promise(requestAnimationFrame)
    return [first, element.dataset.catElapsed]
  })
}

test('cat gives consent, pauses safely and records only its first accepted greeting', async ({ page }) => {
  await page.goto('/')
  await enterRoom(page)
  await expect(stage(page)).toHaveAttribute('data-cat-activity', 'idle')
  await holdKey(page, 'd', () => reach(page, 'x', 122, 1))
  await holdKey(page, 's', () => reach(page, 'y', 186, 1))
  await expect(page.getByText('Bursztynek jest gotowy', { exact: false })).toBeVisible()
  await interact(page).click()
  await expect(stage(page)).toHaveAttribute('data-cat-activity', 'petting')
  await expect(trust(page, 1)).toBeVisible()
  await page.keyboard.press('e')
  await expect(page.getByText('0 PS', { exact: true })).toBeVisible()
  await expect(page.getByText('Daj mu teraz przestrzeń.', { exact: false })).toBeVisible()
  await expect(interact(page)).toBeDisabled()
  await page.keyboard.press('e')
  expect((await saveRecord(page)).trust).toEqual([{ cat: 'amber', id: 'first-pet' }])

  await page.getByRole('button', { name: 'Pauza', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Pauza' })).toBeVisible()
  const [before, after] = await catClock(page)
  expect(after).toBe(before)
  await page.getByRole('button', { name: 'Wznów grę' }).click()
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  const [background, later] = await catClock(page)
  expect(later).toBe(background)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(async () => {
    const [first, last] = await catClock(page)
    return first === last
  }).toBe(false)
  await page.reload()
  await page.getByRole('button', { name: 'Wróć do gry' }).click()
  await expect(trust(page, 1)).toBeVisible()
})

test.describe('touch matching', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 740 } })

  test('the bed works as the first quest and a learning overlay stops the cat clock', async ({ page }) => {
    await page.goto('/')
    await enterRoom(page)
    await holdKey(page, 'd', () => reach(page, 'x', 255, 1))
    await holdKey(page, 's', () => reach(page, 'y', 182, 1))
    await expect(page.getByText('Obok jest legowisko do przygotowania.')).toBeVisible()
    const worn = await pixelAt(page, 266, 184)
    await interact(page).tap()
    await expect(page.getByRole('dialog', { name: 'Legowisko dla kota' })).toBeVisible()
    const [before, after] = await catClock(page)
    expect(after).toBe(before)
    await matchBed(page, (control) => control.tap())
    await expect.poll(() => pixelAt(page, 266, 184)).not.toEqual(worn)
    await expect(page.getByText('1 PS', { exact: true })).toBeVisible()
    await expect(trust(page, 1)).toBeVisible()
    expect((await saveRecord(page)).completed).toEqual(['bedroom-prepare-cat-bed'])
    await expect(stage(page).and(page.locator('[data-cat-x="255"]'))).toHaveAttribute('data-cat-activity', 'resting', { timeout: 15000 })
  })
})

test('migrates a Stage 02 landing save, restores both attractions, and preserves all three quests', async ({ page }) => {
  test.setTimeout(65000)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Witaj w Kicimondo!' })).toBeVisible()
  await page.evaluate((nickname) => new Promise<void>((resolve, reject) => {
    const opening = indexedDB.open('kicimondo')
    opening.onerror = () => reject(opening.error)
    opening.onsuccess = () => {
      const db = opening.result
      const transaction = db.transaction('saves', 'readwrite')
      transaction.objectStore('saves').put({
        schemaVersion: 1, contentVersion: 1, profile: { nickname, avatar: 'girl' },
        checkpoint: { location: 'landing', spawn: 'from-bedroom' },
        completed: ['bedroom-clean-clothes'],
        rewards: [{ id: 'bedroom-clean-clothes-first', points: 1 }],
        hidden: [{ location: 'bedroom', object: 'scattered-clothes' }],
      }, 'current')
      transaction.oncomplete = () => { db.close(); resolve() }
      transaction.onabort = () => { db.close(); reject(transaction.error) }
    }
  }), nickname)
  await page.reload()
  await page.getByRole('button', { name: 'Wróć do gry' }).click()
  await expect(page.getByRole('heading', { name: 'Półpiętro' })).toBeVisible()
  await expect(stage(page)).toHaveAttribute('data-y', '72')
  await expect(page.getByText('1 PS', { exact: true })).toBeVisible()
  await holdKey(page, 'w', () => reach(page, 'y', 52, -1))
  await interact(page).click()
  await expect(page.getByRole('heading', { name: roomTitle })).toBeVisible()
  await expect(stage(page)).toHaveAttribute('data-y', '69')
  await holdKey(page, 'd', () => reach(page, 'x', 208, 1))
  await holdKey(page, 's', () => reach(page, 'y', 191, 1))
  await expect(page.getByText('Obok stoi pusta miska na wodę.')).toBeVisible()
  await interact(page).click()
  const empty = await pixelAt(page, 216, 196)
  await fillWater(page)
  await expect.poll(() => pixelAt(page, 216, 196)).not.toEqual(empty)
  await expect(page.getByText('2 PS', { exact: true })).toBeVisible()
  await expect(stage(page)).toHaveAttribute('data-cat-activity', 'drinking', { timeout: 15000 })
  await holdKey(page, 'd', () => reach(page, 'x', 255, 1))
  await interact(page).click()
  await matchBed(page)
  await expect(page.getByText('3 PS', { exact: true })).toBeVisible()
  await expect(trust(page, 2)).toBeVisible()
  await page.keyboard.press('e')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Wróć do gry' }).click()
  await expect(page.getByText('3 PS', { exact: true })).toBeVisible()
  await expect(trust(page, 2)).toBeVisible()
  const save = await saveRecord(page)
  expect(save).toMatchObject({
    schemaVersion: 2, contentVersion: 3, profile: { nickname, avatar: 'girl' },
    completed: ['bedroom-clean-clothes', 'bedroom-fill-water-bowl', 'bedroom-prepare-cat-bed'],
    hidden: [{ location: 'bedroom', object: 'scattered-clothes' }],
    restored: [{ location: 'bedroom', object: 'water-bowl' }, { location: 'bedroom', object: 'cat-bed' }],
  })
  expect(save.rewards.map(({ points }) => points)).toEqual([1, 1, 1])
})

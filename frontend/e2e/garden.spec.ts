import { expect, test, type Page } from '@playwright/test'
import { challenges, type MatchChallenge, type MathChallenge, type SortChallenge } from '../src/content/pack'
import { mathQuestions } from '../src/core/education'
import { pl } from '../src/i18n/pl'
import { fromHouse, stage05Record } from './gardenFixtures'
import { buttonAlternative, expectRoomReady, holdKey, pixelAt, reach, saveRecord, stage } from './roomHelpers'

test.use({ viewport: { width: 960, height: 600 }, isMobile: true, hasTouch: true })

const reward = 'Brawo!'
const points = async (page: Page, value: number) => expect(page.locator('.points strong').filter({ hasText: new RegExp('^' + value + '$') })).toBeVisible()

async function writeSave(page: Page, value: unknown) {
  await page.getByLabel('Pseudonim', { exact: true }).waitFor()
  await page.evaluate((save) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('kicimondo')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction('saves', 'readwrite')
      transaction.objectStore('saves').put(save, 'current')
      transaction.oncomplete = () => { db.close(); resolve() }
      transaction.onabort = () => { db.close(); reject(transaction.error) }
    }
  }), value)
}

async function room(page: Page, name: string) {
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  await expect(stage(page)).toHaveAttribute('data-x', /\d+/)
}

async function resume(page: Page, name: string) {
  await page.reload()
  await page.getByRole('button', { name: 'Wróć do gry' }).tap()
  await room(page, name)
}

async function walk(page: Page, x: number | null, y: number | null) {
  for (const [axis, target, lower, higher] of [['x', x, 'a', 'd'], ['y', y, 'w', 's']] as const) {
    if (target === null) continue
    const current = Number(await stage(page).getAttribute(`data-${axis}`))
    if (Math.abs(current - target) <= 3) continue
    await holdKey(page, current < target ? higher : lower,
      () => reach(page, axis, target, current < target ? 1 : -1))
  }
}

async function interact(page: Page) {
  const button = page.getByRole('button', { name: 'Sprawdź' })
  await expect(button).toBeEnabled()
  await button.tap()
}

async function close(page: Page, title: string) {
  await page.getByRole('dialog', { name: title }).getByRole('button', { name: 'Zamknij' }).tap()
  await expectRoomReady(page)
}

async function match(page: Page, challenge: MatchChallenge) {
  const dialog = page.getByRole('dialog', { name: pl.challenges[challenge.text].title })
  for (const { word, picture } of challenge.pairs) {
    await dialog.getByRole('button', { name: pl.match.words[word], exact: true }).tap()
    await dialog.getByRole('button', { name: pl.match.pictures[picture], exact: true }).tap()
  }
  await close(page, reward)
}

async function math(page: Page, challenge: MathChallenge) {
  const dialog = page.getByRole('dialog', { name: pl.challenges[challenge.text].title })
  for (const [i, question] of mathQuestions(challenge).entries()) {
    await dialog.getByRole('button', { name: String(question.answer), exact: true }).tap()
    if (i < challenge.operations.length - 1) await dialog.getByRole('button', { name: pl.math.next }).tap()
  }
  await close(page, reward)
}

async function sort(page: Page, challenge: SortChallenge) {
  const dialog = page.getByRole('dialog', { name: pl.challenges[challenge.text].title })
  const order = challenge.mode === 'sequence' ? challenge.order : challenge.items.map(({ id }) => id)
  for (const id of order) {
    await dialog.getByRole('button', { name: pl.sort.items[id], exact: true }).tap()
    if (challenge.mode === 'categories') {
      await dialog.getByRole('button', { name: pl.sort.groups[challenge.assignments[id]!], exact: true }).tap()
    }
  }
  await close(page, reward)
}

test('plays the garden offline, encounters all visitors and comes home with 25 PS', async ({ page, context }) => {
  test.setTimeout(130000)
  await page.goto('/')
  await expect(page.getByText(pl.offline.ready)).toBeVisible()
  await writeSave(page, fromHouse())
  await context.setOffline(true)
  await resume(page, 'Hol na parterze')

  // The arrival from the living room is on the right of the stairs.
  await walk(page, null, 119)
  await walk(page, 160, 194)
  await interact(page)
  await expect(page.getByRole('dialog', { name: 'Brama do ogrodu' })).toContainText('Brakuje 1 gwiazdki.')
  await close(page, 'Brama do ogrodu')
  await walk(page, null, 109)
  await walk(page, 256, 52)
  await interact(page)
  await room(page, 'Salon')
  await walk(page, 256, null)
  await interact(page)
  await match(page, challenges['match-living-items'])
  await walk(page, 160, 194)
  await interact(page)
  await room(page, 'Hol na parterze')
  await walk(page, null, 120)
  await walk(page, 160, 194)
  await expect(page.getByText('Brama jest otwarta. Możesz wejść do ogrodu.')).toBeVisible()
  await interact(page)
  await room(page, 'Ogród')
  await points(page, 16)
  await expect(stage(page)).toHaveAttribute('data-visitors', '')

  await walk(page, null, 89)
  await walk(page, 50, null)
  const empty = await pixelAt(page, 50, 54)
  await interact(page)
  await math(page, challenges['fill-garden-water'])
  await expect.poll(() => pixelAt(page, 50, 54)).not.toEqual(empty)
  await expect(stage(page)).toHaveAttribute('data-visitors', '')

  await walk(page, 120, null)
  await interact(page)
  await match(page, challenges['prepare-sheltered-bed'])
  await expect(stage(page)).toHaveAttribute('data-visitors', 'puszek')
  expect((await saveRecord(page)).discovered).toEqual(['amber'])

  await walk(page, 200, null)
  await interact(page)
  await math(page, challenges['restore-scratching-post'])
  await walk(page, 270, null)
  await interact(page)
  await buttonAlternative(page)
  await close(page, reward)

  await walk(page, null, 153)
  await walk(page, 50, null)
  await interact(page)
  await sort(page, challenges['sort-garden-toys'])
  await walk(page, 120, null)
  await interact(page)
  await sort(page, challenges['order-platform-boards'])
  await walk(page, 200, null)
  await interact(page)
  await match(page, challenges['prepare-garden-shelter'])
  await walk(page, 270, null)
  await interact(page)
  await math(page, challenges['count-garden-flowers'])
  await points(page, 24)

  // Restart in the restored habitat. The fourth visitor must join without another reload or transition.
  await resume(page, 'Ogród')
  await expect(stage(page)).toHaveAttribute('data-visitors', 'puszek latka cien')
  await walk(page, null, 121)
  for (const x of [76, 132, 188, 244]) await walk(page, x, null)
  await expect(stage(page)).toHaveAttribute('data-visitors', /migotka/, { timeout: 13000 })
  await expect.poll(async () => (await saveRecord(page)).discovered.sort()).toEqual([
    'amber', 'cien', 'latka', 'migotka', 'puszek',
  ])
  await expect(page.getByText(/Migotka jest gotowa/)).toBeVisible()
  await interact(page)
  await expect(page.getByText('Głaszczesz kota: Migotka.')).toBeVisible()
  await page.keyboard.press('e')
  await expect.poll(async () => (await saveRecord(page)).trust.filter(({ cat }) => cat === 'migotka')).toEqual([
    { cat: 'migotka', id: 'habitat-ready' }, { cat: 'migotka', id: 'first-pet' },
  ])
  await points(page, 24)

  await page.getByRole('button', { name: 'Kicipedia' }).tap()
  const collection = page.getByRole('dialog', { name: 'Kicipedia' })
  await expect(collection.getByRole('button', { name: 'Migotka' })).toBeVisible()
  await collection.getByRole('button', { name: 'Migotka' }).tap()
  await expect(collection).toContainText('Zaufanie: 2')
  await expect(collection).toContainText('platforma na drzewie')
  await page.setViewportSize({ width: 600, height: 960 })
  await expect(collection.getByRole('button', { name: 'Wstecz' })).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(600)
  await page.setViewportSize({ width: 960, height: 600 })
  await page.keyboard.press('Escape')
  await expect(collection.getByRole('button', { name: 'Migotka' })).toBeVisible()
  await close(page, 'Kicipedia')
  const persisted = await saveRecord(page)
  await resume(page, 'Ogród')
  expect(await saveRecord(page)).toEqual(persisted)

  await walk(page, 160, 199)
  await interact(page)
  await room(page, 'Hol na parterze')
  await walk(page, 160, 87)
  await interact(page)
  await room(page, 'Półpiętro')
  await walk(page, null, 73)
  await walk(page, 160, 52)
  await interact(page)
  await room(page, 'Twój pokój')
  await walk(page, null, 93)
  await walk(page, 255, null)
  await interact(page)
  await match(page, challenges['read-desk-words'])
  await points(page, 25)
  await expect(stage(page)).toHaveAttribute('data-quests', 'sock-tray')
  await expect(stage(page)).not.toHaveAttribute('data-exit', /.+/)
  const finished = await saveRecord(page)
  expect(new Set(finished.rewards.map(({ id }) => id)).size).toBe(25)
  expect(finished.restored.filter(({ location }) => location === 'garden')).toHaveLength(8)
})

test('restores an old Stage 05 house save and its resident collection entry', async ({ page }) => {
  await page.goto('/')
  await writeSave(page, stage05Record())
  await resume(page, 'Hol na parterze')
  await points(page, 12)
  await page.getByRole('button', { name: 'Pauza', exact: true }).tap()
  await page.getByRole('dialog', { name: 'Pauza' }).getByRole('button', { name: 'Kicipedia' }).tap()
  const collection = page.getByRole('dialog', { name: 'Kicipedia' })
  await expect(collection.getByText('Nieznany kot', { exact: true })).toHaveCount(5)
  await expect(collection).toContainText('osłonięte legowisko')
  await collection.getByRole('button', { name: 'Bursztynek' }).tap()
  await expect(collection).toContainText('Ciekawski domownik')
  await expect(collection).toContainText('Zaufanie: 3')
})

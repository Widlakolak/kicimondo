import { expect, test, type Page } from '@playwright/test'
import { challenges } from '../src/content/pack'
import { mathQuestions } from '../src/core/education'
import { pl } from '../src/i18n/pl'
import {
  buttonAlternative, enterRoom, expectRoomReady, fillWater, holdKey, matchBed, pixelAt,
  reach, saveRecord, stage, walkToClothes,
} from './roomHelpers'

test.use({ hasTouch: true, isMobile: true, viewport: { width: 960, height: 600 } })

async function walk(page: Page, x: number | null, y: number | null) {
  for (const [axis, target, less, more] of [['x', x, 'a', 'd'], ['y', y, 'w', 's']] as const) {
    if (target === null) continue
    const current = Number(await stage(page).getAttribute(`data-${axis}`))
    if (Math.abs(target - current) > 3) {
      await holdKey(page, current < target ? more : less, () => reach(page, axis, target, current < target ? 1 : -1))
    }
  }
}

async function interact(page: Page) {
  const button = page.getByRole('button', { name: 'Sprawdź' })
  await expect(button).toBeEnabled()
  await button.tap()
}

async function room(page: Page, title: string) {
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
  await expect(stage(page)).toHaveAttribute('data-x', /\d+/)
}

async function close(page: Page, title: string, button = 'Zamknij') {
  await page.getByRole('dialog', { name: title }).getByRole('button', { name: button }).tap()
  await expectRoomReady(page)
}

const reward = 'Brawo!'
const points = (page: Page, value: number) => expect(page.locator('.points strong').filter({ hasText: new RegExp('^' + value + '$') })).toBeVisible()

async function match(page: Page, challenge: (typeof challenges)['pack-school-bag']) {
  const dialog = page.getByRole('dialog', { name: pl.challenges[challenge.text].title })
  for (const { word, picture } of challenge.pairs) {
    await dialog.getByRole('button', { name: pl.match.words[word], exact: true }).tap()
    await dialog.getByRole('button', { name: pl.match.pictures[picture], exact: true }).tap()
  }
  await close(page, reward)
}

async function math(page: Page, challenge: (typeof challenges)['count-school-supplies'] | (typeof challenges)['count-fruit']) {
  const dialog = page.getByRole('dialog', { name: pl.challenges[challenge.text].title })
  const questions = mathQuestions(challenge)
  for (const [index, { answer }] of questions.entries()) {
    await dialog.getByRole('button', { name: String(answer), exact: true }).tap()
    if (index < questions.length - 1) await dialog.getByRole('button', { name: pl.math.next }).tap()
  }
  await close(page, reward)
}

test('explores both floors offline, crosses at 8 PS and returns for the twelfth quest', async ({ page, context }) => {
  test.setTimeout(150000)
  await page.goto('/')
  await expect(page.getByText(pl.offline.ready)).toBeVisible()
  await context.setOffline(true)
  await page.reload()
  await enterRoom(page)
  await walkToClothes(page)
  await buttonAlternative(page)
  await close(page, reward)
  await walk(page, 208, 191)
  await interact(page)
  await fillWater(page)
  await points(page, 2)
  await walk(page, 160, 52)
  await interact(page)
  await room(page, 'Półpiętro')

  await walk(page, 128, 146)
  await walk(page, 157, null)
  await interact(page)
  const guide = page.getByRole('dialog', { name: 'Ciocia Hania' })
  await expect(guide).toContainText('Zajrzyj do gabinetu.')
  await expect(guide).toContainText('Brakuje 6 gwiazdek.')
  await close(page, 'Ciocia Hania')
  await interact(page)
  await close(page, 'Ciocia Hania')
  await points(page, 2)

  await walk(page, 64, 51)
  await interact(page)
  await room(page, 'Gabinet')
  await page.setViewportSize({ width: 600, height: 960 })
  await expect(page.getByText('Obróć ekran')).toBeVisible()
  await expect(page.getByRole('button', { name: 'W górę' })).toBeHidden()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(600)
  await page.setViewportSize({ width: 960, height: 600 })
  await expectRoomReady(page)
  await expect(page.getByRole('button', { name: 'W górę' })).toBeInViewport({ ratio: 1 })
  await walk(page, null, 85)
  await walk(page, 66, null)
  await interact(page)
  await expect(page.getByRole('dialog', { name: 'Pakowanie tornistra' })).toBeVisible()
  await page.setViewportSize({ width: 600, height: 960 })
  await expect(page.getByText('Obróć ekran')).toBeVisible()
  await page.setViewportSize({ width: 960, height: 600 })
  await match(page, challenges['pack-school-bag'])
  await walk(page, 160, null)
  await interact(page)
  await math(page, challenges['count-school-supplies'])
  await walk(page, 253, null)
  const disordered = await pixelAt(page, 238, 49)
  await interact(page)
  const books = page.getByRole('dialog', { name: 'Książki według rozmiaru' })
  await books.getByRole('button', { name: 'Duża książka' }).press('Enter')
  await expect(books.getByRole('status')).toContainText('Spróbuj wybrać inny następny krok.')
  for (const name of ['Mała książka', 'Średnia książka', 'Duża książka']) {
    await books.getByRole('button', { name }).press('Enter')
  }
  await close(page, reward)
  await expect.poll(() => pixelAt(page, 238, 49)).not.toEqual(disordered)
  await walk(page, 160, 193)
  await interact(page)
  await room(page, 'Półpiętro')

  await walk(page, 256, 50)
  await interact(page)
  await room(page, 'Łazienka')
  await walk(page, null, 85)
  await walk(page, 70, null)
  await interact(page)
  const hands = page.getByRole('dialog', { name: 'Kolejność mycia rąk' })
  for (const id of challenges['order-handwashing'].order) {
    await hands.getByRole('button', { name: pl.sort.items[id] }).tap()
  }
  await close(page, reward)
  await walk(page, 249, null)
  await interact(page)
  await match(page, challenges['match-bathroom-items'])
  await walk(page, 160, 193)
  await interact(page)
  await room(page, 'Półpiętro')

  await walk(page, 256, 157)
  await expect(page.getByText('Brakuje 1 gwiazdki.', { exact: false })).toBeVisible()
  await interact(page)
  await expect(page.getByRole('dialog', { name: 'Schody na parter' })).toContainText('Brakuje 1 gwiazdki.')
  await close(page, 'Schody na parter')
  await walk(page, 64, 192)
  await interact(page)
  await room(page, 'Pokój zabaw')
  await walk(page, 160, 90)
  await interact(page)
  const toys = page.getByRole('dialog', { name: 'Porządkowanie zabawek' })
  await toys.getByRole('button', { name: 'Autko' }).tap()
  await toys.getByRole('button', { name: 'Pluszaki' }).tap()
  await expect(toys.getByRole('status')).toContainText('Spróbuj wybrać inną grupę.')
  await toys.getByRole('button', { name: 'Podpowiedź' }).tap()
  await expect(toys).toContainText('Autko i pociąg to pojazdy.')
  await toys.getByRole('button', { name: 'Pojazdy' }).tap()
  await expect(toys.getByRole('status')).toContainText('Ułożono 1 z 4.')
  await toys.getByRole('button', { name: 'Od początku' }).tap()
  await expect(toys.getByRole('status')).toContainText('Ułożono 0 z 4.')
  await close(page, 'Porządkowanie zabawek', 'Anuluj')
  await points(page, 7)
  await interact(page)
  for (const [item, group] of [['Autko', 'Pojazdy'], ['Pluszowy miś', 'Pluszaki'], ['Pociąg', 'Pojazdy'], ['Pluszowy królik', 'Pluszaki']]) {
    await toys.getByRole('button', { name: item }).tap()
    await toys.getByRole('button', { name: group, exact: true }).tap()
  }
  await close(page, reward)
  await points(page, 8)
  expect((await saveRecord(page)).completed).not.toContain('bedroom-prepare-cat-bed')

  await walk(page, 160, 194)
  await interact(page)
  await room(page, 'Półpiętro')
  await walk(page, 256, 157)
  await expect(page.getByText('Schody są otwarte. Możesz zejść na parter.')).toBeVisible()
  await interact(page)
  await room(page, 'Hol na parterze')
  await points(page, 8)
  await walk(page, 64, 50)
  await interact(page)
  await room(page, 'Kuchnia')
  await walk(page, null, 90)
  await walk(page, 69, null)
  await interact(page)
  await math(page, challenges['count-fruit'])
  await walk(page, 253, null)
  await interact(page)
  await match(page, challenges['match-table-settings'])
  await walk(page, 160, 194)
  await interact(page)
  await room(page, 'Hol na parterze')

  await walk(page, null, 105)
  await walk(page, 256, 50)
  await interact(page)
  await room(page, 'Salon')
  await walk(page, 120, 88)
  await walk(page, 160, null)
  const unsorted = await pixelAt(page, 160, 56)
  await interact(page)
  const household = page.getByRole('dialog', { name: 'Porządkowanie domowych rzeczy' })
  for (const [item, group] of [['Koszulka', 'Ubrania'], ['Kubek', 'Naczynia'], ['Skarpetka', 'Ubrania'], ['Talerz', 'Naczynia']]) {
    await household.getByRole('button', { name: item }).tap()
    await household.getByRole('button', { name: group, exact: true }).tap()
  }
  await close(page, reward)
  await points(page, 11)
  await expect.poll(() => pixelAt(page, 160, 56)).not.toEqual(unsorted)
  const organized = await pixelAt(page, 160, 56)
  const beforeReload = await saveRecord(page)
  await page.reload()
  await page.getByRole('button', { name: 'Wróć do gry' }).tap()
  await room(page, 'Salon')
  expect(await pixelAt(page, 160, 56)).toEqual(organized)
  expect(await saveRecord(page)).toEqual(beforeReload)
  await walk(page, 120, 194)
  await walk(page, 160, null)
  await interact(page)
  await room(page, 'Hol na parterze')
  await walk(page, null, 106)
  await walk(page, 160, 87)
  await interact(page)
  await room(page, 'Półpiętro')

  await walk(page, null, 73)
  await walk(page, 160, 50)
  await interact(page)
  await room(page, 'Twój pokój')
  await walk(page, 160, 182)
  await walk(page, 255, null)
  await interact(page)
  await matchBed(page, (control) => control.tap())
  await points(page, 12)
  const finished = await saveRecord(page)
  expect(new Set(finished.completed).size).toBe(12)
  expect(new Set(finished.rewards.map(({ id }) => id)).size).toBe(12)
  expect(finished.restored).toHaveLength(11)
  expect(finished.hidden).toEqual([{ location: 'bedroom', object: 'scattered-clothes' }])
  expect(finished.trust).toHaveLength(2)
})

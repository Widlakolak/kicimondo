import { createHash } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import demo from '../../contracts/demo-math.json' with { type: 'json' }
import { challenges } from '../src/content/pack'
import { mathQuestions } from '../src/core/education'
import { applyCommand, newSave, type Save } from '../src/core/progress'
import { earn, travel } from './gardenFixtures'
import { enterRoom, expectRoomReady, holdKey, reach, saveRecord, stage } from './roomHelpers'

const configuredApp = 'http://127.0.0.1:4174/'
const updates = 'Dla dorosłych · zadania dodatkowe'
const check = 'Sprawdź i pobierz pakiet zadań'
const activate = 'Aktywny pakiet zadań, wersja 1.'
const continueGame = 'Wróć do gry'
const downloadError = 'Nie udało się zmienić zadań.'
const water = challenges['count-water-drops']

async function returnToMenu(page: Page) {
  await page.getByRole('button', { name: 'Pauza' }).click()
  await page.getByRole('button', { name: 'Wróć do menu' }).click()
  await expect(page.getByRole('button', { name: continueGame })).toBeVisible()
}

async function storeSave(page: Page, save: Save) {
  await page.evaluate((save: Save) => new Promise<void>((resolve, reject) => {
    const open = indexedDB.open('kicimondo')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result
      const transaction = db.transaction('saves', 'readwrite')
      transaction.objectStore('saves').put(save, 'current')
      transaction.oncomplete = () => { db.close(); resolve() }
      transaction.onabort = () => { db.close(); reject(transaction.error) }
    }
  }), save)
}

async function openWater(page: Page) {
  await expect(stage(page)).toHaveAttribute('data-x', '106')
  await holdKey(page, 's', () => reach(page, 'y', 191, 1))
  await holdKey(page, 'd', () => reach(page, 'x', 208, 1))
  const interact = page.getByRole('button', { name: 'Sprawdź', exact: true })
  await expect(interact).toBeEnabled()
  await interact.click()
  const dialog = page.getByRole('dialog', { name: 'Woda dla kota' })
  await expect(dialog).toBeVisible()
  return dialog
}

async function mockApi(page: Page) {
  let invalid = false
  let requests = 0
  let respond = () => {}
  const unblocked = new Promise<void>((resolve) => { respond = resolve })
  await page.route('**/api/v1/content/packs/**', async (route) => {
    requests++
    await unblocked
    const url = new URL(route.request().url())
    expect(url.search).toBe('?gameContentVersion=4&locale=pl')
    const payload = JSON.stringify(invalid ? { ...demo, schemaVersion: 9 } : demo)
    const sha256 = createHash('sha256').update(payload).digest('hex')
    if (url.pathname.endsWith('/latest')) {
      await route.fulfill({ json: {
        packId: demo.packId, version: demo.version, gameContentVersion: demo.gameContentVersion,
        locale: demo.locale, sha256, publishedAt: '2026-11-25T00:00:00Z',
      } })
    } else {
      await route.fulfill({ body: payload, contentType: 'application/json', headers: { 'X-Content-SHA256': sha256 } })
    }
  })
  return { respond, requests: () => requests, invalidate: () => { invalid = true } }
}

test('the default build makes no content API calls and starts with bundled math', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => { if (request.url().includes('/api/')) requests.push(request.url()) })
  await page.goto('/')
  await enterRoom(page)
  await returnToMenu(page)
  await expect(page.getByText(updates)).toHaveCount(0)
  await page.getByRole('button', { name: continueGame }).click()
  const dialog = await openWater(page)
  await expect(dialog.getByRole('img', { name: 'Kropla', exact: true })).toHaveCount(mathQuestions(water)[0].answer)
  expect(requests).toEqual([])
})

test('explicit updates survive reload offline and a bad download leaves the cache intact', async ({ page, context }) => {
  const api = await mockApi(page)
  await page.goto(configuredApp)
  await expect(page.getByText('Gra gotowa do działania bez internetu.')).toBeVisible()
  await enterRoom(page)
  await returnToMenu(page)
  expect(api.requests()).toBe(0)
  await page.getByText(updates).click()
  await page.getByRole('button', { name: check }).click()
  await expect(page.getByRole('button', { name: continueGame })).toBeDisabled()
  api.respond()
  await expect(page.getByText(activate)).toBeVisible()
  expect(api.requests()).toBe(2)
  api.invalidate()
  await page.getByRole('button', { name: check }).click()
  await expect(page.getByText(downloadError, { exact: false })).toBeVisible()
  await expect(page.getByText(activate)).toBeVisible()
  expect(api.requests()).toBe(4)

  await context.setOffline(true)
  await page.reload()
  await page.getByText(updates).click()
  await expect(page.getByText(activate)).toBeVisible()
  await page.getByRole('button', { name: continueGame }).click()
  const dialog = await openWater(page)
  expect(api.requests()).toBe(4)
  const questions = mathQuestions({ ...water, seed: demo.variants[0].seed })
  expect(questions[0].answer).not.toBe(mathQuestions(water)[0].answer)
  await expect(dialog.getByRole('img', { name: 'Kropla', exact: true })).toHaveCount(questions[0].answer)
  await page.getByRole('button', { name: 'Anuluj' }).click()
  await expectRoomReady(page)
  await returnToMenu(page)
  await page.getByText('Dla dorosłych', { exact: true }).click()
  await page.getByRole('button', { name: 'Zacznij od nowa', exact: true }).click()
  await page.getByRole('button', { name: 'Dalej', exact: true }).click()
  await page.getByRole('button', { name: 'Usuń postęp i zacznij od nowa' }).click()
  await expect(page.getByText('Dotknij podłogi', { exact: true })).toBeVisible()
  await returnToMenu(page)
  await page.getByText(updates).click()
  await expect(page.getByText(activate)).toBeVisible()
  expect(api.requests()).toBe(4)
  await page.getByRole('button', { name: 'Wróć do zadań dołączonych do gry' }).click()
  await expect(page.getByText('Korzystasz z zadań dołączonych do gry.')).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: continueGame }).click()
  const bundled = await openWater(page)
  const bundledQuestions = mathQuestions(water)
  await expect(bundled.getByRole('img', { name: 'Kropla', exact: true })).toHaveCount(bundledQuestions[0].answer)
})

test('downloaded seed completes the original quest once and changing packs keeps a full Stage 06 save', async ({ page, context }) => {
  const api = await mockApi(page)
  api.respond()
  await page.goto(configuredApp)
  await expect(page.getByText('Gra gotowa do działania bez internetu.')).toBeVisible()
  await enterRoom(page)
  await returnToMenu(page)
  await page.getByText(updates).click()
  await page.getByRole('button', { name: check }).click()
  await expect(page.getByText(activate)).toBeVisible()
  await context.setOffline(true)
  await page.getByRole('button', { name: continueGame }).click()
  const dialog = await openWater(page)
  const questions = mathQuestions({ ...water, seed: demo.variants[0].seed })
  for (const [index, question] of questions.entries()) {
    await dialog.getByRole('button', { name: String(question.answer), exact: true }).click()
    if (index < questions.length - 1) await dialog.getByRole('button', { name: 'Następna zagadka' }).click()
  }
  await page.getByRole('dialog', { name: 'Brawo!' }).getByRole('button', { name: 'Zamknij' }).click()
  await expectRoomReady(page)
  const completed = await saveRecord(page)
  expect(completed.completed).toEqual(['bedroom-fill-water-bowl'])
  expect(completed.rewards).toHaveLength(1)
  await page.keyboard.press('e')
  await expect(dialog).toBeHidden()
  expect((await saveRecord(page)).rewards).toEqual(completed.rewards)

  let full = travel(earn(newSave(completed.profile), () => true), 'garden')
  full = applyCommand(full, { type: 'discover', cat: 'puszek' })!
  full = applyCommand(full, { type: 'pet', cat: 'puszek' })!
  expect(full.completed).toHaveLength(25)
  await returnToMenu(page)
  await storeSave(page, travel(completed, 'study'))
  await page.reload()
  await page.getByRole('button', { name: continueGame }).click()
  await expect(stage(page)).toHaveAttribute('data-y', '173')
  await holdKey(page, 'w', () => reach(page, 'y', 100, -1))
  await page.getByRole('button', { name: 'Sprawdź', exact: true }).click()
  const school = challenges['count-school-supplies']
  const pencils = mathQuestions({ ...school, seed: demo.variants[1].seed })[0].answer
  const schoolDialog = page.getByRole('dialog')
  await expect(schoolDialog.getByRole('img', { name: 'Ołówek' })).toHaveCount(pencils)
  await schoolDialog.getByRole('button', { name: 'Anuluj' }).click()
  await expectRoomReady(page)
  await returnToMenu(page)
  await storeSave(page, full)
  await page.reload()
  await page.getByText(updates).click()
  await expect(page.getByText(activate)).toBeVisible()
  await page.getByRole('button', { name: 'Wróć do zadań dołączonych do gry' }).click()
  await expect(page.getByText('Korzystasz z zadań dołączonych do gry.')).toBeVisible()
  expect(await saveRecord(page)).toEqual(full)
  await page.getByRole('button', { name: continueGame }).click()
  await expect(page.locator('.points strong').filter({ hasText: /^25$/ })).toBeVisible()
})

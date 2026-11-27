import { expect, type Locator, type Page } from '@playwright/test'
import { challenges } from '../src/content/pack'
import { mathQuestions } from '../src/core/education'
import type { Save } from '../src/core/progress'
import type { Point } from '../src/core/room'

export const start = 'Wejdź do pokoju'
export const roomTitle = 'Twój pokój'
export const nickname = 'Żółwik'
export const stage = (page: Page) => page.locator('.world .stage')

export async function worldClient(page: Page, point: Point) {
  return stage(page).locator('canvas').evaluate((node, point) => {
    const canvas = node as HTMLCanvasElement
    const { cameraX, cameraY } = canvas.parentElement!.dataset
    const rect = canvas.getBoundingClientRect()
    return {
      x: rect.x + (point.x - Number(cameraX)) * rect.width / canvas.width,
      y: rect.y + (point.y - Number(cameraY)) * rect.height / canvas.height,
    }
  }, point)
}

export async function enterRoom(page: Page) {
  await page.getByLabel('Pseudonim', { exact: true }).fill(nickname)
  await page.getByRole('button', { name: start }).click()
  await expect(page.getByRole('heading', { name: roomTitle })).toBeVisible()
  await expect(stage(page)).toHaveAttribute('data-x', '106')
  await expect(stage(page).locator('canvas')).toBeVisible()
}

export async function holdKey(page: Page, key: string, until: () => Promise<void>) {
  await page.keyboard.down(key)
  try {
    await until()
  } finally {
    await page.keyboard.up(key)
  }
}

export async function reach(page: Page, axis: 'x' | 'y', target: number, direction: 1 | -1) {
  await page.waitForFunction(({ axis, target, direction }) => {
    const value = Number(document.querySelector<HTMLElement>('.stage')?.dataset[axis])
    return direction * value >= direction * target
  }, { axis, target, direction }, { timeout: 5000 })
}

export async function saveRecord(page: Page) {
  return page.evaluate(() => new Promise<Save>((resolve, reject) => {
    const opening = indexedDB.open('kicimondo')
    opening.onerror = () => reject(opening.error)
    opening.onsuccess = () => {
      const db = opening.result
      const read = db.transaction('saves').objectStore('saves').get('current')
      read.onsuccess = () => { db.close(); resolve(read.result) }
      read.onerror = () => { db.close(); reject(read.error) }
    }
  }))
}


export async function pixelAt(page: Page, x: number, y: number) {
  return stage(page).locator('canvas').evaluate((canvas, point) =>
    Array.from((canvas as HTMLCanvasElement).getContext('2d')!.getImageData(
      point.x - Number((canvas.parentElement as HTMLElement).dataset.cameraX),
      point.y - Number((canvas.parentElement as HTMLElement).dataset.cameraY), 1, 1).data),
  { x, y })
}

export async function walkToClothes(page: Page) {
  await holdKey(page, 'd', () => reach(page, 'x', 183, 1))
  await holdKey(page, 's', () => reach(page, 'y', 144, 1))
  await expect(page.getByText('Obok leżą rozrzucone ubrania.')).toBeVisible()
  await page.keyboard.press('e')
  await expect(page.getByRole('dialog', { name: 'Rozrzucone ubrania' })).toBeVisible()
}

export async function buttonAlternative(page: Page) {
  await page.getByRole('button', { name: 'Wybierz przyciski' }).click()
  await page.getByRole('button', { name: 'Przycisk 3' }).click()
  await expect(page.getByText('Wybierz najpierw niższy numer.')).toBeVisible()
  for (let target = 1; target <= 5; target++) {
    await page.getByRole('button', { name: `Przycisk ${target}` }).press('Enter')
  }
  await expect(page.getByRole('dialog', { name: 'Brawo!' })).toBeVisible()
}

export async function expectRoomReady(page: Page) {
  await expect(page.locator('.room dialog')).toBeHidden()
  await expect(page.locator('.room dialog h2')).toHaveCount(0)
}

async function closeQuestSuccess(page: Page) {
  await page.getByRole('dialog', { name: 'Brawo!' }).getByRole('button', { name: 'Zamknij' }).click()
  await expectRoomReady(page)
}

export async function matchBed(page: Page, choose = (control: Locator) => control.click()) {
  const dialog = page.getByRole('dialog', { name: 'Legowisko dla kota' })
  await expect(dialog).toBeVisible()
  await choose(dialog.getByRole('button', { name: 'Koc', exact: true }))
  await dialog.getByRole('button', { name: 'Obrazek: koszyk' }).click()
  await expect(dialog.getByText('To inna para.', { exact: false })).toBeVisible()
  await dialog.getByRole('button', { name: 'Podpowiedź' }).click()
  await expect(dialog.getByText('Koc grzeje', { exact: false })).toBeVisible()
  await choose(dialog.getByRole('button', { name: 'Obrazek: koc' }))
  await dialog.getByRole('button', { name: 'Poduszka', exact: true }).press('Enter')
  await dialog.getByRole('button', { name: 'Obrazek: poduszka' }).press('Enter')
  await dialog.getByRole('button', { name: 'Koszyk', exact: true }).click()
  await dialog.getByRole('button', { name: 'Obrazek: koszyk' }).click()
  await expect(page.getByRole('dialog', { name: 'Brawo!' })).toContainText('Legowisko jest gotowe.')
  await closeQuestSuccess(page)
}

export async function fillWater(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Woda dla kota' })
  await expect(dialog).toBeVisible()
  const questions = mathQuestions(challenges['count-water-drops'])
  for (const [index, question] of questions.entries()) {
    const group = dialog.getByRole('group', { name: 'Odpowiedzi' })
    await expect(dialog.getByText(`Zagadka ${index + 1} z 3`)).toBeVisible()
    if (index === 1) {
      await group.getByRole('button', { name: String(question.options.find((n) => n !== question.answer)), exact: true }).click()
      await expect(dialog.getByText('Spróbuj jeszcze raz.', { exact: false })).toBeVisible()
      await dialog.getByRole('button', { name: 'Podpowiedź' }).click()
      await expect(dialog.getByRole('img', { name: 'Kropla', exact: true })).toHaveCount(question.answer)
    }
    await group.getByRole('button', { name: String(question.answer), exact: true }).click()
    if (index < questions.length - 1) await dialog.getByRole('button', { name: 'Następna zagadka' }).click()
  }
  await expect(page.getByRole('dialog', { name: 'Brawo!' })).toContainText('W misce jest świeża woda.')
  await closeQuestSuccess(page)
}

import { expect, type Page } from '@playwright/test'
import type { Save } from '../src/core/progress'

export const start = 'Wejdź do pokoju'
export const roomTitle = 'Twój pokój'
export const nickname = 'Żółwik'
export const stage = (page: Page) => page.locator('.world .stage')

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
    Array.from((canvas as HTMLCanvasElement).getContext('2d')!.getImageData(point.x, point.y, 1, 1).data),
  { x, y })
}

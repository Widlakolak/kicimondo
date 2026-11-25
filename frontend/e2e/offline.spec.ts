import { expect, test } from '@playwright/test'
import { buttonAlternative, enterRoom, fillWater, holdKey, matchBed, reach, saveRecord, stage } from './roomHelpers'

test('first controlled visit precaches the room and all three quests and cat play work offline', async ({ page, context, baseURL }) => {
  test.setTimeout(65000)
  const external: string[] = []
  context.on('request', (request) => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== baseURL) external.push(request.url())
  })
  await page.goto('/')
  await expect(page.getByText('Gra gotowa do działania bez internetu.')).toBeVisible()
  const manifest = await page.evaluate(async () => {
    const url = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')!.href
    return await (await fetch(url)).json()
  })
  expect(manifest).toMatchObject({ lang: 'pl', display: 'standalone' })
  expect(manifest.icons.map(({ sizes }: { sizes: string }) => sizes)).toEqual(['192x192', '512x512', '512x512'])

  await context.setOffline(true)
  await page.reload()
  await enterRoom(page)
  const interact = page.getByRole('button', { name: 'Sprawdź' })
  await holdKey(page, 'd', () => reach(page, 'x', 122, 1))
  await holdKey(page, 's', () => reach(page, 'y', 186, 1))
  await expect(page.getByText('Bursztynek jest gotowy', { exact: false })).toBeVisible()
  await interact.click()
  await expect(stage(page)).toHaveAttribute('data-cat-activity', 'petting')

  await holdKey(page, 'd', () => reach(page, 'x', 183, 1))
  await holdKey(page, 'w', () => reach(page, 'y', 153, -1))
  await interact.click()
  await expect(page.getByRole('dialog', { name: 'Rozrzucone ubrania' })).toBeVisible()
  await buttonAlternative(page)
  await page.getByRole('button', { name: 'Zamknij' }).click()

  await holdKey(page, 'd', () => reach(page, 'x', 208, 1))
  await holdKey(page, 's', () => reach(page, 'y', 191, 1))
  await interact.click()
  await fillWater(page)
  await holdKey(page, 'd', () => reach(page, 'x', 255, 1))
  await interact.click()
  await matchBed(page)
  await expect(page.getByText('3 PS', { exact: true })).toBeVisible()
  await expect(page.getByText('Zaufanie · Bursztynek: 3')).toBeVisible()
  const saved = await saveRecord(page)
  expect(saved.completed).toHaveLength(3)
  expect(saved.hidden).toHaveLength(1)
  expect(saved.restored).toHaveLength(2)
  await page.reload()
  await page.getByRole('button', { name: 'Wróć do gry' }).click()
  await expect(stage(page).locator('canvas')).toBeVisible()
  expect(await saveRecord(page)).toEqual(saved)
  expect(external).toEqual([])
})

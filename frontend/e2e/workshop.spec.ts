import { readFileSync } from 'node:fs'
import { expect, test, type BrowserContext, type Page, type TestInfo } from '@playwright/test'
import { loadMaps } from '../src/content/loadMaps'
import { challenges, quests, transitions, type Challenge, type LocationId, type Quest, type TraceChallenge, type Transition } from '../src/content/pack'
import { mathQuestions } from '../src/core/education'
import { routeTo } from '../src/core/navigation'
import { canStand, type Point } from '../src/core/room'
import { solidsFor } from '../src/core/tiledMap'
import { pl } from '../src/i18n/pl'
import { enterRoom, expectRoomReady, pixelAt, saveRecord, stage } from './roomHelpers'

const maps = loadMaps((name) => readFileSync(new URL(`../src/game/maps/${name}.tmj`, import.meta.url), 'utf8'))
const canvas = (page: Page) => stage(page).locator('canvas')
const stars = (page: Page) => page.locator('.points strong')
const reward = (page: Page) => page.getByRole('dialog', { name: pl.questComplete })
const compact = { width: 640, height: 360 }

async function capture(page: Page, info: TestInfo, name: string) {
  if (process.env.KICIMONDO_VISUAL_REVIEW === '1') {
    await page.screenshot({ path: info.outputPath(`visual-${name}.png`), animations: 'disabled' })
  }
}

async function close(page: Page) {
  await page.getByRole('dialog').getByRole('button', { name: pl.close, exact: true }).tap()
  await expectRoomReady(page)
}

function stepsBetween(location: LocationId, target: LocationId, points: number) {
  const queue: { room: LocationId; path: readonly Transition[] }[] = [{ room: location, path: [] }]
  const seen = new Set([location])
  for (const { room, path } of queue) {
    if (room === target) return path
    for (const edge of transitions) {
      if (edge.location !== room || edge.minimumPoints > points || seen.has(edge.target.location)) continue
      seen.add(edge.target.location)
      queue.push({ room: edge.target.location, path: [...path, edge] })
    }
  }
  throw new Error(`No passage from ${location} to ${target} at ${points} stars`)
}

async function tapVisible(page: Page, candidates: Point[]) {
  const client = await canvas(page).evaluate((node, points) => {
    const surface = node as HTMLCanvasElement
    const { cameraX, cameraY } = surface.parentElement!.dataset
    const bounds = surface.getBoundingClientRect()
    for (const point of points) {
      const x = bounds.x + (point.x - Number(cameraX)) * bounds.width / surface.width
      const y = bounds.y + (point.y - Number(cameraY)) * bounds.height / surface.height
      if (x < bounds.left + 8 || x > bounds.right - 8 || y < bounds.top + 8 || y > bounds.bottom - 8) continue
      if (document.elementFromPoint(x, y) === surface) return { x, y }
    }
    return null
  }, candidates)
  if (!client) return false
  await page.touchscreen.tap(client.x, client.y)
  return true
}

async function walk(page: Page, room: LocationId, target: Point, interaction?: string) {
  const map = maps[room]
  const furniture = map.furniture.find(({ id }) => id === interaction)
  const solids = solidsFor(map)
  for (let attempt = 0; attempt < 12; attempt++) {
    const { position, resident } = await stage(page).evaluate(({ dataset }) => ({
      position: { x: Number(dataset.x), y: Number(dataset.y) },
      resident: { x: Number(dataset.catX), y: Number(dataset.catY) },
    }))
    if (Math.hypot(position.x - target.x, position.y - target.y) < 7) return
    const route = routeTo(position, target, map, solids)
    expect(route, `Route from ${JSON.stringify(position)} to ${JSON.stringify(target)} in ${room}`).not.toBeNull()
    // Click the object to approach it when it's visible. Otherwise tap visible floor along the route.
    const candidates: Point[] = []
    if (furniture && Math.hypot(position.x - target.x, position.y - target.y) >
        map.anchors.find(({ id }) => id === interaction)!.radius + 2) {
      const { x, y, width, height } = furniture.box
      candidates.push({ x: x + width / 2, y: y + height / 2 })
    }
    let previous = position
    const floor: Point[] = []
    for (const { x, y } of route!) {
      const steps = Math.max(1, Math.ceil(Math.hypot(x - previous.x, y - previous.y) / 12))
      for (let step = 1; step <= steps; step++) {
        const point = { x: previous.x + (x - previous.x) * step / steps, y: previous.y + (y - previous.y) * step / steps }
        if (!canStand(point, solids) ||
          (Math.abs(point.x - resident.x) < 14 && point.y >= resident.y - 18 && point.y <= resident.y + 6) ||
          map.furniture.some(({ box }) =>
          point.x >= box.x - 1 && point.x <= box.x + box.width + 1 &&
          point.y >= box.y - 1 && point.y <= box.y + box.height + 1)) continue
        floor.push(point)
      }
      previous = { x, y }
    }
    // If already inside the interaction radius, the keyboard can select the nearest anchor.
    if (interaction && Math.hypot(position.x - target.x, position.y - target.y) <=
        map.anchors.find(({ id }) => id === interaction)!.radius - 3 &&
        !candidates.length) return
    expect(await tapVisible(page, [...candidates, ...floor.reverse()]), `Visible floor in ${room}`).toBe(true)
    await expect.poll(() => stage(page).evaluate(({ dataset }, start) =>
      dataset.destination === 'walking' || Math.hypot(Number(dataset.x) - start.x, Number(dataset.y) - start.y) > 2,
    position), { message: `Move toward ${interaction ?? 'the tapped floor'} in ${room}` }).toBe(true)
    await expect(stage(page)).not.toHaveAttribute('data-destination', 'walking', { timeout: 7000 })
  }
  throw new Error(`Could not walk to ${interaction ?? JSON.stringify(target)} in ${room}`)
}

async function inspect(page: Page, room: LocationId, interaction: string, direct = false) {
  const anchor = maps[room].anchors.find(({ id }) => id === interaction)!
  await walk(page, room, anchor, interaction)
  if (direct) {
    const { x, y, width, height } = maps[room].furniture.find(({ id }) => id === interaction)!.box
    expect(await tapVisible(page, [{ x: x + width / 2, y: y + height / 2 }])).toBe(true)
  } else {
    await page.keyboard.press('e')
  }
}

async function followTrace(page: Page, context: BrowserContext, challenge: TraceChallenge) {
  const samples = await page.getByRole('img', { name: pl.trace.board }).evaluate((svg, path) => {
    const matrix = (svg as unknown as SVGSVGElement).getScreenCTM()!
    return path.map(({ x, y }) => {
      const screen = new DOMPoint(x * 100, y * 100).matrixTransform(matrix)
      return { x: screen.x, y: screen.y }
    })
  }, challenge.path)
  const device = await context.newCDPSession(page)
  await device.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [samples[0]] })
  for (const sample of samples.slice(1)) {
    await device.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [sample] })
  }
  await expect(reward(page)).toContainText('+1')
  await device.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await device.detach()
}

async function solve(page: Page, context: BrowserContext, quest: Quest) {
  const challenge: Challenge = challenges[quest.challenge]
  const dialog = page.getByRole('dialog', { name: pl.challenges[challenge.text].title })
  await expect(dialog).toBeVisible()
  const button = (name: string) => dialog.getByRole('button', { name, exact: true })
  switch (challenge.type) {
    case 'TRACE_PATH':
      if (quest.introduced === 5) await followTrace(page, context, challenge)
      else {
        await button(pl.trace.alternative).click()
        for (let n = 1; n <= challenge.targets.length; n++) await button(pl.trace.target(n)).press('Enter')
      }
      break
    case 'MATH_CHOICE': {
      const questions = mathQuestions(challenge)
      for (const [index, { answer }] of questions.entries()) {
        await button(String(answer)).click()
        if (index < questions.length - 1) await button(pl.math.next).click()
      }
      break
    }
    case 'MATCH_PAIRS': {
      const match = pl.match
      const pictureCues = challenge.pairs.some(({ cue }) => !!cue)
      const input = dialog.getByRole('group', { name: pictureCues ? match.cueGroup : match.wordGroup, exact: true })
      const output = dialog.getByRole('group', { name: match.pictureGroup, exact: true })
      for (const { word, picture, cue } of challenge.pairs) {
        await input.getByRole('button', { name: cue ? match.pictures[cue] : match.words[word], exact: true }).click()
        await output.getByRole('button', { name: match.pictures[picture], exact: true }).click()
      }
      break
    }
    case 'SORT_ORDER':
      if (challenge.mode === 'sequence') {
        for (const id of challenge.order) await button(pl.sort.items[id]).press('Enter')
      } else {
        for (const { id } of challenge.items) {
          await button(pl.sort.items[id]).click()
          await button(pl.sort.groups[challenge.assignments[id]!]).click()
        }
      }
  }
  await expect(reward(page)).toContainText('+1')
}

test.use({ hasTouch: true, reducedMotion: 'reduce', viewport: { width: 960, height: 600 } })

test('earns all 50 stars offline and crafts every workshop object through the world', async ({ page, context }, info) => {
  test.setTimeout(420_000)
  await page.goto('/')
  await expect(page.getByText(pl.offline.ready, { exact: true })).toBeVisible()
  await enterRoom(page)
  await context.setOffline(true)

  let room: LocationId = 'bedroom'
  let points = 0
  async function travel(target: LocationId) {
    for (const edge of stepsBetween(room, target, points)) {
      await inspect(page, room, edge.interaction)
      room = edge.target.location
      await expect(page.getByRole('heading', { name: pl.locations[room].title, exact: true })).toBeVisible()
      await expect(stage(page)).toHaveAttribute('data-x', String(maps[room].spawns.get(edge.target.spawn)!.x))
    }
  }
  async function finish(quest: Quest) {
    await travel(quest.location)
    await inspect(page, room, quest.interaction)
    if (room === 'workshop') {
      await expect(page.locator('[data-kit-status="available"]')).toContainText(pl.crafting.have)
      if (quest.interaction === 'cardboard-hideout') await capture(page, info, 'kit-ready')
      await page.getByRole('button', { name: pl.crafting.build, exact: true }).tap()
    }
    if (['leaf-path', 'shape-board', 'sock-tray', 'felt-basket'].includes(quest.interaction)) {
      await capture(page, info, quest.interaction)
    }
    if (quest.interaction === 'sock-tray') {
      await page.getByRole('button', { name: pl.sort.items['blue-striped-sock'], exact: true }).click()
      await page.getByRole('button', { name: pl.sort.groups.dots, exact: true }).click()
      await expect(page.getByRole('dialog')).toContainText(pl.sort.wrongGroup)
    }
    await solve(page, context, quest)
    await expect(stars(page)).toHaveText(String(++points))
    if (points === 32) await expect(reward(page)).toContainText(pl.play.unlocked.basement)
    await close(page)
  }

  const original = quests.filter(({ introduced }) => introduced < 5)
  const outside = quests.filter(({ introduced, location }) => introduced === 5 &&
    !['basement', 'storage', 'workshop'].includes(location))
  for (const quest of original) await finish(quest)
  expect((await saveRecord(page)).completed).toEqual(original.map(({ id }) => id))
  for (const quest of outside.slice(0, 6)) await finish(quest)
  await travel('hall')
  await inspect(page, 'hall', 'basement-stairs')
  await expect(page.getByRole('dialog', { name: pl.basementStairs.title })).toContainText('Brakuje 1 gwiazdki.')
  await expect(stars(page)).toHaveText('31')
  await capture(page, info, 'stairs-locked')
  await close(page)
  await finish(outside[6])
  expect((await saveRecord(page)).completed.filter((id) => outside.some((quest) => quest.id === id))).toHaveLength(7)

  await travel('hall')
  const stairAnchor = maps.hall.anchors.find(({ id }) => id === 'basement-stairs')!
  await walk(page, 'hall', stairAnchor, 'basement-stairs')
  await capture(page, info, 'stairs-open')
  await travel('basement')
  await capture(page, info, 'corridor')
  await travel('workshop')
  await page.setViewportSize(compact)
  await expect(page.getByRole('button', { name: pl.interact })).toBeInViewport({ ratio: 1 })
  await capture(page, info, 'workshop-before-640')
  await expect(stage(page)).not.toHaveAttribute('data-quests', /cardboard-hideout/)
  await expect(stage(page)).toHaveAttribute('data-waiting', /cardboard-hideout/)
  await inspect(page, 'workshop', 'cardboard-hideout', true)
  await expect(page.locator('[data-kit-status="waiting"]')).toContainText(pl.kits.cardboard)
  await expect(page.getByRole('dialog')).toContainText(pl.locations.basement.title)
  await expect(page.getByRole('button', { name: pl.crafting.build })).toHaveCount(0)
  await capture(page, info, 'kit-missing-640')
  await page.getByRole('button', { name: pl.crafting.find, exact: true }).tap()
  await expectRoomReady(page)
  await expect(stage(page)).toHaveAttribute('data-exit', 'corridor-door')
  await travel('basement')
  await expect(stage(page)).toHaveAttribute('data-goal', 'cardboard-crate')
  await finish(quests.find(({ interaction }) => interaction === 'cardboard-crate')!)
  await expect(stage(page)).not.toHaveAttribute('data-goal', 'cardboard-crate')

  await page.setViewportSize({ width: 960, height: 600 })
  const preparations = quests.filter(({ location, interaction }) =>
    (location === 'basement' || location === 'storage') && interaction !== 'cardboard-crate')
  for (const [index, quest] of preparations.entries()) {
    if (quest.location === 'storage' && preparations[index - 1]?.location !== 'storage') {
      await travel('storage')
      await capture(page, info, 'storage')
    }
    await finish(quest)
  }
  await travel('workshop')
  await walk(page, 'workshop', { x: 251, y: 170 })
  await expect.poll(() => saveRecord(page).then(({ discovered }) => discovered)).toContain('sparkle')
  await capture(page, info, 'iskierka')
  const cat = () => page.getByRole('dialog', { name: pl.kicipedia.title })
  await page.getByRole('button', { name: pl.kicipedia.title, exact: true }).click()
  await cat().getByRole('button', { name: pl.cat.names.sparkle }).click()
  await expect(cat()).toContainText(pl.kicipedia.profiles.sparkle.description)
  await capture(page, info, 'kicipedia')
  await page.keyboard.press('Escape')
  await expect(cat().getByRole('button', { name: pl.cat.names.sparkle })).toBeVisible()
  await close(page)

  await walk(page, 'workshop', maps.workshop.anchors.find(({ id }) => id === 'cardboard-hideout')!, 'cardboard-hideout')
  const before = await pixelAt(page, 72, 69)
  const recipes = quests.filter(({ location }) => location === 'workshop')
  for (const quest of recipes) await finish(quest)
  await inspect(page, 'workshop', 'cardboard-hideout')
  await expect(page.locator('[data-kit-status="built"]')).toContainText(pl.crafting.ready)
  await expect(stars(page)).toHaveText('47')
  expect(await pixelAt(page, 72, 69)).not.toEqual(before)
  await capture(page, info, 'recipe-built')
  await close(page)
  await expect(stage(page)).toHaveAttribute('data-cat-spot', /cardboard-hideout|resting-mat|felt-ball/, { timeout: 12_000 })
  await capture(page, info, 'workshop-after')
  await travel('hall')
  for (const quest of outside.slice(7)) await finish(quest)
  expect(points).toBe(50)
  const completed = await saveRecord(page)
  expect(completed.contentVersion).toBe(5)
  expect(new Set(completed.completed)).toEqual(new Set(quests.map(({ id }) => id)))
  expect(new Set(completed.rewards.map(({ id }) => id)).size).toBe(50)

  await travel('workshop')
  await page.reload()
  await page.getByRole('button', { name: pl.continue, exact: true }).click()
  await expect(stars(page)).toHaveText('50')
  await expect(stage(page)).toHaveAttribute('data-quests', '')
  await expect(page.getByText(pl.cat.trust(pl.cat.names.sparkle, 3))).toBeVisible()
  await walk(page, 'workshop', { x: 255, y: 168 })
  await expect(page.getByText(pl.cat.ready(pl.cat.names.sparkle, true))).toBeVisible()
  await page.keyboard.press('e')
  await expect(page.getByText(pl.cat.trust(pl.cat.names.sparkle, 4))).toBeVisible()
  await expect(stars(page)).toHaveText('50')
  // Reload the checkpoint before the rotation and fullscreen checks.
  await page.reload()
  await page.getByRole('button', { name: pl.continue, exact: true }).click()
  await page.getByRole('button', { name: pl.kicipedia.title, exact: true }).click()
  await expect(cat().getByRole('button', { name: pl.cat.names.sparkle })).toBeVisible()
  await close(page)

  const originalCanvas = await canvas(page).elementHandle()
  for (const [width, height] of [[640, 360], [844, 390], [960, 600], [1920, 1200], [1920, 1080]]) {
    await page.setViewportSize({ width, height })
    await expect(page.getByRole('button', { name: pl.interact })).toBeInViewport({ ratio: 1 })
    expect(await originalCanvas!.evaluate((element) => element === document.querySelector('.stage canvas'))).toBe(true)
    await capture(page, info, `workshop-${width}x${height}`)
  }
  await page.setViewportSize({ width: 360, height: 640 })
  await expect(page.getByText(pl.play.rotate, { exact: true })).toBeVisible()
  const pausedX = await stage(page).getAttribute('data-x')
  await page.keyboard.down('a')
  const portraitX = await stage(page).evaluate(async (element) => {
    for (let frame = 0; frame < 8; frame++) await new Promise(requestAnimationFrame)
    return element.dataset.x
  })
  await page.keyboard.up('a')
  expect(portraitX).toBe(pausedX)
  await page.setViewportSize({ width: 844, height: 390 })
  await expect(page.getByText(pl.play.rotate, { exact: true })).toBeHidden()
  await page.getByRole('button', { name: pl.play.fullscreen, exact: true }).click()
  await page.getByRole('button', { name: pl.play.hideControls, exact: true }).tap()
  await expect(page.getByRole('group', { name: pl.controls })).toHaveCount(0)
  const cameraBefore = await stage(page).getAttribute('data-camera-y')
  await inspect(page, 'workshop', 'cardboard-hideout', true)
  await expect(page.locator('[data-kit-status="built"]')).toBeVisible()
  await close(page)
  expect(await stage(page).getAttribute('data-camera-y')).not.toBe(cameraBefore)
  await capture(page, info, 'fullscreen-hidden')
  await page.getByRole('button', { name: pl.play.exitFullscreen }).tap()
  await expect(page.getByRole('button', { name: pl.interact })).toBeInViewport({ ratio: 1 })
})

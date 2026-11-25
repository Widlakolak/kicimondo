import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { execFileSync } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { readFile, writeFile, mkdtemp, mkdir, rm, chmod, stat } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { env, pid } from 'node:process'
import { chromium, expect } from '@playwright/test'
import { build } from 'vite'

const directory = resolve('../infrastructure/qnap')
const project = 'kicimondo-smoke-' + pid + '-' + randomBytes(3).toString('hex')
const previous = { frontend: project + '-frontend:previous', backend: project + '-backend:previous' }
const current = { frontend: env.KICIMONDO_FRONTEND_IMAGE, backend: env.KICIMONDO_BACKEND_IMAGE }
assert(current.frontend && current.backend, 'Set the two locally built production image references')
const tmp = await mkdtemp(join(tmpdir(), project + '-'))
const release = join(tmp, 'release.env')
const archiveDir = join(tmp, 'backups')
const restore = project + '-restore'
const api = '/api/v1/content/packs/kicimondo-math'
const compatible = '?gameContentVersion=4'
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')

function docker(args, options = {}) {
  return execFileSync('docker', args, {
    encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'], ...options,
  }).trim()
}

function compose(args, images = current, profile = true) {
  return docker(['compose', '-p', project, '--env-file', release,
    '-f', join(directory, 'compose.yaml'), '-f', join(directory, 'compose.local.yaml'),
    ...(profile ? ['--profile', 'content'] : []), ...args], {
    env: { ...env, KICIMONDO_FRONTEND_IMAGE: images.frontend, KICIMONDO_BACKEND_IMAGE: images.backend },
  })
}

function up(images, services = []) {
  compose(['up', '--pull', 'never', '-d', '--wait', '--wait-timeout', '120', ...services], images, !services.length)
}

async function freePort() {
  const listener = createServer()
  await new Promise((ready, reject) => listener.once('error', reject).listen(0, '127.0.0.1', ready))
  const { port } = listener.address()
  await new Promise((closed) => listener.close(closed))
  return port
}

async function buildPreviousImages() {
  env.VITE_CONTENT_API_ORIGIN = 'same-origin'
  const fixture = join(tmp, 'image')
  await mkdir(fixture)
  await build({
    build: { outDir: join(fixture, 'dist'), emptyOutDir: true },
    logLevel: 'error',
    plugins: [{
      name: 'previous-version-smoke-fixture',
      enforce: 'pre',
      transform(source, id) {
        if (id.endsWith('/src/i18n/pl.ts')) {
          return source.replace('Witaj w Kicimondo!', 'Witaj ponownie w Kicimondo!')
        }
      },
    }],
  })
  const dockerfile = join(fixture, 'Dockerfile')
  await writeFile(dockerfile, `ARG BASE
FROM \${BASE}
USER root
RUN rm -rf /usr/share/nginx/html
COPY dist/ /usr/share/nginx/html/
RUN chmod -R a+rX /usr/share/nginx/html
USER nginx
`)
  docker(['build', '--platform', 'linux/amd64', '--build-arg', 'BASE=' + current.frontend, '-t', previous.frontend, fixture])
  await writeFile(dockerfile, 'ARG BASE\nFROM ${BASE}\nLABEL io.kicimondo.smoke=previous\n')
  docker(['build', '--platform', 'linux/amd64', '--build-arg', 'BASE=' + current.backend, '-t', previous.backend, fixture])
}

function checksums() {
  const query = 'SELECT pack_id, version, checksum, encode(sha256(convert_to(payload, \'UTF8\')), \'hex\') FROM published_pack ORDER BY pack_id, version'
  return ['psql', '-XAt', '-v', 'ON_ERROR_STOP=1', '-U', 'kicimondo', '-d', 'kicimondo', '-c', query]
}

async function checkBackup(postgres) {
  const saved = execFileSync('sh', [join(directory, 'backup.sh'), archiveDir, release, project], {
    encoding: 'utf8', env: { ...env, KICIMONDO_FRONTEND_IMAGE: current.frontend, KICIMONDO_BACKEND_IMAGE: current.backend },
  }).trim()
  const dump = join(saved, 'content.dump')
  assert.equal((await stat(dump)).mode & 0o777, 0o600)
  assert((await readFile(join(saved, 'release.txt'), 'utf8')).includes(current.backend))
  docker(['run', '--pull', 'never', '-d', '--name', restore, '--network', 'none', '-e', 'POSTGRES_USER=kicimondo',
    '-e', 'POSTGRES_DB=kicimondo', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', postgres, '-c', 'listen_addresses='])
  // The official image starts a temporary server during initialization.
  await expect.poll(() => docker(['logs', restore]), { timeout: 30_000 }).toContain('init process complete')
  await expect.poll(() => {
    try { return docker(['exec', restore, 'pg_isready', '-U', 'kicimondo', '-d', 'kicimondo']) }
    catch { return '' }
  }, { timeout: 30_000 }).toContain('accepting connections')
  docker(['exec', '-i', restore, 'pg_restore', '--exit-on-error', '--single-transaction',
    '-U', 'kicimondo', '-d', 'kicimondo', '--no-owner', '--no-privileges'], { input: await readFile(dump) })
  const expected = compose(['exec', '-T', 'kicimondo-postgres', ...checksums()])
  assert(expected.startsWith('kicimondo-math|1|'))
  assert.equal(docker(['exec', restore, ...checksums()]), expected)
  assert.equal(expected.split('|')[2], expected.split('|')[3])
}

let browser
let context
try {
  const port = await freePort()
  const loopback = 'http://127.0.0.1:' + port
  await writeFile(release, [
    'KICIMONDO_FRONTEND_IMAGE=' + current.frontend, 'KICIMONDO_BACKEND_IMAGE=' + current.backend,
    'KICIMONDO_WEB_PORT=' + port, 'KICIMONDO_DB_PASSWORD=' + randomBytes(32).toString('hex'),
    'KICIMONDO_ALLOWED_ORIGINS=https://localhost', '',
  ].join('\n'), { mode: 0o600 })

  const get = (path, options = {}) => globalThis.fetch(loopback + path, {
    ...options, headers: { Connection: 'close', ...options.headers },
  })
  const entryScript = (html) => html.match(/src="\.\/(assets\/index-[^"]+\.js)"/)?.[1]
  const contentMetadata = async () => {
    const response = await get(api + '/latest' + compatible)
    assert.equal(response.status, 200)
    return response.json()
  }
  const before = async (page, key, axis, target) => {
    await page.keyboard.down(key)
    try {
      await page.waitForFunction(([axis, target]) => Number(globalThis.document.querySelector('.stage')?.dataset[axis]) >= target,
        [axis, target], { timeout: 5000 })
    } finally {
      await page.keyboard.up(key)
    }
  }

  compose(['config', '--quiet'])
  const postgres = compose(['config', '--images', 'kicimondo-postgres'])
  assert.match(postgres, /^\S+@sha256:[a-f0-9]{64}$/, 'PostgreSQL must use a digest-pinned image')
  globalThis.console.log(docker(['pull', '--platform', 'linux/amd64', postgres]))
  assert.equal(docker(['image', 'inspect', '--format', '{{.Os}}/{{.Architecture}}', postgres]), 'linux/amd64')
  docker(['compose', '-p', project, '--env-file', release, '-f', join(directory, 'compose.yaml'),
    '-f', join(directory, 'compose.proxy.yaml'), 'config', '--quiet'], {
    env: { ...env, KICIMONDO_PROXY_NETWORK: project + '-example-proxy' },
  })
  await buildPreviousImages()
  up(previous, ['kicimondo-frontend'])
  assert.deepEqual(compose(['ps', '--services', '--status', 'running'], previous).split('\n'), ['kicimondo-frontend'])
  const unavailable = await get(api + '/latest' + compatible)
  assert.equal(unavailable.status, 503)
  assert.equal(unavailable.headers.get('content-type'), 'application/problem+json')
  const initial = await get('/')
  assert.equal(initial.headers.get('cache-control'), 'no-cache')
  assert.match(initial.headers.get('content-type'), /^text\/html/)
  const oldScript = entryScript(await initial.text())
  assert(oldScript)
  const hashPath = '/' + oldScript
  const oldAsset = await get(hashPath)
  assert.match(oldAsset.headers.get('content-type'), /javascript/)
  assert.match(oldAsset.headers.get('cache-control'), /immutable/)
  const oldBytes = Buffer.from(await oldAsset.arrayBuffer())
  for (const path of ['/sw.js', '/manifest.webmanifest']) {
    const response = await get(path)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('cache-control'), 'no-cache')
    assert.match(response.headers.get('content-type'), path.endsWith('.js') ? /javascript/ : /manifest\+json/)
  }
  const missing = await get('/assets/index-12345678.js')
  assert.equal(missing.status, 404)
  assert.doesNotMatch(missing.headers.get('cache-control') ?? '', /immutable/)

  browser = await chromium.launch({ executablePath: env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH })
  context = await browser.newContext()
  await context.tracing.start({ screenshots: true, snapshots: true })
  const page = await context.newPage()
  await page.goto(loopback)
  await expect(page.getByText('Gra gotowa do działania bez internetu.')).toBeVisible()
  await page.getByLabel('Pseudonim', { exact: true }).fill('Żółwik')
  await page.getByRole('button', { name: 'Wejdź do pokoju' }).click()
  await expect(page.locator('.world canvas')).toBeVisible()
  await page.getByRole('button', { name: 'Pauza' }).click()
  await page.getByRole('button', { name: 'Wróć do menu' }).click()

  up(previous)
  const ids = (service) => compose(['ps', '-q', service])
  const cgroupDriver = docker(['info', '--format', '{{.CgroupDriver}}'])
  assert(cgroupDriver !== 'none' || env.GITHUB_ACTIONS !== 'true',
    'The GitHub Actions smoke runner must enforce cgroup memory limits')
  const cgroupVersion = docker(['info', '--format', '{{.CgroupVersion}}'])
  const memoryLimitPath = cgroupVersion === '2'
    ? '/sys/fs/cgroup/memory.max' : '/sys/fs/cgroup/memory/memory.limit_in_bytes'
  for (const [service, memory] of [['kicimondo-frontend', 64], ['kicimondo-backend', 512], ['kicimondo-postgres', 256]]) {
    const exactLimit = String(memory * 1024 * 1024)
    assert.equal(docker(['inspect', '--format', '{{.HostConfig.Memory}}', ids(service)]), exactLimit)
    if (cgroupDriver !== 'none') {
      assert.equal(compose(['exec', '-T', service, 'cat', memoryLimitPath]), exactLimit)
    }
    if (service !== 'kicimondo-frontend') {
      const bindings = JSON.parse(docker(['inspect', '--format', '{{json .HostConfig.PortBindings}}', ids(service)]))
      assert.deepEqual(bindings ?? {}, {})
    }
  }
  const fixture = join(tmp, 'demo-math.json')
  await writeFile(fixture, await readFile('../contracts/demo-math.json'))
  await chmod(fixture, 0o644)
  const importPack = () => compose(['run', '--pull', 'never', '--rm', '--no-deps', '--volume', fixture + ':/import/demo-math.json:ro',
    'kicimondo-backend', 'import', '/import/demo-math.json'], previous)
  assert.match(importPack(), /^PUBLISHED$/m)
  assert.match(importPack(), /^ALREADY_PUBLISHED$/m)
  const metadata = await contentMetadata()
  const exact = await get(api + '/versions/1' + compatible)
  assert.equal(exact.status, 200)
  assert.equal(exact.headers.get('x-content-sha256'), metadata.sha256)
  assert.equal(hash(Buffer.from(await exact.arrayBuffer())), metadata.sha256)
  assert.equal((await get('/api/v1/content/packs' + compatible)).status, 200)
  assert.equal((await get(api + '/latest?gameContentVersion=3')).status, 404)
  for (const path of ['/actuator/health', '/actuator/env', '/swagger-ui/index.html', '/v3/api-docs', '/import/demo-math.json', '/api/import']) {
    assert.equal((await get(path)).status, 404, path)
  }
  const write = await get(api + '/latest' + compatible, { method: 'POST' })
  assert.equal(write.status, 403)
  assert.equal(write.headers.get('content-type'), 'application/problem+json')
  const cors = await get(api + '/latest' + compatible, {
    method: 'OPTIONS', headers: { Origin: 'https://localhost', 'Access-Control-Request-Method': 'GET' },
  })
  assert(cors.ok)
  assert.equal(cors.headers.get('access-control-allow-origin'), 'https://localhost')

  await page.getByText('Dla dorosłych · zadania dodatkowe').click()
  await page.getByRole('button', { name: 'Sprawdź i pobierz pakiet zadań' }).click()
  await expect(page.getByText('Aktywny pakiet zadań, wersja 1.')).toBeVisible()
  await page.getByRole('button', { name: 'Wróć do gry' }).click()
  await expect(page.locator('.stage')).toHaveAttribute('data-x', '106')
  await before(page, 's', 'y', 191)
  await before(page, 'd', 'x', 208)
  await page.getByRole('button', { name: 'Sprawdź', exact: true }).click()
  const water = page.getByRole('dialog', { name: 'Woda dla kota' })
  await expect(water.getByRole('img', { name: 'Kropla', exact: true })).toHaveCount(3)

  const backendBefore = ids('kicimondo-backend')
  up(current)
  assert.notEqual(ids('kicimondo-backend'), backendBefore)
  await expect.poll(async () => {
    try { return await contentMetadata() } catch { return null }
  }).toEqual(metadata)
  assert.notEqual(entryScript(await (await get('/')).text()), oldScript)
  await page.evaluate(async () => (await globalThis.navigator.serviceWorker.ready).update())
  await expect.poll(() => page.evaluate(async () => Boolean((await globalThis.navigator.serviceWorker.ready).waiting))).toBe(true)
  await expect(water).toBeVisible()
  const retained = await get(hashPath)
  assert.equal(retained.status, 200)
  assert.equal(hash(Buffer.from(await retained.arrayBuffer())), hash(oldBytes))
  assert.match(retained.headers.get('cache-control'), /immutable/)

  await context.setOffline(true)
  for (const [index, answer] of ['3', '6', '2'].entries()) {
    await water.getByRole('button', { name: answer, exact: true }).click()
    if (index < 2) await water.getByRole('button', { name: 'Następna zagadka' }).click()
  }
  await page.getByRole('button', { name: 'Zamknij', exact: true }).click()
  await expect(page.getByText('1 PS', { exact: true })).toBeVisible()
  await context.setOffline(false)
  await page.close()
  const reopened = await context.newPage()
  await expect.poll(async () => {
    await reopened.goto(loopback)
    const active = await reopened.getByRole('heading', { name: 'Witaj w Kicimondo!', exact: true }).isVisible()
    if (!active) await reopened.goto('about:blank')
    return active
  }, { timeout: 15_000 }).toBe(true)
  await expect(reopened.getByText('Gra gotowa do działania bez internetu.')).toBeVisible()
  await context.setOffline(true)
  await reopened.reload()
  await reopened.getByText('Dla dorosłych · zadania dodatkowe').click()
  await expect(reopened.getByText('Aktywny pakiet zadań, wersja 1.')).toBeVisible()
  await reopened.getByRole('button', { name: 'Wróć do gry' }).click()
  await expect(reopened.getByText('1 PS', { exact: true })).toBeVisible()
  await context.setOffline(false)
  await checkBackup(postgres)

  if (cgroupDriver === 'none') {
    globalThis.console.log('Compose memory settings checked. This Docker daemon cannot enforce cgroup limits.')
  } else {
    globalThis.console.log(docker(['stats', '--no-stream', '--format', '{{.Name}} {{.MemUsage}}',
      ...['kicimondo-frontend', 'kicimondo-backend', 'kicimondo-postgres'].map(ids)]))
  }
  up(previous)
  assert.equal(entryScript(await (await get('/')).text()), oldScript)
  assert.deepEqual(await contentMetadata(), metadata)
  compose(['stop', 'kicimondo-backend', 'kicimondo-postgres'], previous)
  await expect.poll(() => get(api + '/latest' + compatible).then((r) => r.status)).toBe(503)
  assert.equal((await get('/')).status, 200)
  const fresh = await browser.newPage()
  await fresh.goto(loopback)
  await expect(fresh.getByText('Gra gotowa do działania bez internetu.')).toBeVisible()
  await fresh.getByLabel('Pseudonim', { exact: true }).fill('Mgiełka')
  await fresh.getByRole('button', { name: 'Wejdź do pokoju' }).click()
  await expect(fresh.locator('.world canvas')).toBeVisible()
  globalThis.console.log('Production Compose smoke passed, including previous assets, offline update, restore and rollback.')
} catch (error) {
  if (context) await context.tracing.stop({ path: '.vite/qnap-smoke-trace.zip' }).catch(() => {})
  try { globalThis.console.error(compose(['logs', '--tail', '35'])) } catch { /* Keep the original failure. */ }
  throw error
} finally {
  await browser?.close()
  try { compose(['down']) } catch { /* The smoke project may not have started. */ }
  for (const [command, name] of [
    [['rm', '-f'], restore], [['volume', 'rm'], project + '_web-assets'], [['volume', 'rm'], project + '_postgres'],
    [['image', 'rm'], previous.frontend], [['image', 'rm'], previous.backend],
  ]) {
    try { docker([...command, name], { stdio: 'pipe' }) } catch { /* It may not have been created. */ }
  }
  await rm(tmp, { recursive: true, force: true })
}

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../../src/components/anatomy/modelCache.js', import.meta.url), 'utf8')
const manifest = { version: 'test', files: { 'part.gz': 'abc123' }, lengths: { 'part.gz': [3] } }
let id = 0
const fresh = () => import(`data:text/javascript;base64,${Buffer.from(source.replace("import manifest from './cacheManifest.json'", `const manifest = ${JSON.stringify(manifest)}`) + `\n// ${id++}`).toString('base64')}`)

test('shared downloads, abort isolation, persistent hits and cache failure fallback', async () => {
  const originalFetch = globalThis.fetch
  const originalCaches = globalThis.caches
  try {
    const stored = new Map()
    globalThis.caches = {
      open: async () => ({ match: async url => stored.get(url)?.clone(), put: async (url, response) => stored.set(url, response) }),
      keys: async () => ['luxixi-anatomy-test', 'unrelated'],
      delete: async () => { throw Error('Must not delete unrelated cache') },
    }
    let calls = 0, release
    globalThis.fetch = async () => { calls++; await new Promise(resolve => { release = resolve }); return new Response('abc') }
    const api = await fresh()
    const controller = new AbortController()
    const background = api.getModelResponse('part.gz', { priority: 'low' })
    const cancelled = api.getModelResponse('part.gz', { signal: controller.signal })
    const foreground = api.getModelResponse('part.gz')
    const rejected = assert.rejects(cancelled, { name: 'AbortError' })
    controller.abort()
    while (!release) await new Promise(resolve => setImmediate(resolve))
    release()
    await rejected
    assert.equal(await (await background).text(), 'abc')
    assert.equal(await (await foreground).text(), 'abc')
    assert.equal(calls, 1, 'Background and viewer must share one download')
    assert.equal(await (await (await fresh()).getModelResponse('part.gz')).text(), 'abc')
    assert.equal(calls, 1, 'A new page instance must reuse persistent cache')

    globalThis.caches.open = async () => { throw Error('Quota/security error') }
    globalThis.fetch = async () => { calls++; return new Response('abc') }
    assert.equal(await (await (await fresh()).getModelResponse('part.gz')).text(), 'abc')

    const retryApi = await fresh()
    globalThis.fetch = async () => new Response('<html>wrong resource</html>')
    await assert.rejects(retryApi.getModelResponse('part.gz'), /不完整/)
    globalThis.fetch = async () => new Response('abc')
    assert.equal(await (await retryApi.getModelResponse('part.gz')).text(), 'abc')
  } finally {
    globalThis.fetch = originalFetch
    if (originalCaches === undefined) delete globalThis.caches
    else globalThis.caches = originalCaches
  }
})

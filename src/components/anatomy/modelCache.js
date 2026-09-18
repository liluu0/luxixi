import manifest from './cacheManifest.json'

const configuredModelRoot = import.meta.env?.VITE_ANATOMY_ASSET_BASE_URL?.replace(/\/+$/, '')
const modelRoot = configuredModelRoot || '/assets/anatomy'
const cacheName = `luxixi-anatomy-${manifest.version}`
const pending = new Map()
let cachePromise

function openCache() {
  // Cache Storage is optional (private mode, quota or unsupported browsers).
  if (!cachePromise) cachePromise = Promise.resolve().then(async () => {
    const cache = await caches.open(cacheName)
    // Remove only older caches owned by this feature, never unrelated site data.
    caches.keys().then(names => Promise.all(names
      .filter(name => name.startsWith('luxixi-anatomy-') && name !== cacheName)
      .map(name => caches.delete(name)))).catch(() => {})
    return cache
  }).catch(() => null)
  return cachePromise
}

function waitFor(promise, signal) {
  if (!signal) return promise
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'))
  return new Promise((resolve, reject) => {
    const abort = () => { cleanup(); reject(new DOMException('Aborted', 'AbortError')) }
    const cleanup = () => signal.removeEventListener('abort', abort)
    signal.addEventListener('abort', abort, { once: true })
    promise.then(value => { cleanup(); resolve(value) }, error => { cleanup(); reject(error) })
  })
}

export async function getModelResponse(name, { signal, priority = 'high' } = {}) {
  const hash = manifest.files[name]
  if (!hash) throw new Error('未知的模型资源，请刷新页面。')
  const url = `${modelRoot}/${name}?v=${hash.slice(0, 16)}`
  if (!pending.has(url)) {
    const request = (async () => {
      const cache = await openCache()
      try {
        const hit = await cache?.match(url)
        if (hit) return hit
      } catch { /* A disabled cache must not prevent model loading. */ }
      const response = await fetch(url, { priority, cache: 'force-cache' })
      if (!response.ok) throw new Error('模型资源加载失败，请重试。')
      // Consume the entire response before completing prefetch, keeping only
      // one background transfer active. No geometry decoding occurs here.
      const buffer = await response.arrayBuffer()
      if (!manifest.lengths[name].includes(buffer.byteLength)) throw new Error('模型资源不完整，请重试。')
      if (name === 'atlas.json') JSON.parse(new TextDecoder().decode(buffer))
      const headers = new Headers(response.headers)
      // Fetch may have decoded HTTP compression already; do not preserve a
      // misleading Content-Encoding on our reconstructed cache response.
      headers.delete('content-encoding')
      headers.delete('content-length')
      const complete = new Response(buffer, { status: 200, headers })
      try { await cache?.put(url, complete.clone()) } catch { /* Quota: continue without persistence. */ }
      return complete
    })()
    pending.set(url, request)
    // Rejections are not memoized. Navigation or retry can request again.
    request.then(() => pending.delete(url), () => pending.delete(url))
  }
  // Each consumer gets its own stream. Leaving home stops the queue, but lets
  // its one in-flight request finish so navigation can share that same download.
  const response = await waitFor(pending.get(url), signal)
  return response.clone()
}

export async function loadAtlas(signal, priority = 'high') {
  const response = await getModelResponse('atlas.json', { signal, priority })
  return response.json()
}

export function prepareAnatomyModel() {
  let stopped = false
  let timer
  let idle
  let queue = ['atlas.json']
  const connection = navigator.connection
  const constrained = () => connection?.saveData || /(^|-)2g$|^3g$/.test(connection?.effectiveType || '')
  function schedule() {
    if (stopped || !queue.length || constrained()) return
    timer = setTimeout(() => {
      if (stopped) return
      if ('requestIdleCallback' in window) idle = requestIdleCallback(run)
      else run()
    }, 1500)
  }
  async function run() {
    if (stopped || constrained()) return
    if (document.hidden || [...document.querySelectorAll('.gallery-slide img')].some(img => !img.complete)) {
      schedule()
      return
    }
    const name = queue.shift()
    try {
      const response = await getModelResponse(name, { priority: 'low' })
      if (name === 'atlas.json') {
        const atlas = await response.json()
        queue = atlas.chunks.map(chunk => chunk.gzip.split('/').pop())
      }
    } catch { /* Background failure is silent; the viewer can retry later. */ }
    schedule()
  }
  if (document.readyState === 'complete') schedule()
  else window.addEventListener('load', schedule, { once: true })
  return () => {
    stopped = true
    clearTimeout(timer)
    if ('cancelIdleCallback' in window) cancelIdleCallback(idle)
    window.removeEventListener('load', schedule)
  }
}

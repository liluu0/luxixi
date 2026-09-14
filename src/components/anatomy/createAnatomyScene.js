import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { SYSTEMS, loadChunk } from './anatomyData'

export function createAnatomyScene(host, atlas, callbacks) {
  const abort = new AbortController()
  let disposed = false, ready = false, frame = 0, dirty = true
  let state = { visible: [], selected: [], isolated: false, explode: 0, mode: 'solid', clip: false, clipPosition: 0, rotate: false, scan: true }
  let extent = 0, lastTime = performance.now(), lastHover = 0, down = null, motion = null
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' })
  renderer.setClearColor('#0b1115')
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 768 ? 1.25 : 1.75))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.18
  renderer.localClippingEnabled = true
  const canvas = renderer.domElement
  canvas.setAttribute('aria-label', '交互式人体三维模型')
  canvas.tabIndex = 0
  host.appendChild(canvas)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(34, 1, .005, 30)
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = .09
  controls.minDistance = .09
  controls.maxDistance = 8
  controls.maxPolarAngle = Math.PI * .95
  controls.autoRotateSpeed = .45
  controls.addEventListener('change', () => { dirty = true })
  controls.addEventListener('start', () => { motion = null })
  scene.add(new THREE.HemisphereLight(0xc9e4ee, 0x243836, 1.6))
  const key = new THREE.DirectionalLight(0xfff1e4, 3.2)
  key.position.set(-2, 3, 4)
  const rim = new THREE.DirectionalLight(0x70dbe6, 2.8)
  rim.position.set(2, 2, -2)
  const fill = new THREE.DirectionalLight(0xe8eefe, .7)
  fill.position.set(0, 1, 3)
  scene.add(key, rim, fill)
  const ground = new THREE.GridHelper(4, 40, 0x365054, 0x243337)
  ground.position.y = -.018
  ground.material.transparent = true
  ground.material.opacity = .28
  scene.add(ground)
  const rings = [0.5, .62].map(radius => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius, radius + .003, 128), new THREE.MeshBasicMaterial({ color: 0x5ddbc6, transparent: true, opacity: .36, side: THREE.DoubleSide }))
    ring.rotation.x = -Math.PI / 2
    ring.position.y = -.015
    scene.add(ring)
    return ring
  })
  const scanPlane = new THREE.Mesh(new THREE.PlaneGeometry(.78, .62), new THREE.MeshBasicMaterial({ color: 0x61e4cc, transparent: true, opacity: .05, side: THREE.DoubleSide, depthWrite: false }))
  scanPlane.rotation.x = -Math.PI / 2
  scene.add(scanPlane)
  const scanBorder = new THREE.LineSegments(new THREE.EdgesGeometry(scanPlane.geometry), new THREE.LineBasicMaterial({ color: 0x70e8d2, transparent: true, opacity: .55 }))
  scanPlane.add(scanBorder)
  const clipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0)
  const highlight = new THREE.Box3Helper(new THREE.Box3(), 0x9ff7e4)
  highlight.material.transparent = true
  highlight.material.opacity = .65
  highlight.visible = false
  scene.add(highlight)
  const batches = new Map(), records = new Map()
  const totalBounds = new THREE.Box3()
  const bySystem = new Map(SYSTEMS.map(system => [system.id, []]))
  atlas.parts.forEach(part => {
    bySystem.get(part.system)?.push(part)
    totalBounds.union(new THREE.Box3(new THREE.Vector3().fromArray(part.bounds[0]), new THREE.Vector3().fromArray(part.bounds[1])))
  })
  const systemColors = new Map(SYSTEMS.map(system => [system.id, new THREE.Color(system.color)]))
  for (const system of SYSTEMS) {
    const parts = bySystem.get(system.id)
    if (!parts.length) continue
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .56, metalness: .12, side: THREE.DoubleSide })
    const batch = new THREE.BatchedMesh(parts.length, parts.reduce((n, p) => n + p.vertexCount, 0), parts.reduce((n, p) => n + p.indexCount, 0), material)
    batch.frustumCulled = false
    batch.perObjectFrustumCulled = false
    batch.userData.parts = new Map()
    scene.add(batch)
    batches.set(system.id, batch)
  }
  const matrix = new THREE.Matrix4(), shift = new THREE.Vector3()
  const selectedTint = new THREE.Color('#75f2da')
  const instanceColor = new THREE.Color()
  const shown = record => state.isolated ? state.selected.includes(record.part.id) : state.visible.includes(record.part.system) || state.selected.includes(record.part.id)
  const spreadGroups = [
    ['skeletal', 'connective'],
    ['muscular'],
    ['cardiac', 'arterial', 'venous'],
    ['nervous', 'sensory'],
    ['respiratory', 'digestive', 'urinary', 'endocrine', 'lymphatic', 'reproductive'],
    ['integumentary'],
  ]
  const spreadOffsets = new Map()
  let currentView = 'quarter'
  const viewDirection = view => (view === 'front' ? new THREE.Vector3(0, .025, 1) : view === 'back' ? new THREE.Vector3(0, .025, -1) : view === 'side' ? new THREE.Vector3(1, .025, 0) : new THREE.Vector3(.28, .04, 1)).normalize()
  function arrangeSystems(view) {
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), viewDirection(view)).normalize()
    const activeGroups = spreadGroups.map(systems => {
      let min = Infinity, max = -Infinity
      for (const part of atlas.parts) {
        if (!systems.includes(part.system) || !shown({ part })) continue
        const [lo, hi] = part.bounds
        const x1 = lo[0] * right.x, x2 = hi[0] * right.x
        const z1 = lo[2] * right.z, z2 = hi[2] * right.z
        min = Math.min(min, Math.min(x1, x2) + Math.min(z1, z2))
        max = Math.max(max, Math.max(x1, x2) + Math.max(z1, z2))
      }
      return { systems, min, max, width: max - min }
    }).filter(group => Number.isFinite(group.width))
    const gap = .16
    const totalWidth = activeGroups.reduce((sum, group) => sum + group.width, 0) + Math.max(0, activeGroups.length - 1) * gap
    let cursor = -totalWidth / 2
    spreadOffsets.clear()
    // Move entire anatomical assemblies rigidly; never stretch individual bones or vessels.
    for (const group of activeGroups) {
      const translation = right.clone().multiplyScalar(cursor - group.min)
      group.systems.forEach(system => spreadOffsets.set(system, translation))
      cursor += group.width + gap
    }
  }
  function offset(part, amount, target = new THREE.Vector3()) {
    const translation = spreadOffsets.get(part.system)
    return translation ? target.copy(translation).multiplyScalar(amount) : target.set(0, 0, 0)
  }
  function applyState() {
    const selected = new Set(state.selected)
    const selectionBox = new THREE.Box3()
    batches.forEach((batch, system) => {
      const material = batch.material
      const transparent = state.mode === 'xray' || system === 'integumentary'
      if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true }
      material.depthWrite = !transparent
      material.wireframe = state.mode === 'wireframe'
      material.clippingPlanes = state.clip ? [clipPlane] : []
      material.emissive.set(state.mode === 'xray' ? '#215b59' : '#000000')
      material.emissiveIntensity = .35
    })
    clipPlane.constant = state.clipPosition * .45
    records.forEach(record => {
      const { part, batch, instance } = record
      const isSelected = selected.has(part.id), visible = shown(record)
      batch.setVisibleAt(instance, visible)
      offset(part, extent, shift)
      batch.setMatrixAt(instance, matrix.makeTranslation(shift.x, shift.y, shift.z))
      // Keep the anatomy system hue in focus views; selection adds a mint lift instead of replacing it.
      const baseColor = systemColors.get(part.system) || new THREE.Color('#aac6b6')
      const color = instanceColor.copy(baseColor)
      if (isSelected) color.lerp(selectedTint, .24)
      const alpha = part.system === 'integumentary' ? .1 : state.mode === 'xray' && !isSelected ? .18 : 1
      batch.setColorAt(instance, new THREE.Vector4(color.r, color.g, color.b, alpha))
      if (isSelected && visible) selectionBox.union(record.bounds.clone().translate(shift))
    })
    highlight.visible = !selectionBox.isEmpty()
    if (highlight.visible) highlight.box.copy(selectionBox).expandByScalar(.008)
    dirty = true
  }
  function targetBounds(selection = false) {
    const box = new THREE.Box3()
    records.forEach(record => {
      if ((selection && state.selected.includes(record.part.id)) || (!selection && shown(record))) {
        box.union(record.bounds.clone().translate(offset(record.part, state.explode)))
      }
    })
    return box.isEmpty() ? totalBounds.clone() : box
  }
  function fit(view = currentView, selection = false, immediate = false) {
    currentView = view
    arrangeSystems(view)
    applyState()
    const box = targetBounds(selection), center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3())
    const direction = viewDirection(view)
    const right = new THREE.Vector3().crossVectors(camera.up, direction).normalize()
    const up = new THREE.Vector3().crossVectors(direction, right)
    const tanFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    let distance = .11
    for (const x of [-.5, .5]) for (const y of [-.5, .5]) for (const z of [-.5, .5]) {
      const corner = new THREE.Vector3(size.x * x, size.y * y, size.z * z)
      distance = Math.max(distance, corner.dot(direction) + Math.max(Math.abs(corner.dot(up)) / tanFov, Math.abs(corner.dot(right)) / (tanFov * camera.aspect)))
    }
    distance *= 1.23
    controls.maxDistance = Math.max(8, distance * 1.5)
    const position = center.clone().addScaledVector(direction.normalize(), distance)
    if (immediate || reducedMotion) { camera.position.copy(position); controls.target.copy(center); controls.update() }
    else motion = { from: camera.position.clone(), to: position, fromTarget: controls.target.clone(), target: center, start: performance.now() }
    dirty = true
  }
  function resize() {
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
    fit(currentView, state.isolated, true)
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(host)
  resize()
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2()
  function pick(event) {
    const rect = canvas.getBoundingClientRect()
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects([...batches.values()], false)
    return hits.find(hit => {
      const part = hit.object.userData.parts.get(hit.batchId)
      return part && part.system !== 'integumentary' && (!state.clip || clipPlane.distanceToPoint(hit.point) >= 0)
    })
  }
  function pointerDown(event) {
    down = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
    callbacks.onHover(null)
  }
  function pointerMove(event) {
    if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) down.moved = true
    if (event.buttons || !ready || performance.now() - lastHover < 110 || event.pointerType === 'touch') return
    lastHover = performance.now()
    const hit = pick(event)
    const part = hit?.object.userData.parts.get(hit.batchId)
    canvas.style.cursor = part ? 'pointer' : 'grab'
    const rect = canvas.getBoundingClientRect()
    callbacks.onHover(part ? { name: part.name, x: Math.min(event.clientX - rect.left + 14, rect.width - 205), y: Math.max(12, event.clientY - rect.top - 35) } : null)
  }
  function pointerUp(event) {
    if (down?.id === event.pointerId && !down.moved && ready) {
      const hit = pick(event)
      if (hit) callbacks.onSelect(hit.object.userData.parts.get(hit.batchId))
    }
    down = null
  }
  function cancelPointer() { down = null; callbacks.onHover(null) }
  function onKey(event) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', 'Home'].includes(event.key)) return
    event.preventDefault()
    if (event.key === 'Home') fit()
    else if (event.key === '+' || event.key === '-') zoom(event.key === '+' ? .85 : 1.15)
    else {
      const relative = camera.position.clone().sub(controls.target)
      const spherical = new THREE.Spherical().setFromVector3(relative)
      if (event.key === 'ArrowLeft') spherical.theta -= .12
      if (event.key === 'ArrowRight') spherical.theta += .12
      if (event.key === 'ArrowUp') spherical.phi -= .08
      if (event.key === 'ArrowDown') spherical.phi += .08
      spherical.makeSafe()
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical))
      controls.update()
    }
  }
  function zoom(scale) {
    const direction = camera.position.clone().sub(controls.target)
    direction.setLength(THREE.MathUtils.clamp(direction.length() * scale, controls.minDistance, controls.maxDistance))
    camera.position.copy(controls.target).add(direction)
    controls.update()
    dirty = true
  }
  const contextLost = event => { event.preventDefault(); ready = false; callbacks.onError('图形会话已中断，请重新加载模型。') }
  canvas.addEventListener('pointerdown', pointerDown)
  canvas.addEventListener('pointermove', pointerMove)
  canvas.addEventListener('pointerup', pointerUp)
  canvas.addEventListener('pointercancel', cancelPointer)
  canvas.addEventListener('pointerleave', () => callbacks.onHover(null))
  canvas.addEventListener('keydown', onKey)
  canvas.addEventListener('webglcontextlost', contextLost)

  async function load() {
    let cursor = 0, loaded = 0
    try {
      await Promise.all(Array.from({ length: 3 }, async () => {
        while (cursor < atlas.chunks.length && !disposed) {
          const chunkId = cursor++
          const buffer = await loadChunk(atlas.chunks[chunkId], abort.signal)
          if (disposed) return
          for (const part of atlas.parts.filter(p => p.chunk === chunkId)) {
            const geometry = new THREE.BufferGeometry()
            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer, part.positions, part.vertexCount * 3), 3))
            geometry.setAttribute('normal', new THREE.BufferAttribute(new Int16Array(buffer, part.normals, part.vertexCount * 3), 3, true))
            geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(buffer, part.indices, part.indexCount), 1))
            const batch = batches.get(part.system)
            const instance = batch.addInstance(batch.addGeometry(geometry))
            batch.userData.parts.set(instance, part)
            const bounds = new THREE.Box3(new THREE.Vector3().fromArray(part.bounds[0]), new THREE.Vector3().fromArray(part.bounds[1]))
            records.set(part.id, { part, batch, instance, bounds })
            geometry.dispose()
          }
          loaded++
          applyState()
          callbacks.onProgress(Math.round(loaded / atlas.chunks.length * 100))
          await new Promise(resolve => setTimeout(resolve, 0))
        }
      }))
      if (!disposed) { ready = true; applyState(); callbacks.onReady(); fit(currentView, state.isolated, true) }
    } catch (error) {
      if (!disposed) { abort.abort(); callbacks.onError(error.message || '模型加载失败，请重试。') }
    }
  }
  function animate(now) {
    if (disposed) return
    frame = requestAnimationFrame(animate)
    const dt = Math.min((now - lastTime) / 1000, .06)
    lastTime = now
    if (Math.abs(extent - state.explode) > .0001) {
      extent = reducedMotion ? state.explode : THREE.MathUtils.damp(extent, state.explode, 8, dt)
      applyState()
    }
    if (motion) {
      const t = Math.min(1, (now - motion.start) / 650), ease = 1 - Math.pow(1 - t, 3)
      camera.position.lerpVectors(motion.from, motion.to, ease)
      controls.target.lerpVectors(motion.fromTarget, motion.target, ease)
      if (t === 1) motion = null
      dirty = true
    }
    scanPlane.visible = state.scan && !state.isolated && !reducedMotion && ready
    if (scanPlane.visible) { scanPlane.position.y = (now / 5000 % 1) * 1.8; dirty = true }
    controls.autoRotate = state.rotate && ready && !reducedMotion
    controls.update(dt)
    if (dirty) { renderer.render(scene, camera); dirty = false }
  }
  frame = requestAnimationFrame(animate)
  load()
  return {
    update(next) {
      const previous = state
      state = { ...state, ...next }
      arrangeSystems(currentView)
      applyState()
      if (state.isolated !== previous.isolated || state.explode !== previous.explode || (state.explode && state.visible.join() !== previous.visible.join())) fit(currentView, state.isolated)
    },
    fit, zoom,
    capture() {
      renderer.render(scene, camera)
      const link = document.createElement('a')
      link.download = 'luxixi-anatomy.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    },
    dispose() {
      disposed = true
      abort.abort()
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      controls.dispose()
      batches.forEach(batch => { batch.material.dispose(); batch.dispose() })
      for (const object of [ground, ...rings, scanPlane, scanBorder, highlight]) {
        object.geometry?.dispose()
        object.material?.dispose()
      }
      renderer.dispose()
      canvas.remove()
    },
  }
}

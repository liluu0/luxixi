import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { modelUrl } from './assets'

export const viewpoints = [
  { id: 'arrival', label: '湖畔全景', note: '跨过湖面，望见山间的一座微光之城。', position: [85, 92, 225], target: [8, 32, 0] },
  { id: 'west', label: '西侧回廊', note: '尖塔、拱廊与层叠的石墙，勾勒圣殿的侧影。', position: [-109, 111, 193], target: [0, 30, 0] },
  { id: 'garden', label: '中央庭园', note: '沿着修剪整齐的绿篱，走向庭园中央的天球仪。', position: [12, 66, 93], target: [0, 23, 12] },
  { id: 'dome', label: '鎏金穹顶', note: '金色的肋线向上汇聚，让建筑与星空相遇。', position: [76, 85, 100], target: [27, 48, -4] },
]

export function createSanctuaryScene(host, { onProgress, onInteraction, onError }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.95
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.shadowMap.autoUpdate = false
  renderer.domElement.tabIndex = 0
  renderer.domElement.setAttribute('aria-label', '湖心圣殿三维模型。拖动旋转，滚轮缩放，右键拖动平移。')
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#172731')
  scene.fog = new THREE.FogExp2('#172731', 0.0015)
  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 2200)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.075
  controls.minDistance = 28
  controls.maxDistance = 850
  controls.maxPolarAngle = Math.PI * 0.485
  controls.autoRotateSpeed = 0.35
  controls.listenToKeyEvents(renderer.domElement)
  // Keep panning close to the island, rather than letting the focus get lost.
  controls.cursor.set(5, 25, 0)
  controls.maxTargetRadius = 65

  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environment = pmrem.fromScene(room, 0.04)
  scene.environment = environment.texture
  scene.environmentIntensity = 0.3
  room.dispose()
  pmrem.dispose()
  scene.add(new THREE.HemisphereLight('#b8d7ef', '#37434a', 0.85))
  const sun = new THREE.DirectionalLight('#ffddb5', 2.0)
  sun.position.set(-70, 130, 100)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -145, right: 145, top: 120, bottom: -120, near: 1, far: 400 })
  sun.shadow.bias = -0.0002
  sun.shadow.normalBias = 0.12
  scene.add(sun)
  const rim = new THREE.DirectionalLight('#91bde8', 1.5)
  rim.position.set(80, 65, -100)
  scene.add(rim)

  const draco = new DRACOLoader()
  draco.setDecoderPath('/assets/castle-battle/draco/')
  draco.setWorkerLimit(2)
  const loader = new GLTFLoader().setDRACOLoader(draco)
  const abort = new AbortController()
  let disposed = false
  let model
  let frame
  let tween
  let dirty = true
  let lastTime = 0
  let currentView = viewpoints[0]
  const materials = new Set()
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

  function disposeModel(root) {
    const geometries = new Set()
    const mats = new Set()
    const textures = new Set()
    root.traverse(object => {
      if (object.geometry) geometries.add(object.geometry)
      if (object.material) for (const material of [].concat(object.material)) {
        mats.add(material)
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value)
      }
    })
    geometries.forEach(g => g.dispose())
    mats.forEach(m => m.dispose())
    textures.forEach(t => t.dispose())
  }

  function targetPosition(view) {
    const target = new THREE.Vector3(...view.target)
    // Preserve the full island in portrait aspect ratios too.
    const distanceScale = Math.max(1, 1.6 / camera.aspect)
    return new THREE.Vector3(...view.position).sub(target).multiplyScalar(Math.min(distanceScale, 3.2)).add(target)
  }
  function setView(id, instant = false) {
    currentView = viewpoints.find(v => v.id === id) || viewpoints[0]
    const position = targetPosition(currentView)
    const target = new THREE.Vector3(...currentView.target)
    controls.autoRotate = false
    if (instant || reducedMotion) {
      tween = null
      camera.position.copy(position)
      controls.target.copy(target)
      controls.update()
    } else {
      tween = { start: performance.now(), from: camera.position.clone(), focus: controls.target.clone(), position, target }
    }
    dirty = true
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect()
    if (!width || !height) return
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
    const wasRotating = controls.autoRotate
    if (currentView) setView(currentView.id, true)
    controls.autoRotate = wasRotating
    dirty = true
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()

  function interact() {
    tween = null
    currentView = null
    controls.autoRotate = false
    onInteraction()
  }
  controls.addEventListener('start', interact)
  const markDirty = () => { dirty = true }
  controls.addEventListener('change', markDirty)
  function lost(event) {
    event.preventDefault()
    cancelAnimationFrame(frame)
    controls.enabled = false
    onError('图形上下文已中断，请重新加载三维场景。')
  }
  renderer.domElement.addEventListener('webglcontextlost', lost)

  function tick(time) {
    if (disposed) return
    frame = requestAnimationFrame(tick)
    const delta = Math.min((time - lastTime) / 1000, 0.05)
    lastTime = time
    if (document.hidden) return
    if (tween) {
      const t = Math.min((time - tween.start) / 1100, 1)
      const ease = t * t * (3 - 2 * t)
      camera.position.lerpVectors(tween.from, tween.position, ease)
      controls.target.lerpVectors(tween.focus, tween.target, ease)
      if (t === 1) tween = null
      dirty = true
    }
    controls.update(delta)
    if (dirty) {
      renderer.render(scene, camera)
      dirty = false
    }
  }
  frame = requestAnimationFrame(tick)

  return {
    async load() {
      const response = await fetch(modelUrl, { signal: abort.signal })
      if (!response.ok) throw new Error(`模型请求失败 (${response.status})`)
      const total = Number(response.headers.get('content-length'))
      const reader = response.body.getReader()
      const chunks = []
      let received = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        received += value.length
        onProgress(total ? Math.min(90, Math.round(received / total * 90)) : 0)
      }
      const buffer = new Uint8Array(received)
      let offset = 0
      for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length }
      if (disposed) return
      const gltf = await loader.parseAsync(buffer.buffer, '')
      if (disposed) { disposeModel(gltf.scene); return }
      model = gltf.scene
      model.traverse(object => {
        if (!object.isMesh) return
        object.castShadow = !['Lake water', 'Alpine mountain rock', 'Snow on high ridges'].includes(object.material?.name)
        object.receiveShadow = true
        for (const material of [].concat(object.material)) {
          if (materials.has(material)) continue
          materials.add(material)
          if (material.name === 'Lake water') {
            // Avoid a full-resolution transmission pass for the enormous lake.
            material.transmission = 0
            material.roughness = 0.22
            material.metalness = 0.55
          }
        }
      })
      scene.add(model)
      renderer.shadowMap.needsUpdate = true
      renderer.render(scene, camera)
      dirty = true
      onProgress(100)
    },
    setView,
    setRotate(value) { tween = null; controls.autoRotate = value; dirty = true },
    setWireframe(value) { materials.forEach(m => { m.wireframe = value }); dirty = true },
    setVisible(value) { renderer.domElement.style.visibility = value ? 'visible' : 'hidden'; controls.enabled = value; dirty = true },
    dispose() {
      disposed = true
      abort.abort()
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.removeEventListener('start', interact)
      controls.removeEventListener('change', markDirty)
      controls.dispose()
      draco.dispose()
      if (model) disposeModel(model)
      environment.dispose()
      sun.shadow.map?.dispose()
      renderer.domElement.removeEventListener('webglcontextlost', lost)
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    },
  }
}

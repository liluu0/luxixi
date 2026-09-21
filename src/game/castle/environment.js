import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import level from './level.json'
import { createInterior } from './interior.js'


const BASE_URL = import.meta.env.BASE_URL
const ASSET_URL = `${BASE_URL}assets/castle-battle/aurelia-sanctuary-v4.glb`
const DRACO_URL = `${BASE_URL}assets/castle-battle/draco/`
const COURTYARD_AREAS = level.courtyardAreas?.length ? level.courtyardAreas : [level.arena]

const sourceName = (object) => object.name.replaceAll('_', ' ')

function configureMaterial(material) {
  if (!material || !material.isMeshStandardMaterial) return
  material.roughness = Math.max(material.roughness ?? 0.8, 0.66)
  material.metalness = Math.min(material.metalness ?? 0, 0.24)
  // Browser gameplay uses opaque stone/glass shading; transmission creates a costly second pass.
  if ('transmission' in material) material.transmission = 0
  if (material.transparent || material.side === THREE.DoubleSide) material.forceSinglePass = true
  material.envMapIntensity = 0.22
  const name = String(material.name || '').replaceAll('_', ' ').toLowerCase()
  const colors = {
    'weathered limestone': 0x6f716d,
    'carved pale stone': 0x85877e,
    'recessed stone': 0x343b3d,
    'oxidized lead roof': 0x26383d,
    'old gilded bronze': 0x765b37,
    'weathered granite': 0x4e5a5b,
    'alpine mountain rock': 0x596568,
    'snow on high ridges': 0xa9b5b3,
    'alpine foliage': 0x374d3a,
    'clipped box hedges': 0x465a3d,
    'tree bark': 0x50453e,
    'v3 leaf replacement green': 0x35533a,
    'v4 lawn | layered natural turf': 0x365c38,
    'v4 lawn | fine grass blades': 0x416a3d,
    'v4 ground support | rich garden soil': 0x44392d,
  }
  if (colors[name]) material.color.setHex(colors[name])
  if (name.includes('layered natural turf')) {
    material.roughness = 0.96
    material.metalness = 0
    // The turf sits only millimetres above several stone/soil support meshes.
    // Pull its depth forward slightly so grazing camera angles remain stable.
    material.polygonOffset = true
    material.polygonOffsetFactor = -2
    material.polygonOffsetUnits = -2
  }
  if (name.includes('layered natural turf')) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTurfNoiseScale = { value: 0.42 }
      shader.vertexShader = shader.vertexShader
        .replace('varying vec3 vViewPosition;', 'varying vec3 vViewPosition;\nvarying vec3 vTurfWorldPosition;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n\tvTurfWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;')
      shader.fragmentShader = shader.fragmentShader
        .replace('varying vec3 vViewPosition;', 'varying vec3 vViewPosition;\nvarying vec3 vTurfWorldPosition;\nuniform float uTurfNoiseScale;')
        .replace('#include <common>', `
          #include <common>
          float turfHash(vec2 p) {
            p = fract(p * vec2(123.34, 345.45));
            p += dot(p, p + 34.345);
            return fract(p.x * p.y);
          }
          float turfNoise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(turfHash(i), turfHash(i + vec2(1, 0)), f.x),
                       mix(turfHash(i + vec2(0, 1)), turfHash(i + vec2(1, 1)), f.x), f.y);
          }
        `)
        .replace('#include <color_fragment>', `
          #include <color_fragment>
          float turfPatch = turfNoise(vTurfWorldPosition.xz * uTurfNoiseScale);
          float turfGrain = turfNoise(vTurfWorldPosition.xz * 7.5);
          diffuseColor.rgb *= 0.7 + turfPatch * 0.38 + turfGrain * 0.1;
          float dryTip = smoothstep(0.72, 0.94, turfNoise(vTurfWorldPosition.xz * 2.3 + 11.0));
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.12, 1.04, 0.78), dryTip * 0.22);
        `)
    }
    material.customProgramCacheKey = () => 'castle-turf-world-noise-v1'
    material.needsUpdate = true
  }
  if (name.includes('bronze')) {
    material.metalness = 0.65
    material.roughness = 0.42
  }
  if (name.includes('warm interior') || name.includes('glazing')) {
    material.emissive = new THREE.Color(0xb4532a)
    material.emissiveIntensity = 0.72
  }
  if (name.includes('water')) {
    material.color = new THREE.Color(0x1b353c)
    material.roughness = 0.34
    material.metalness = 0.22
    material.transparent = true
    material.opacity = 0.76
    material.forceSinglePass = true
  }
  if (name.includes('stone') || name.includes('granite') || name.includes('limestone') || name.includes('lead roof')) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uCastleNoiseScale = { value: name.includes('roof') ? 0.22 : 0.34 }
      shader.vertexShader = shader.vertexShader
        .replace('varying vec3 vViewPosition;', 'varying vec3 vViewPosition;\nvarying vec3 vCastleWorldPosition;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n\tvCastleWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;')
      shader.fragmentShader = shader.fragmentShader
        .replace('varying vec3 vViewPosition;', 'varying vec3 vViewPosition;\nvarying vec3 vCastleWorldPosition;\nuniform float uCastleNoiseScale;')
        .replace('#include <common>', `
          #include <common>
          float castleHash(vec3 p) {
            p = fract(p * 0.1031);
            p += dot(p, p.yzx + 33.33);
            return fract((p.x + p.y) * p.z);
          }
          float castleNoise(vec3 p) {
            vec3 i = floor(p);
            vec3 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(mix(castleHash(i), castleHash(i + vec3(1,0,0)), f.x),
                  mix(castleHash(i + vec3(0,1,0)), castleHash(i + vec3(1,1,0)), f.x), f.y),
              mix(mix(castleHash(i + vec3(0,0,1)), castleHash(i + vec3(1,0,1)), f.x),
                  mix(castleHash(i + vec3(0,1,1)), castleHash(i + vec3(1,1,1)), f.x), f.y), f.z);
          }
        `)
        .replace('#include <color_fragment>', `
          #include <color_fragment>
          float mottle = castleNoise(vCastleWorldPosition * uCastleNoiseScale);
          float grain = castleNoise(vCastleWorldPosition * 17.0);
          float damp = castleNoise(vCastleWorldPosition * vec3(1.7, 0.12, 1.7));
          diffuseColor.rgb *= (0.68 + mottle * 0.4) * (0.92 + grain * 0.16);
          diffuseColor.rgb = mix(diffuseColor.rgb * vec3(0.68, 0.78, 0.75), diffuseColor.rgb, smoothstep(0.18, 0.6, damp));
        `)
    }
    material.customProgramCacheKey = () => `castle-stone-world-noise-${name.includes('roof') ? 'roof' : 'stone'}`
    material.needsUpdate = true
  }
}

function addWater(scene) {
  const geometry = new THREE.PlaneGeometry(900, 900, 48, 48)
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const z = position.getZ(i)
    position.setY(i, -0.12 + Math.sin(x * 0.09 + z * 0.07) * 0.018 + Math.cos(z * 0.14) * 0.012)
  }
  geometry.computeVertexNormals()
  const pixels = new Uint8Array(64 * 64 * 4)
  for (let y = 0; y < 64; y += 1) {
    for (let x = 0; x < 64; x += 1) {
      const i = (y * 64 + x) * 4
      pixels[i] = 128 + 26 * Math.sin(x * Math.PI / 8 + Math.sin(y * Math.PI / 16))
      pixels[i + 1] = 128 + 16 * Math.cos(y * Math.PI / 4 + x * Math.PI / 16)
      pixels[i + 2] = 248
      pixels[i + 3] = 255
    }
  }
  const normalMap = new THREE.DataTexture(pixels, 64, 64)
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping
  normalMap.repeat.set(28, 28)
  normalMap.magFilter = THREE.LinearFilter
  normalMap.minFilter = THREE.LinearFilter
  normalMap.needsUpdate = true
  const material = new THREE.MeshStandardMaterial({
    color: 0x254851,
    roughness: 0.36,
    metalness: 0.2,
    normalMap,
    normalScale: new THREE.Vector2(0.16, 0.1),
  })
  const water = new THREE.Mesh(geometry, material)
  water.name = 'Web lightweight lake surface'
  water.receiveShadow = true
  scene.add(water)
  return water
}

function addLighting(scene, renderer, group) {
  scene.background = new THREE.Color(0x3e5158)
  scene.fog = new THREE.FogExp2(0x3b4a4e, 0.0028)

  const hemi = new THREE.HemisphereLight(0x839ba8, 0x26282a, 0.82)
  hemi.name = 'Castle twilight hemisphere'
  group.add(hemi)

  const sun = new THREE.DirectionalLight(0xe0b28e, 1.45)
  sun.name = 'Castle moonset key light'
  sun.position.set(-22, 34, 28)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 120
  sun.shadow.camera.left = -22
  sun.shadow.camera.right = 22
  sun.shadow.camera.top = 22
  sun.shadow.camera.bottom = -22
  sun.shadow.bias = -0.0003
  sun.shadow.normalBias = 0.05
  sun.target.position.set(0, 10, 5)
  group.add(sun, sun.target)

  for (const [x, z, color, intensity] of [[0, 5, 0xff9b55, 18], [-7, 7, 0xff8b4f, 12], [7, 7, 0xffa25f, 12]]) {
    const lamp = new THREE.PointLight(color, intensity, 20, 2)
    lamp.position.set(x, 12.2, z)
    lamp.castShadow = false
    group.add(lamp)
  }

  if (!renderer) return null
  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const env = pmrem.fromScene(room, 0.04)
  scene.environment = env.texture
  scene.environmentIntensity = 0.18
  renderer.toneMappingExposure = Math.min(renderer.toneMappingExposure ?? 1, 0.9)
  room.dispose()
  pmrem.dispose()
  return env
}

function triangleGeometry(mesh, predicate) {
  const source = mesh.geometry
  const positions = source.getAttribute('position')
  const index = source.index
  const count = index ? index.count : positions.count
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const ab = new THREE.Vector3()
  const ac = new THREE.Vector3()
  const selected = []
  for (let i = 0; i < count; i += 3) {
    a.fromBufferAttribute(positions, index ? index.getX(i) : i).applyMatrix4(mesh.matrixWorld)
    b.fromBufferAttribute(positions, index ? index.getX(i + 1) : i + 1).applyMatrix4(mesh.matrixWorld)
    c.fromBufferAttribute(positions, index ? index.getX(i + 2) : i + 2).applyMatrix4(mesh.matrixWorld)
    ab.subVectors(b, a)
    ac.subVectors(c, a)
    const normal = ab.cross(ac).normalize()
    if (predicate(a, b, c, normal)) selected.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(selected, 3))
  geometry.setIndex(Array.from({ length: selected.length / 3 }, (_, index) => index))
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function disposeMaterial(material) {
  for (const value of Object.values(material)) if (value?.isTexture) value.dispose()
  material.dispose()
}

function insideCourtyard(x, z) {
  return COURTYARD_AREAS.some(area => x >= area.minX && x <= area.maxX && z >= area.minZ && z <= area.maxZ)
}

function courtyardBoundaryObstacles() {
  const xStops = [...new Set(COURTYARD_AREAS.flatMap(area => [area.minX, area.maxX]))].sort((a, b) => a - b)
  const zStops = [...new Set(COURTYARD_AREAS.flatMap(area => [area.minZ, area.maxZ]))].sort((a, b) => a - b)
  const segments = []
  const epsilon = 0.01
  const addSegment = (axis, coordinate, start, end, outward) => {
    const previous = segments.at(-1)
    if (previous && previous.axis === axis && previous.coordinate === coordinate
      && previous.outward === outward && Math.abs(previous.end - start) < 1e-6) {
      previous.end = end
      return
    }
    segments.push({ axis, coordinate, start, end, outward })
  }

  for (const x of xStops) {
    for (let index = 0; index < zStops.length - 1; index += 1) {
      const start = zStops[index]
      const end = zStops[index + 1]
      const midpoint = (start + end) / 2
      const negativeInside = insideCourtyard(x - epsilon, midpoint)
      const positiveInside = insideCourtyard(x + epsilon, midpoint)
      if (negativeInside !== positiveInside) addSegment('x', x, start, end, positiveInside ? -1 : 1)
    }
  }
  for (const z of zStops) {
    for (let index = 0; index < xStops.length - 1; index += 1) {
      const start = xStops[index]
      const end = xStops[index + 1]
      const midpoint = (start + end) / 2
      const negativeInside = insideCourtyard(midpoint, z - epsilon)
      const positiveInside = insideCourtyard(midpoint, z + epsilon)
      if (negativeInside !== positiveInside) addSegment('z', z, start, end, positiveInside ? -1 : 1)
    }
  }

  return segments.map((segment, index) => {
    const length = segment.end - segment.start
    const midpoint = (segment.start + segment.end) / 2
    return {
      id: `arenaBoundary${index + 1}`,
      type: 'box',
      position: segment.axis === 'x'
        ? [segment.coordinate + segment.outward * 0.4, 12, midpoint]
        : [midpoint, 12, segment.coordinate + segment.outward * 0.4],
      size: segment.axis === 'x' ? [0.5, 6, length + 1] : [length + 1, 6, 0.5],
    }
  })
}

function obstacleCopies() {
  const obstacles = level.obstacles.map(obstacle => ({
    id: obstacle.id,
    type: obstacle.type,
    position: [...obstacle.position],
    ...(obstacle.rotation ? { rotation: obstacle.rotation } : {}),
    ...(obstacle.type === 'box'
      ? { size: [...obstacle.size] }
      : { radius: obstacle.radius, height: obstacle.height }),
  }))
  return [...obstacles, ...courtyardBoundaryObstacles()]
}

export async function loadEnvironment(scene, renderer, onProgress) {
  const draco = new DRACOLoader()
  draco.setDecoderPath(DRACO_URL)
  draco.setWorkerLimit(2)
  const loader = new GLTFLoader()
  loader.setDRACOLoader(draco)

  let gltf
  try {
    gltf = await new Promise((resolve, reject) => loader.load(ASSET_URL, resolve, event => {
      onProgress?.(event.total ? event.loaded / event.total : 0.45)
    }, reject))
  } finally { draco.dispose() }

  const model = gltf.scene
  model.name = 'Aurelia castle sanctuary'
  {
    // v4 was authored at twice the gameplay scale. Bring the exported scene
    // into the same metre-based coordinate frame as characters and physics.
    model.scale.setScalar(0.5)
  }
  model.updateMatrixWorld(true)
  const previous = {
    background: scene.background,
    fog: scene.fog,
    environment: scene.environment,
    environmentIntensity: scene.environmentIntensity,
    exposure: renderer?.toneMappingExposure,
  }
  const decoration = new THREE.Group()
  decoration.name = 'Castle lake and twilight lights'
  scene.add(model, decoration)
  const groundMeshes = []
  const detached = []
  const surfaces = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  model.traverse((object) => {
    if (!object.isMesh) return
    const name = sourceName(object)
    if (name.startsWith('Lake |') || /fine blades/i.test(name)) {
      // The exported blade triangles shimmer heavily at gameplay distance and
      // also become thousands of tiny collision faces. The stable turf plane
      // beneath them preserves the lawn silhouette without temporal flicker.
      detached.push(object)
      return
    }
    object.castShadow = /^(Western cathedral|Grand observatory|Grand rotunda|Armillary Fountain)/.test(name)
    object.receiveShadow = true
    if (Array.isArray(object.material)) object.material.forEach(configureMaterial)
    else configureMaterial(object.material)
    if (!(/water|glazing|foliage|hedges|bark|bronze|iron|lamp|lantern/i.test(object.material?.name || name))) {
      const geometry = triangleGeometry(object, (a, b, c, normal) => {
        const x = (a.x+b.x+c.x)/3, z = (a.z+b.z+c.z)/3
        // Include walls spanning above the character, not only short triangles.
        // Otherwise the follow camera passes through the native door and facade.
        const nearPlayableArea = COURTYARD_AREAS.some(area => x >= area.minX-1 && x <= area.maxX+1 && z >= area.minZ-2 && z <= area.maxZ+1)
        return nearPlayableArea && Math.max(a.y,b.y,c.y) >= 9.5 && Math.min(a.y,b.y,c.y) <= 18
      })
      if (geometry.getAttribute('position').count) {
        const surface = new THREE.Mesh(geometry, surfaces)
        surface.name = `Walkable ${name}`
        surface.updateMatrixWorld(true)
        groundMeshes.push(surface)
      } else geometry.dispose()
    }
  })
  for (const object of detached) {
    object.removeFromParent()
    object.geometry.dispose()
  }
  // Thousands of Blender detail objects otherwise issue thousands of draw calls.
  // Bake their world transforms once, after extracting physics geometry.
  const batches = new Map()
  const originals = []
  model.traverse(object => {
    if (!object.isMesh || Array.isArray(object.material)) return
    let geometry = object.geometry.clone().applyMatrix4(object.matrixWorld)
    if (geometry.index) { const flat = geometry.toNonIndexed(); geometry.dispose(); geometry = flat }
    for (const key of Object.keys(geometry.attributes)) {
      if (!['position', 'normal', 'uv'].includes(key)) geometry.deleteAttribute(key)
    }
    if (!geometry.attributes.normal) geometry.computeVertexNormals()
    if (!geometry.attributes.uv) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2))
    const key = `${object.material.uuid}-${object.castShadow}`
    if (!batches.has(key)) batches.set(key, { material: object.material, shadow: object.castShadow, geometries: [] })
    batches.get(key).geometries.push(geometry)
    originals.push(object)
  })
  for (const object of originals) object.removeFromParent()
  const oldGeometries = new Set(originals.map(object => object.geometry))
  oldGeometries.forEach(geometry => geometry.dispose())
  // The batches contain world coordinates; undo the root scale on the batch group.
  const mergedRoot = new THREE.Group()
  mergedRoot.scale.setScalar(1 / model.scale.x)
  model.add(mergedRoot)
  for (const { material, shadow, geometries } of batches.values()) {
    const geometry = mergeGeometries(geometries, false)
    geometries.forEach(part => part.dispose())
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = `Merged ${material.name || 'castle material'}`
    mesh.castShadow = shadow
    mesh.receiveShadow = true
    mergedRoot.add(mesh)
  }
  const water = addWater(decoration)
  const environmentTarget = addLighting(scene, renderer, decoration)
  const interior = createInterior()
  scene.add(interior.root)
  const outdoor = { background: scene.background, fog: scene.fog }
  let activeZone = 'courtyard'

  const raycaster = new THREE.Raycaster()
  const onGround = (point) => {
    raycaster.set(new THREE.Vector3(point[0], 12, point[2]), new THREE.Vector3(0, -1, 0))
    const hit = raycaster.intersectObjects(groundMeshes, false)[0]
    return [point[0], hit ? hit.point.y + 0.015 : point[1], point[2]]
  }

  let disposed = false
  return {
    model,
    modelUrl: ASSET_URL,
    interior,
    // Native rotunda door measured in the same half-scale frame as physics.
    entrance: onGround(level.entrance),
    groundMeshes,
    spawn: onGround(level.spawn),
    enemySpawns: level.enemySpawns.map(onGround),
    obstacles: [
      ...obstacleCopies(),
      ...interior.obstacles,
    ],
    setZone(zone) {
      activeZone = zone
      const inside = zone === 'interior'
      model.visible = !inside
      decoration.visible = !inside
      interior.root.visible = inside
      scene.background = inside ? new THREE.Color(0x141b22) : outdoor.background
      scene.fog = inside ? new THREE.Fog(0x2b3540, 18, 65) : outdoor.fog
      scene.environmentIntensity = inside ? 0.38 : 0.18
      if (renderer) renderer.toneMappingExposure = inside ? 1.08 : 0.9
    },
    update(elapsedSeconds) {
      if (activeZone === 'interior') interior.update(elapsedSeconds)
      else {
        water.material.normalMap.offset.set(elapsedSeconds * 0.003, elapsedSeconds * 0.0013)

      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      interior.dispose()

      const materials = new Set()
      const disposeObject = (object) => {
        if (!object.isMesh) return
        object.geometry?.dispose()
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material)
      }
      model.traverse(disposeObject)
      decoration.traverse(disposeObject)
      for (const object of detached) materials.add(object.material)
      for (const surface of groundMeshes) surface.geometry.dispose()
      for (const material of materials) if (material) disposeMaterial(material)
      surfaces.dispose()
      environmentTarget?.dispose()
      decoration.traverse((object) => object.shadow?.dispose())
      if (scene.environment === environmentTarget?.texture) scene.environment = previous.environment
      scene.environmentIntensity = previous.environmentIntensity
      if (renderer && previous.exposure !== undefined) renderer.toneMappingExposure = previous.exposure
      scene.background = previous.background
      scene.fog = previous.fog
      scene.remove(model, decoration)
    },
  }
}

export { level }

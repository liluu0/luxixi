import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import level from './level.json'

const BASE_URL = import.meta.env.BASE_URL
const ASSET_URL = `${BASE_URL}assets/castle-battle/castle-sanctuary-lite.glb`
const DRACO_URL = `${BASE_URL}assets/castle-battle/draco/`

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
  }
  if (colors[name]) material.color.setHex(colors[name])
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

function walkableSurface(a, b, c, normal) {
  if (normal.y < 0.7) return false
  const yMin = Math.min(a.y, b.y, c.y)
  const yMax = Math.max(a.y, b.y, c.y)
  return yMin >= 9.5 && yMax <= 10.76 && Math.max(Math.abs(a.x), Math.abs(b.x), Math.abs(c.x)) <= 33
}

function outsideCourtyard(a, b, c) {
  const x = (a.x + b.x + c.x) / 3
  const z = (a.z + b.z + c.z) / 3
  return Math.abs(x) > 8.1 || z < -2.8 || z > 13.4
}

function disposeMaterial(material) {
  for (const value of Object.values(material)) if (value?.isTexture) value.dispose()
  material.dispose()
}

function obstacleCopies() {
  return level.obstacles.map((obstacle) => ({
    id: obstacle.id,
    type: obstacle.type,
    position: [...obstacle.position],
    ...(obstacle.type === 'box' ? { size: [...obstacle.size] } : { radius: obstacle.radius, height: obstacle.height }),
  }))
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
  } finally {
    draco.dispose()
  }

  const model = gltf.scene
  model.name = 'Aurelia castle sanctuary'
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
    if (name.startsWith('Lake |')) {
      detached.push(object)
      return
    }
    if (name.startsWith('Island vegetation')) {
      const geometry = triangleGeometry(object, outsideCourtyard)
      object.geometry.dispose()
      object.geometry = geometry
      object.position.set(0, 0, 0)
      object.quaternion.identity()
      object.scale.set(1, 1, 1)
    }
    object.castShadow = /^(Western cathedral|Grand observatory|Grand rotunda|Armillary Fountain)/.test(name)
    object.receiveShadow = true
    if (Array.isArray(object.material)) object.material.forEach(configureMaterial)
    else configureMaterial(object.material)
    if (level.groundMeshPrefixes.some((prefix) => name.startsWith(prefix))) {
      const geometry = triangleGeometry(object, walkableSurface)
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
  const water = addWater(decoration)
  const environmentTarget = addLighting(scene, renderer, decoration)

  const raycaster = new THREE.Raycaster()
  const onGround = (point) => {
    raycaster.set(new THREE.Vector3(point[0], 20, point[2]), new THREE.Vector3(0, -1, 0))
    const hit = raycaster.intersectObjects(groundMeshes, false)[0]
    return [point[0], hit ? hit.point.y + 0.015 : point[1], point[2]]
  }

  let disposed = false
  return {
    model,
    groundMeshes,
    spawn: onGround(level.spawn),
    enemySpawns: level.enemySpawns.map(onGround),
    obstacles: obstacleCopies(),
    update(elapsedSeconds) {
      water.material.normalMap.offset.set(elapsedSeconds * 0.003, elapsedSeconds * 0.0013)
    },
    dispose() {
      if (disposed) return
      disposed = true
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

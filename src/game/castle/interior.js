import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const CENTER_X = 80
const FLOOR_Y = 10.5

function randomGenerator(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
}

function canvasTexture(width, height, paint) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  paint(context, width, height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function masonryTexture(floor = false) {
  const random = randomGenerator(floor ? 491 : 176)
  return canvasTexture(1024, 1024, (ctx, width, height) => {
    ctx.fillStyle = floor ? '#393c3b' : '#373d3e'
    ctx.fillRect(0, 0, width, height)
    const columns = floor ? 4 : 5
    const rows = floor ? 4 : 8
    const tileWidth = width / columns
    const tileHeight = height / rows
    for (let row = 0; row < rows; row++) {
      for (let column = -1; column <= columns; column++) {
        const offset = floor ? 0 : (row % 2) * tileWidth / 2
        const x = column * tileWidth + offset
        const y = row * tileHeight
        const gray = Math.floor((floor ? 113 : 117) + random() * 27)
        ctx.fillStyle = `rgb(${gray},${gray + 5},${gray + 3})`
        ctx.fillRect(x + 3, y + 3, tileWidth - 6, tileHeight - 6)
        ctx.strokeStyle = 'rgba(213,214,194,0.16)'
        ctx.lineWidth = 3
        ctx.strokeRect(x + 5, y + 5, tileWidth - 10, tileHeight - 10)
        ctx.fillStyle = 'rgba(28,35,36,0.14)'
        ctx.fillRect(x + 4, y + tileHeight - 10, tileWidth - 7, 5)
        for (let mark = 0; mark < 90; mark++) {
          ctx.fillStyle = random() > 0.5 ? 'rgba(233,226,209,0.06)' : 'rgba(25,40,43,0.08)'
          ctx.fillRect(x + random() * tileWidth, y + random() * tileHeight, 4 + random() * 28, 1 + random() * 10)
        }
        if (random() > 0.65) {
          ctx.beginPath()
          const start = x + tileWidth * random()
          ctx.moveTo(start, y + 4)
          ctx.lineTo(start + 9, y + tileHeight * 0.3)
          ctx.lineTo(start - 6, y + tileHeight * 0.48)
          ctx.strokeStyle = 'rgba(29,37,38,0.17)'
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      }
    }
    for (let mark = 0; mark < 9000; mark++) {
      ctx.fillStyle = random() > 0.5 ? 'rgba(18,32,32,0.045)' : 'rgba(247,232,212,0.06)'
      ctx.fillRect(random() * width, random() * height, 1 + random() * 3, 1 + random() * 3)
    }
  })
}

function woodTexture() {
  const random = randomGenerator(324)
  return canvasTexture(512, 1024, (ctx, width, height) => {
    ctx.fillStyle = '#383532'
    ctx.fillRect(0, 0, width, height)
    for (let plank = 0; plank < 8; plank++) {
      const shade = 45 + Math.floor(random() * 21)
      ctx.fillStyle = `rgb(${shade + 9},${shade + 6},${shade + 2})`
      ctx.fillRect(plank * 64 + 2, 0, 60, height)
      for (let grain = 0; grain < 32; grain++) {
        const x = plank * 64 + 4 + random() * 55
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.bezierCurveTo(x + random() * 15, height * 0.34, x - random() * 15, height * 0.74, x + 3, height)
        ctx.strokeStyle = random() > 0.5 ? 'rgba(175,158,133,0.08)' : 'rgba(9,13,16,0.13)'
        ctx.lineWidth = 0.5 + random() * 2
        ctx.stroke()
      }
    }
  })
}

function drawCrest(ctx, x, y, scale) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.strokeStyle = '#c1aa70'
  ctx.fillStyle = '#b6a06c'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(-58, -87)
  ctx.lineTo(58, -87)
  ctx.lineTo(53, 12)
  ctx.quadraticCurveTo(42, 52, 0, 79)
  ctx.quadraticCurveTo(-42, 52, -53, 12)
  ctx.closePath()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(0, 52)
  ctx.lineTo(0, -59)
  ctx.moveTo(-29, -9)
  ctx.lineTo(29, -9)
  ctx.moveTo(-21, -37)
  ctx.lineTo(0, -67)
  ctx.lineTo(21, -37)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, -20, 27, Math.PI * 0.12, Math.PI * 0.88)
  ctx.stroke()
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4
    const xx = Math.sin(a) * 84
    const yy = Math.cos(a) * 84 - 8
    ctx.beginPath()
    ctx.moveTo(xx, yy - 4)
    ctx.lineTo(xx + 3, yy)
    ctx.lineTo(xx, yy + 4)
    ctx.lineTo(xx - 3, yy)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

function textileTexture(teal = false, runner = false) {
  const random = randomGenerator(teal ? 845 : 537)
  return canvasTexture(512, runner ? 2048 : 1024, (ctx, width, height) => {
    ctx.fillStyle = teal ? '#244b50' : '#662c39'
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = '#9b8256'
    ctx.lineWidth = 4
    ctx.strokeRect(19, 19, width - 38, height - 38)
    ctx.lineWidth = 2
    ctx.strokeRect(31, 31, width - 62, height - 62)
    for (let y = 65; y < height - 40; y += 48) {
      for (const x of [49, width - 49]) {
        ctx.beginPath()
        ctx.moveTo(x, y - 14)
        ctx.lineTo(x + 9, y)
        ctx.lineTo(x, y + 14)
        ctx.lineTo(x - 9, y)
        ctx.closePath()
        ctx.stroke()
      }
    }
    drawCrest(ctx, width / 2, runner ? 470 : 374, runner ? 1.45 : 1.65)
    if (runner) drawCrest(ctx, width / 2, height - 460, 1.45)
    else {
      ctx.strokeStyle = 'rgba(178,160,114,0.42)'
      for (let i = 0; i < 6; i++) {
        const y = 620 + i * 40
        ctx.beginPath()
        ctx.moveTo(155 - i * 6, y)
        ctx.quadraticCurveTo(256, y + 50, 357 + i * 6, y)
        ctx.stroke()
      }
    }
    for (let y = 0; y < height; y += 3) {
      ctx.fillStyle = 'rgba(4,13,18,0.11)'
      ctx.fillRect(0, y, width, 1)
    }
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = 'rgba(190,177,151,0.045)'
      ctx.fillRect(random() * width, random() * height, random() * 12, 1)
    }
  })
}

function glassTexture(teal = false) {
  return canvasTexture(256, 768, (ctx, width, height) => {
    ctx.fillStyle = '#243d42'
    ctx.fillRect(0, 0, width, height)
    const colors = teal ? ['#489598', '#416677', '#b5ab78', '#884452'] : ['#a3495b', '#677e94', '#b0a379', '#367977']
    for (let row = -1; row < 9; row++) {
      for (let column = -1; column < 4; column++) {
        const x = column * 85 + (row % 2 ? 43 : 0)
        const y = row * 97
        ctx.beginPath()
        ctx.moveTo(x, y - 47)
        ctx.lineTo(x + 43, y)
        ctx.lineTo(x, y + 47)
        ctx.lineTo(x - 43, y)
        ctx.closePath()
        ctx.fillStyle = colors[((row + column + 24) % colors.length)]
        ctx.fill()
        ctx.strokeStyle = '#182a30'
        ctx.lineWidth = 5
        ctx.stroke()
        ctx.strokeStyle = 'rgba(216,210,174,0.27)'
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }
    ctx.strokeStyle = '#bcb38b'
    ctx.lineWidth = 3
    ctx.strokeRect(12, 12, width - 24, height - 24)
    drawCrest(ctx, width / 2, height * 0.5, 0.66)
  })
}

function pointedShape(width, height) {
  const shape = new THREE.Shape()
  const half = width / 2
  const spring = height * 0.66
  shape.moveTo(-half, 0)
  shape.lineTo(half, 0)
  shape.lineTo(half, spring)
  shape.quadraticCurveTo(half * 0.95, height * 0.86, 0, height)
  shape.quadraticCurveTo(-half * 0.95, height * 0.86, -half, spring)
  shape.closePath()
  return shape
}

export function createInterior() {
  const root = new THREE.Group()
  root.name = 'The Hall of the Ashen Crown'
  root.position.set(CENTER_X, FLOOR_Y, 0)
  root.visible = false
  const resources = new Set()
  const materials = new Set()
  const textures = new Set()
  const obstacles = []
  const flames = []
  const random = randomGenerator(2187)
  const material = (options) => {
    const result = new THREE.MeshStandardMaterial({ roughness: 0.82, envMapIntensity: 0.15, ...options })
    materials.add(result)
    return result
  }
  const texture = (result) => { textures.add(result); return result }
  const stoneMap = texture(masonryTexture())
  stoneMap.wrapS = stoneMap.wrapT = THREE.RepeatWrapping
  stoneMap.repeat.set(2, 2)
  const floorMap = texture(masonryTexture(true))
  floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping
  floorMap.repeat.set(6, 10.66)
  const woodMap = texture(woodTexture())
  woodMap.wrapS = woodMap.wrapT = THREE.RepeatWrapping
  const stone = material({ color: 0xabb2ac, map: stoneMap, bumpMap: stoneMap, bumpScale: 0.055 })
  const cutStone = material({ color: 0x808b89, bumpMap: stoneMap, bumpScale: 0.018, roughness: 0.83 })
  const paleStone = material({ color: 0xa2ada7, bumpMap: stoneMap, bumpScale: 0.014, roughness: 0.81 })
  const recessed = material({ color: 0x303c40, roughness: 0.94 })
  const floor = material({ color: 0xa4ada7, map: floorMap, bumpMap: floorMap, bumpScale: 0.028, roughness: 0.73 })
  const wood = material({ color: 0xa5a096, map: woodMap, bumpMap: woodMap, bumpScale: 0.035 })
  const darkWood = material({ color: 0x474440, roughness: 0.85 })
  const iron = material({ color: 0x344348, metalness: 0.72, roughness: 0.42 })
  const bronze = material({ color: 0xa99a6e, metalness: 0.72, roughness: 0.38 })
  const velvet = material({ color: 0x662a3b, roughness: 0.97 })
  const parchment = material({ color: 0xc0bca2, roughness: 0.91 })
  const runner = material({ map: texture(textileTexture(false, true)), roughness: 0.99 })
  const tapestry = [false, true].map(teal => material({ map: texture(textileTexture(teal)), roughness: 0.98, side: THREE.DoubleSide }))
  const glass = [false, true].map(teal => {
    const map = texture(glassTexture(teal))
    return material({ color: 0xffffff, map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0.65, roughness: 0.57 })
  })
  const bookMaterials = [0x476466, 0x6c3d4d, 0x6b674e, 0x354856, 0x7e7862].map(color => material({ color, roughness: 0.9 }))
  const wax = material({ color: 0xd3cbb4, roughness: 0.85 })
  const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xffd2a3, toneMapped: false })
  materials.add(flameMaterial)

  for (const surface of [stone, cutStone, paleStone, floor]) {
    const isFloor = surface === floor
    surface.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader
        .replace('varying vec3 vViewPosition;', 'varying vec3 vViewPosition;\nvarying vec3 vHallPosition;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvHallPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;')
      shader.fragmentShader = shader.fragmentShader
        .replace('varying vec3 vViewPosition;', 'varying vec3 vViewPosition;\nvarying vec3 vHallPosition;')
        .replace('#include <color_fragment>', `
          #include <color_fragment>
          float stoneGrain = sin(vHallPosition.x * 12.3 + sin(vHallPosition.z * 8.7)) * sin(vHallPosition.y * 16.4 + vHallPosition.z * 4.1);
          diffuseColor.rgb *= 0.96 + stoneGrain * 0.035;
          ${isFloor ? `
            float hallEdge = min(8.7 - abs(vHallPosition.x - 80.0), min(vHallPosition.z + 23.7, 7.7 - vHallPosition.z));
            diffuseColor.rgb *= mix(0.58, 1.0, smoothstep(0.0, 1.35, hallEdge));
          ` : `
            float risingDamp = smoothstep(10.52, 12.15, vHallPosition.y);
            diffuseColor.rgb *= mix(vec3(0.63, 0.70, 0.68), vec3(1.0), risingDamp);
          `}
        `)
    }
    surface.customProgramCacheKey = () => `hall-aged-stone-${isFloor ? 'floor' : 'vertical'}`
  }

  function mesh(parent, geometry, mat, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
    resources.add(geometry)
    const object = new THREE.Mesh(geometry, mat)
    object.position.set(...position)
    object.rotation.set(...rotation)
    object.scale.set(...scale)
    object.receiveShadow = true
    object.castShadow = false
    parent.add(object)
    return object
  }
  function group(name, position = [0, 0, 0], rotation = [0, 0, 0]) {
    const object = new THREE.Group()
    object.name = name
    object.position.set(...position)
    object.rotation.set(...rotation)
    root.add(object)
    return object
  }
  const box = (parent, mat, position, size, rotation) => mesh(parent, new THREE.BoxGeometry(...size), mat, position, rotation)
  const cylinder = (parent, mat, position, radius, height, topRadius = radius, segments = 12) => mesh(parent, new THREE.CylinderGeometry(topRadius, radius, height, segments), mat, position)
  const ball = (parent, mat, position, scale) => mesh(parent, new THREE.SphereGeometry(1, 10, 6), mat, position, [0, 0, 0], scale)
  const torus = (parent, mat, position, radius, tube, rotation = [0, 0, 0], scale = [1, 1, 1]) => mesh(parent, new THREE.TorusGeometry(radius, tube, 5, 24), mat, position, rotation, scale)
  function beam(parent, mat, from, to, radius = 0.1, segments = 8) {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const object = cylinder(parent, mat, a.clone().add(b).multiplyScalar(0.5).toArray(), radius, a.distanceTo(b), radius, segments)
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize())
    return object
  }
  function tube(parent, mat, points, radius = 0.09, segments = 24) {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)))
    return mesh(parent, new THREE.TubeGeometry(curve, segments, radius, 6, false), mat)
  }
  function collider(id, type, position, options) {
    obstacles.push({ id: `interior-${id}`, type, position: [CENTER_X + position[0], FLOOR_Y + position[1], position[2]], ...options })
  }
  function solidBox(id, mat, position, size) {
    box(root, mat, position, size)
    collider(id, 'box', position, { size })
  }
  function arch(parent, width, height, spring, depth, mat = paleStone) {
    const half = width / 2
    const points = []
    for (let i = 0; i <= 16; i++) {
      const t = i / 16
      const x = -half * (1 - t) * (1 - t) - half * 0.8 * 2 * (1 - t) * t
      const y = spring * (1 - t) * (1 - t) + height * 0.88 * 2 * (1 - t) * t + height * t * t
      points.push([x, y, 0])
    }
    for (let i = 1; i <= 16; i++) {
      const t = i / 16
      const x = half * 0.8 * 2 * (1 - t) * t + half * t * t
      const y = height * (1 - t) * (1 - t) + height * 0.88 * 2 * (1 - t) * t + spring * t * t
      points.push([x, y, 0])
    }
    tube(parent, mat, points, depth, 40)
    return points
  }
  function archPanel(parent, mat, width, height, position) {
    const geometry = new THREE.ShapeGeometry(pointedShape(width, height), 16)
    const uv = geometry.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + width / 2) / width, uv.getY(i) / height)
    return mesh(parent, geometry, mat, position)
  }

  // One continuous floor and enclosed perimeter make every interior position recoverable.
  solidBox('foundation', cutStone, [0, -0.35, -8], [18.7, 0.7, 32.7])
  mesh(root, new THREE.PlaneGeometry(18, 32), floor, [0, 0.006, -8], [-Math.PI / 2, 0, 0])
  solidBox('west-wall', stone, [-9.05, 5.8, -8], [0.7, 11.6, 32.7])
  solidBox('east-wall', stone, [9.05, 5.8, -8], [0.7, 11.6, 32.7])
  solidBox('north-wall', stone, [0, 5.8, -24.05], [18.7, 11.6, 0.7])
  solidBox('south-wall', stone, [0, 5.8, 8.05], [18.7, 11.6, 0.7])
  mesh(root, new THREE.PlaneGeometry(3.1, 24), runner, [0, 0.025, -6.5], [-Math.PI / 2, 0, 0])
  for (const side of [-1, 1]) {
    box(root, cutStone, [side * 8.62, 0.28, -8], [0.3, 0.56, 32])
    box(root, paleStone, [side * 8.51, 0.59, -8], [0.4, 0.1, 32])
    box(root, cutStone, [side * 8.67, 2.25, -8], [0.15, 0.16, 32])
    box(root, paleStone, [side * 8.53, 8.55, -8], [0.42, 0.28, 32])
    box(root, wood, [side * 4.5, 10.77, -8], [10.02, 0.24, 32], [0, 0, side * -0.452])
    box(root, darkWood, [side * 7.4, 9.22, -8], [0.18, 0.22, 32])
    box(root, darkWood, [side * 4.25, 10.75, -8], [0.2, 0.24, 32])
    box(root, darkWood, [side * 1.55, 12.0, -8], [0.18, 0.25, 32])
  }
  box(root, darkWood, [0, 12.65, -8], [0.26, 0.26, 32])

  const bays = [3, -3, -9, -15, -21]
  for (let index = 0; index < bays.length; index++) {
    const z = bays[index]
    for (const side of [-1, 1]) {
      const x = side * 5.2
      const pillar = group(`Clustered nave pier ${side} ${index}`, [x, 0, z])
      cylinder(pillar, cutStone, [0, 0.14, 0], 0.53, 0.28, 0.53, 8)
      cylinder(pillar, paleStone, [0, 0.33, 0], 0.43, 0.15, 0.49, 8)
      cylinder(pillar, cutStone, [0, 3.43, 0], 0.29, 6.15, 0.26, 12)
      for (let flute = 0; flute < 6; flute++) {
        const angle = flute * Math.PI / 3
        cylinder(pillar, paleStone, [Math.sin(angle) * 0.245, 3.48, Math.cos(angle) * 0.245], 0.073, 6.15, 0.062, 8)
      }
      for (const y of [0.46, 3.3, 6.36]) cylinder(pillar, cutStone, [0, y, 0], 0.355, 0.11, 0.355, 12)
      cylinder(pillar, paleStone, [0, 6.66, 0], 0.34, 0.36, 0.49, 8)
      box(pillar, cutStone, [0, 6.93, 0], [0.98, 0.18, 0.98])
      for (let leaf = 0; leaf < 8; leaf++) {
        const angle = leaf * Math.PI / 4
        ball(pillar, paleStone, [Math.sin(angle) * 0.38, 6.69, Math.cos(angle) * 0.38], [0.09, 0.15, 0.09])
      }
      collider(`pier-${side}-${index}`, 'cylinder', [x, 3.6, z], { radius: 0.53, height: 7.2 })
      box(root, cutStone, [side * 8.64, 4.53, z], [0.32, 7.84, 0.48])
      box(root, paleStone, [side * 8.52, 6.95, z], [0.49, 0.2, 0.7])
      beam(root, darkWood, [side * 8.6, 8.65, z], [0, 12.65, z], 0.16, 4)
      beam(root, wood, [side * 5.2, 7.12, z], [side * 3.35, 10.95, z], 0.11, 4)
      beam(root, darkWood, [side * 5.2, 8.1, z], [side * 5.2, 10.14, z], 0.10, 4)
    }
    const span = group(`Pointed nave arch ${index}`, [0, 0, z])
    arch(span, 10.4, 10.65, 6.98, 0.2)
    arch(span, 9.86, 10.28, 6.98, 0.065, cutStone)
    ball(span, bronze, [0, 10.62, 0], [0.21, 0.13, 0.22])
    if (index < bays.length - 1) {
      const next = bays[index + 1]
      for (const side of [-1, 1]) {
        const aisle = group(`Longitudinal arcade ${side} ${index}`, [side * 5.2, 0, (z + next) / 2], [0, Math.PI / 2, 0])
        arch(aisle, 6, 8.58, 6.93, 0.14, cutStone)
        const ribPoints = [[side * 5.1, 7.05, z], [side * 3.4, 9.4, z - 1.2], [0, 10.72, z - 3], [-side * 3.4, 9.4, next + 1.2], [-side * 5.1, 7.05, next]]
        tube(root, cutStone, ribPoints, 0.08, 32)
      }
    }
  }

  function addWindow(side, z, index) {
    const window = group(`Stained glass bay ${side} ${index}`, [side * 8.68, 3.1, z], [0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0])
    archPanel(window, recessed, 3.08, 5.1, [0, -0.1, 0.025])
    arch(window, 3.15, 5.04, 3.3, 0.105, paleStone)
    for (const half of [-1, 1]) {
      archPanel(window, glass[(index + (side > 0 ? 1 : 0)) % 2], 1.23, 4.23, [half * 0.7, 0.13, 0.06])
      const lancet = new THREE.Group()
      lancet.position.set(half * 0.7, 0.13, 0.07)
      window.add(lancet)
      arch(lancet, 1.27, 4.3, 2.84, 0.065, cutStone)
      box(lancet, cutStone, [-0.635, 1.48, 0], [0.105, 2.96, 0.12])
      box(lancet, cutStone, [0.635, 1.48, 0], [0.105, 2.96, 0.12])
      for (const yy of [1.18, 2.4]) box(lancet, iron, [0, yy, 0.025], [1.24, 0.028, 0.025])
    }
    torus(window, paleStone, [0, 4.31, 0.13], 0.35, 0.06)
    for (let petal = 0; petal < 4; petal++) {
      const a = petal * Math.PI / 2
      torus(window, cutStone, [Math.cos(a) * 0.135, 4.31 + Math.sin(a) * 0.135, 0.13], 0.135, 0.028)
    }
    box(window, paleStone, [0, 0, 0.16], [3.4, 0.23, 0.45])
  }
  for (const side of [-1, 1]) [0, -6, -12, -18].forEach((z, index) => addWindow(side, z, index))

  function addBanner(position, rotation, teal = false, scale = 1) {
    const banner = group('Woven oath banner', position, rotation)
    mesh(banner, new THREE.PlaneGeometry(1.55 * scale, 3.1 * scale, 8, 14), tapestry[teal ? 1 : 0], [0, 0, 0.04])
    beam(banner, bronze, [-0.96 * scale, 1.61 * scale, 0.08], [0.96 * scale, 1.61 * scale, 0.08], 0.038)
    for (const side of [-1, 1]) ball(banner, bronze, [side * 1.01 * scale, 1.61 * scale, 0.08], [0.066, 0.066, 0.066])
    for (let tassel = 0; tassel < 14; tassel++) beam(banner, bronze, [(-0.7 + tassel * 0.108) * scale, -1.54 * scale, 0.04], [(-0.7 + tassel * 0.108) * scale, -1.64 * scale, 0.04], 0.008, 5)
    const geometry = banner.children[0].geometry
    const positions = geometry.attributes.position
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      positions.setZ(i, Math.sin(x * 13) * 0.029 + Math.sin(y * 2 + x) * 0.015)
    }
    geometry.computeVertexNormals()
  }
  addBanner([-8.61, 4.7, 5.4], [0, Math.PI / 2, 0], false, 0.88)
  addBanner([8.61, 4.7, 5.4], [0, -Math.PI / 2, 0], true, 0.88)
  addBanner([-3.25, 4.75, -23.66], [0, 0, 0], true, 1.15)
  addBanner([3.25, 4.75, -23.66], [0, 0, 0], false, 1.15)

  function addDoor() {
    const door = group('Inner oak gate to the courtyard', [0, 0, 7.64], [0, Math.PI, 0])
    archPanel(door, recessed, 3.75, 4.7, [0, 0, 0])
    archPanel(door, wood, 3.24, 4.25, [0, 0.02, 0.045])
    arch(door, 3.7, 4.62, 3.06, 0.18)
    arch(door, 3.39, 4.39, 2.95, 0.055, bronze)
    for (const side of [-1, 1]) {
      box(door, paleStone, [side * 1.84, 1.53, 0], [0.35, 3.07, 0.36])
      for (let i = 0; i < 4; i++) box(door, darkWood, [side * (0.2 + i * 0.38), 1.6, 0.1], [0.035, 3.1, 0.06])
      for (const y of [0.59, 1.37, 2.63]) {
        box(door, iron, [side * 0.81, y, 0.11], [1.53, 0.105, 0.065])
        for (const x of [0.21, 0.55, 1.2, 1.47]) ball(door, bronze, [side * x, y, 0.16], [0.035, 0.035, 0.022])
      }
      box(door, bronze, [side * 0.24, 1.57, 0.17], [0.18, 0.31, 0.055])
      torus(door, iron, [side * 0.24, 1.5, 0.23], 0.115, 0.025)
    }
    box(door, bronze, [0, 1.53, 0.14], [0.04, 3.06, 0.04])
    addBanner([-4.8, 4.7, 7.61], [0, Math.PI, 0], false, 1.1)
    addBanner([4.8, 4.7, 7.61], [0, Math.PI, 0], true, 1.1)
  }
  addDoor()

  function candle(parent, x, y, z, height = 0.26) {
    cylinder(parent, bronze, [x, y + 0.04, z], 0.105, 0.08)
    cylinder(parent, wax, [x, y + 0.08 + height / 2, z], 0.05, height, 0.046, 8)
    const flame = ball(parent, flameMaterial, [x, y + 0.11 + height, z], [0.035, 0.1, 0.035])
    flame.userData.dynamic = true
    flame.userData.restY = flame.scale.y
    flames.push(flame)
  }
  function chandelier(z, index) {
    const fitting = group(`Crown chandelier ${index}`, [0, 6.5, z])
    torus(fitting, iron, [0, 0, 0], 1.23, 0.065, [Math.PI / 2, 0, 0])
    torus(fitting, bronze, [0, -0.06, 0], 1.18, 0.025, [Math.PI / 2, 0, 0])
    beam(fitting, iron, [0, 0.13, 0], [0, 5.85, 0], 0.024, 6)
    cylinder(fitting, bronze, [0, 0.14, 0], 0.18, 0.3, 0.11)
    ball(fitting, bronze, [0, -0.09, 0], [0.13, 0.17, 0.13])
    for (let arm = 0; arm < 10; arm++) {
      const a = arm * Math.PI / 5
      const x = Math.sin(a) * 1.23
      const zz = Math.cos(a) * 1.23
      if (arm % 2 === 0) beam(fitting, iron, [0, 1.43, 0], [x, 0.02, zz], 0.025, 6)
      beam(fitting, iron, [0, 0.05, 0], [x, 0.05, zz], 0.026, 6)
      candle(fitting, x, 0.035, zz, 0.23 + (arm % 3) * 0.06)
    }
  }
  chandelier(-1.5, 0)
  chandelier(-12.4, 1)

  function cabinet(side, z, index) {
    const shelf = group(`Library oak case ${side} ${index}`, [side * 8.25, 0, z], [0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0])
    box(shelf, wood, [0, 1.6, -0.12], [2.25, 3.2, 0.45])
    box(shelf, recessed, [0, 1.6, 0.135], [2.01, 2.85, 0.06])
    box(shelf, cutStone, [0, 0.1, 0], [2.39, 0.2, 0.64])
    for (const xx of [-1.06, 1.06]) box(shelf, wood, [xx, 1.65, 0.23], [0.14, 3.16, 0.17])
    for (let row = 0; row < 5; row++) {
      const y = 0.33 + row * 0.56
      box(shelf, wood, [0, y, 0.19], [2.1, 0.08, 0.51])
      let cursor = -0.91
      while (cursor < 0.88) {
        const width = 0.075 + random() * 0.065
        const height = 0.28 + random() * 0.18
        box(shelf, bookMaterials[Math.floor(random() * bookMaterials.length)], [cursor + width / 2, y + height / 2 + 0.04, 0.25], [width, height, 0.26])
        for (const yy of [0.09, height - 0.045]) box(shelf, bronze, [cursor + width / 2, y + yy, 0.39], [width * 0.87, 0.016, 0.012])
        cursor += width + 0.012
      }
    }
    box(shelf, bronze, [0, 3.28, 0.12], [2.39, 0.11, 0.64])
    collider(`bookcase-${side}-${index}`, 'box', [side * 8.25, 1.65, z], { size: [0.72, 3.3, 2.45] })
  }
  cabinet(1, -8.8, 0)
  cabinet(1, -14.8, 1)
  cabinet(-1, -14.8, 0)

  function desk(side, z) {
    const x = side * 7.86
    const table = group(`Side gallery writing table ${side}`, [x, 0, z], [0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0])
    box(table, wood, [0, 0.92, 0], [2.6, 0.14, 1.08])
    box(table, bronze, [0, 0.895, 0.55], [2.57, 0.035, 0.025])
    for (const xx of [-1.03, 1.03]) {
      for (const zz of [-0.37, 0.37]) cylinder(table, wood, [xx, 0.44, zz], 0.07, 0.87, 0.055, 8)
      box(table, darkWood, [xx, 0.24, 0], [0.075, 0.1, 0.87])
    }
    box(table, darkWood, [0, 0.25, 0], [2.16, 0.12, 0.12])
    mesh(table, new THREE.PlaneGeometry(0.6, 0.44), parchment, [-0.19, 1.0, 0.01], [-Math.PI / 2, 0, 0.09])
    box(table, bookMaterials[1], [0.65, 1.035, -0.1], [0.33, 0.09, 0.42])
    box(table, parchment, [0.65, 1.038, -0.095], [0.305, 0.059, 0.41])
    cylinder(table, iron, [0.28, 1.055, 0.2], 0.055, 0.12, 0.043)
    beam(table, parchment, [0.29, 1.12, 0.2], [0.45, 1.43, 0.21], 0.012, 5)
    candle(table, -0.92, 0.99, -0.1, 0.37)
    collider(`desk-${side}`, 'box', [x, 0.5, z], { size: [1.08, 1, 2.6] })
    const stoolX = side * 6.97
    cylinder(root, wood, [stoolX, 0.53, z], 0.34, 0.13)
    for (let leg = 0; leg < 3; leg++) {
      const a = leg * Math.PI * 2 / 3
      beam(root, darkWood, [stoolX + Math.cos(a) * 0.22, 0.5, z + Math.sin(a) * 0.22], [stoolX + Math.cos(a) * 0.27, 0.02, z + Math.sin(a) * 0.27], 0.047)
    }
    collider(`stool-${side}`, 'cylinder', [stoolX, 0.3, z], { radius: 0.34, height: 0.6 })
  }
  desk(-1, -7.8)
  desk(1, -2.7)

  for (const side of [-1, 1]) {
    const chest = group(`Ironbound treasury coffer ${side}`, [side * 7.8, 0, -20.8])
    box(chest, wood, [0, 0.46, 0], [1.03, 0.83, 1.75])
    box(chest, wood, [0, 0.91, 0], [1.08, 0.13, 1.8])
    for (const zz of [-0.6, 0.6]) {
      box(chest, iron, [0, 0.99, zz], [1.09, 0.035, 0.11])
      for (const xx of [-0.525, 0.525]) box(chest, iron, [xx, 0.47, zz], [0.04, 0.88, 0.11])
    }
    collider(`coffer-${side}`, 'box', [side * 7.8, 0.5, -20.8], { size: [1.12, 1, 1.85] })
  }

  // Shallow concentric steps form a reachable dais without a pit or raised platform edge.
  solidBox('dais-first', cutStone, [0, 0.06, -21.3], [6.9, 0.12, 4.7])
  solidBox('dais-second', paleStone, [0, 0.18, -21.6], [6.2, 0.12, 4.1])
  solidBox('dais-third', cutStone, [0, 0.3, -21.9], [5.5, 0.12, 3.5])
  mesh(root, new THREE.PlaneGeometry(2.6, 3.43), runner, [0, 0.368, -21.9], [-Math.PI / 2, 0, 0])
  const throne = group('Throne of the broken oath', [0, 0.36, -22.26])
  box(throne, darkWood, [0, 0.55, 0.01], [1.44, 1.1, 1.13])
  box(throne, velvet, [0, 1.1, 0.13], [1.22, 0.19, 0.99])
  archPanel(throne, darkWood, 1.57, 3.75, [0, 0.48, -0.53])
  archPanel(throne, velvet, 1.12, 2.94, [0, 0.93, -0.5])
  arch(throne, 1.45, 4.08, 2.68, 0.066, bronze)
  for (const side of [-1, 1]) {
    cylinder(throne, bronze, [side * 0.79, 1.98, -0.47], 0.065, 3.95, 0.041)
    ball(throne, bronze, [side * 0.79, 4.02, -0.47], [0.09, 0.14, 0.09])
    box(throne, darkWood, [side * 0.81, 1.41, 0.03], [0.24, 0.21, 1.29])
    box(throne, bronze, [side * 0.81, 1.52, 0.03], [0.26, 0.035, 1.3])
    cylinder(throne, bronze, [side * 0.81, 0.9, 0.51], 0.06, 1.0)
    ball(throne, bronze, [side * 0.81, 1.62, 0.57], [0.1, 0.12, 0.13])
  }
  cylinder(throne, bronze, [0, 3.96, -0.43], 0.19, 0.23, 0.14)
  for (let point = 0; point < 5; point++) {
    const a = point * Math.PI * 2 / 5
    mesh(throne, new THREE.ConeGeometry(0.045, 0.23, 6), bronze, [Math.cos(a) * 0.17, 4.15, -0.43 + Math.sin(a) * 0.17])
  }
  collider('throne', 'box', [0, 2.43, -22.26], { size: [1.95, 4.15, 1.4] })

  const rose = group('Tracery rose above the throne', [0, 8.05, -23.67])
  mesh(rose, new THREE.CircleGeometry(2.07, 64), recessed, [0, 0, 0])
  for (let pane = 0; pane < 12; pane++) {
    const a = pane * Math.PI / 6
    mesh(rose, new THREE.CircleGeometry(1.83, 12, a + 0.027, Math.PI / 6 - 0.054), glass[pane % 2], [0, 0, 0.02])
    beam(rose, paleStone, [0, 0, 0.07], [Math.cos(a) * 1.86, Math.sin(a) * 1.86, 0.07], 0.05, 6)
    torus(rose, cutStone, [Math.cos(a + Math.PI / 12) * 1.39, Math.sin(a + Math.PI / 12) * 1.39, 0.09], 0.3, 0.042)
  }
  torus(rose, paleStone, [0, 0, 0.08], 2.1, 0.15)
  torus(rose, cutStone, [0, 0, 0.11], 1.86, 0.075)
  torus(rose, paleStone, [0, 0, 0.13], 0.52, 0.065)
  mesh(rose, new THREE.CircleGeometry(0.45, 24), glass[1], [0, 0, 0.08])

  for (const x of [-2.55, 2.55]) {
    const stand = group('Dais candle standard', [x, 0.36, -21.7])
    cylinder(stand, iron, [0, 0.08, 0], 0.32, 0.16, 0.21, 8)
    cylinder(stand, bronze, [0, 0.97, 0], 0.048, 1.75, 0.03)
    for (const offset of [-0.28, 0, 0.28]) {
      beam(stand, iron, [0, 1.54, 0], [offset, 1.88, 0], 0.027)
      candle(stand, offset, 1.87, 0, 0.3)
    }
    collider(`candle-standard-${x}`, 'cylinder', [x, 1.45, -21.7], { radius: 0.32, height: 2.9 })
  }

  const contactMap = texture(canvasTexture(128, 128, (ctx, width, height) => {
    const falloff = ctx.createRadialGradient(width / 2, height / 2, 12, width / 2, height / 2, width / 2)
    falloff.addColorStop(0, 'rgba(0,0,0,0.8)')
    falloff.addColorStop(0.38, 'rgba(0,0,0,0.55)')
    falloff.addColorStop(0.72, 'rgba(0,0,0,0.14)')
    falloff.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = falloff
    ctx.fillRect(0, 0, width, height)
  }))
  const contactShadow = new THREE.MeshBasicMaterial({
    color: 0x142023, map: contactMap, transparent: true, opacity: 0.58,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
  })
  materials.add(contactShadow)
  for (const obstacle of obstacles) {
    if (!/pier-|bookcase-|desk-|stool-|coffer-|throne|candle-standard-/.test(obstacle.id)) continue
    const footprint = obstacle.type === 'box' ? [obstacle.size[0], obstacle.size[2]] : [obstacle.radius * 2, obstacle.radius * 2]
    const raised = /throne|candle-standard-/.test(obstacle.id)
    mesh(root, new THREE.PlaneGeometry(footprint[0] * 1.55 + 0.25, footprint[1] * 1.55 + 0.25), contactShadow,
      [obstacle.position[0] - CENTER_X, raised ? 0.371 : 0.02, obstacle.position[2]], [-Math.PI / 2, 0, 0])
  }

  const ambient = new THREE.HemisphereLight(0x9fb8c1, 0x363b42, 0.94)
  ambient.name = 'Interior soft stone bounce'
  root.add(ambient)
  const warmLight = new THREE.PointLight(0xffc995, 66, 24, 2)
  warmLight.position.set(0, 6.2, -1.5)
  warmLight.name = 'Front crown chandelier light'
  const rearLight = new THREE.PointLight(0xffd7af, 74, 25, 2)
  rearLight.position.set(0, 6.2, -12.4)
  rearLight.name = 'Rear crown chandelier light'
  const throneLight = new THREE.PointLight(0x85b5cc, 35, 15, 2)
  throneLight.position.set(0, 6.8, -21.5)
  throneLight.name = 'Rose window indirect light'
  root.add(warmLight, rearLight, throneLight)

  const windowKey = new THREE.SpotLight(0x9bbfd0, 190, 43, 0.8, 0.68, 2)
  windowKey.name = 'Static colored window shadow light'
  windowKey.position.set(7.6, 7.9, 0)
  windowKey.target.position.set(-3.1, 0.3, -10.8)
  windowKey.castShadow = true
  windowKey.shadow.mapSize.set(1024, 1024)
  windowKey.shadow.camera.near = 0.5
  windowKey.shadow.camera.far = 43
  windowKey.shadow.bias = -0.00015
  windowKey.shadow.normalBias = 0.035
  windowKey.shadow.radius = 2
  root.add(windowKey, windowKey.target)

  // Bake static architecture and furniture by material; only the candle flames animate.
  root.updateMatrixWorld(true)
  const inverseRoot = root.matrixWorld.clone().invert()
  const batches = new Map()
  const toRemove = []
  const shadowMaterials = new Set([stone, cutStone, paleStone, wood, darkWood, iron, bronze])
  root.traverse(object => {
    if (!object.isMesh || object.userData.dynamic) return
    const transform = new THREE.Matrix4().multiplyMatrices(inverseRoot, object.matrixWorld)
    const geometry = object.geometry.clone().applyMatrix4(transform)
    geometry.computeBoundingBox()
    const centerY = (geometry.boundingBox.min.y + geometry.boundingBox.max.y) / 2
    const castsShadow = shadowMaterials.has(object.material) && centerY < 8.4
    const flat = geometry.index ? geometry.toNonIndexed() : geometry
    if (flat !== geometry) geometry.dispose()
    const key = `${object.material.uuid}-${castsShadow}`
    const batch = batches.get(key) || { mat: object.material, castsShadow, geometries: [] }
    batch.geometries.push(flat)
    batches.set(key, batch)
    toRemove.push(object)
  })
  for (const object of toRemove) object.removeFromParent()
  for (const { mat, castsShadow, geometries } of batches.values()) {
    const geometry = mergeGeometries(geometries, false)
    for (const source of geometries) source.dispose()
    if (geometry) {
      const object = mesh(root, geometry, mat)
      object.castShadow = castsShadow
      object.name = 'Batched interior stonework and furnishing'
    }
  }
  const activeGeometries = new Set()
  root.traverse(object => { if (object.isMesh) activeGeometries.add(object.geometry) })
  for (const geometry of resources) if (!activeGeometries.has(geometry)) geometry.dispose()
  let disposed = false

  return {
    root,
    obstacles,
    spawn: [CENTER_X, FLOOR_Y + 0.02, 3.5],
    exit: [CENTER_X, FLOOR_Y + 0.02, 6.3],
    enemySpawns: [
      [CENTER_X - 2.7, FLOOR_Y + 0.02, 0],
      [CENTER_X + 2.8, FLOOR_Y + 0.02, -5],
      [CENTER_X - 2.6, FLOOR_Y + 0.02, -11.2],
      [CENTER_X + 1.6, FLOOR_Y + 0.02, -17],
    ],
    bounds: { minX: 71.3, maxX: 88.7, minZ: -23.7, maxZ: 7.7, floorY: FLOOR_Y },
    update(time) {
      if (disposed || !root.visible) return
      for (let i = 0; i < flames.length; i++) {
        const flame = flames[i]
        flame.scale.y = flame.userData.restY * (1 + Math.sin(time * 7.4 + i * 1.37) * 0.1)
        flame.rotation.z = Math.sin(time * 4.8 + i * 2.4) * 0.06
      }
      warmLight.intensity = 66 + Math.sin(time * 4.1) * 1.1
      rearLight.intensity = 74 + Math.sin(time * 3.4 + 1.8) * 1.2
    },
    dispose() {
      if (disposed) return
      disposed = true
      root.removeFromParent()
      activeGeometries.forEach(geometry => geometry.dispose())
      materials.forEach(mat => mat.dispose())
      textures.forEach(map => map.dispose())
      windowKey.shadow.dispose()
      root.clear()
    },
  }
}

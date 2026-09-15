import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { acquireActorTextures } from './actorTextures.js'

const clamp = THREE.MathUtils.clamp
const mix = THREE.MathUtils.lerp

// All joints are local to a grounded, +Z-facing character. Combat owns world motion.
export function createKnight({ enemy = false } = {}) {
  const root = new THREE.Group()
  root.name = enemy ? 'Ashen Keep Guard' : 'Seren Silver Knight'
  const resources = new Set()
  const materials = []
  const textureLease = acquireActorTextures()
  const textures = textureLease.textures
  const makeMaterial = (options) => {
    const material = new THREE.MeshStandardMaterial(options)
    materials.push(material)
    return material
  }
  const steel = makeMaterial({ color: enemy ? 0x39454b : 0xb7c6cb, metalness: .78, roughness: .33 })
  const edge = makeMaterial({ color: enemy ? 0x83908b : 0xe4e9df, metalness: .85, roughness: .24 })
  const shadow = makeMaterial({ color: enemy ? 0x141b20 : 0x31404a, metalness: .62, roughness: .62 })
  const gold = makeMaterial({ color: enemy ? 0x8c7450 : 0xb5a373, metalness: .82, roughness: .38 })
  const leather = makeMaterial({ color: enemy ? 0x201c1c : 0x292a30, roughness: .93 })
  const cloth = makeMaterial({ color: enemy ? 0x6a6874 : 0xffffff, map: textures.cloth, bumpMap: textures.weave, bumpScale: .0012, roughness: .98, side: THREE.DoubleSide })
  const chain = makeMaterial({ color: enemy ? 0x727875 : 0x858e91, map: textures.chain, bumpMap: textures.chain, bumpScale: .003, metalness: .58, roughness: .64 })
  const skin = makeMaterial({ color: 0xd6ac94, roughness: .76 })
  const skinShade = makeMaterial({ color: 0xb67c67, roughness: .82 })
  const hair = makeMaterial({ color: 0xaaa391, roughness: .75 })
  const hairShade = makeMaterial({ color: 0x665b4e, roughness: .84 })
  const black = makeMaterial({ color: 0x16171a, roughness: .86 })
  const eyes = makeMaterial({ color: enemy ? 0xd47235 : 0x8baca8, emissive: enemy ? 0xb1340e : 0x000000, emissiveIntensity: enemy ? .8 : 0, roughness: .5 })
  const lips = makeMaterial({ color: 0x8a544d, roughness: .9 })
  const sclera = makeMaterial({ color: 0xdad5c8, roughness: .43 })

  function mesh(parent, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
    resources.add(geometry)
    const object = new THREE.Mesh(geometry, material)
    object.position.set(...position)
    object.rotation.set(...rotation)
    object.scale.set(...scale)
    object.castShadow = false
    object.receiveShadow = true
    parent.add(object)
    return object
  }
  function joint(parent, name, position = [0, 0, 0]) {
    const group = new THREE.Group()
    group.name = name
    group.position.set(...position)
    parent.add(group)
    return group
  }
  const ball = (parent, mat, pos, size, detail = 12) => {
    const segments = detail >= 16 ? 16 : detail >= 12 ? (enemy ? 8 : 10) : 6
    const rings = detail >= 16 ? 8 : detail >= 12 && !enemy ? 5 : 4
    return mesh(parent, new THREE.SphereGeometry(1, segments, rings), mat, pos, [0, 0, 0], size)
  }
  const box = (parent, mat, pos, size, rotation) => mesh(parent, new THREE.BoxGeometry(...size), mat, pos, rotation)
  const taper = (parent, mat, pos, top, bottom, length, rotation = [0, 0, 0], segments = 8) => mesh(parent, new THREE.CylinderGeometry(top, bottom, length, segments, 1), mat, pos, rotation)
  function line(parent, mat, from, to, radius = .006, segments = 5) {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const object = mesh(parent, new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), segments), mat)
    object.position.copy(a).add(b).multiplyScalar(.5)
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize())
    return object
  }
  function ring(parent, mat, pos, radius, thickness, scale = [1, 1, 1], rotation = [Math.PI / 2, 0, 0]) {
    return mesh(parent, new THREE.TorusGeometry(radius, thickness, 3, 12), mat, pos, rotation, scale)
  }
  function profile(parent, mat, points, pos, scale, segments = enemy ? 14 : 22) {
    return mesh(parent, new THREE.LatheGeometry(points.map(([radius, height]) => new THREE.Vector2(radius, height)), segments), mat, pos, [0, 0, 0], scale)
  }
  function plate(parent, mat, vertices, pos, size, rotation = [0, 0, 0], depth = .012) {
    const shape = new THREE.Shape()
    vertices.forEach(([x, y], index) => index ? shape.lineTo(x, y) : shape.moveTo(x, y))
    shape.closePath()
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: .008, bevelThickness: .005, bevelSegments: 1, steps: 1 })
    return mesh(parent, geometry, mat, pos, rotation, size)
  }
  function curvedLine(parent, mat, points, radius = .005, segments = 18, sides = 5) {
    const path = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)))
    return mesh(parent, new THREE.TubeGeometry(path, segments, radius, sides, false), mat)
  }
  function surface(parent, mat, columns, rows, sample, closed = false) {
    const positions = []
    const uvs = []
    const indices = []
    for (let row = 0; row <= rows; row++) {
      for (let col = 0; col <= columns; col++) {
        positions.push(...sample(col / columns, row / rows))
        uvs.push(col / columns, row / rows)
        if (row && col) {
          const a = row * (columns + 1) + col
          indices.push(a - columns - 2, a - 1, a, a - columns - 2, a, a - columns - 1)
        }
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    if (closed) {
      const normals = geometry.attributes.normal
      for (let row = 0; row <= rows; row++) {
        const first = row * (columns + 1)
        const last = first + columns
        const normal = new THREE.Vector3().fromBufferAttribute(normals, first)
          .add(new THREE.Vector3().fromBufferAttribute(normals, last)).normalize()
        normals.setXYZ(first, normal.x, normal.y, normal.z)
        normals.setXYZ(last, normal.x, normal.y, normal.z)
      }
    }
    return mesh(parent, geometry, mat)
  }
  function pauldron(parent, side, height, width, depth, y, material) {
    return surface(parent, material, enemy ? 16 : 24, 7, (u, v) => {
      const angle = u * Math.PI * 2
      const polar = .04 + v * Math.PI * .49
      const rim = Math.sin(polar)
      return [side * .022 + Math.sin(angle) * width * rim, y + Math.cos(polar) * height, Math.cos(angle) * depth * rim]
    }, true)
  }

  const body = joint(root, 'Pelvis', [0, .95, 0])
  const torso = joint(body, 'Cuirass')
  const femaleWidth = enemy ? 1.1 : 1
  profile(torso, chain, [[.10, -.06], [.15, .02], [.14, .13], [.135, .24], [.18, .35], [.17, .41], [.07, .47]], [0, 0, 0], [femaleWidth, 1, .67])
  profile(torso, steel, [[.125, .11], [.126, .16], [.155, .24], [.188, .34], [.179, .382], [.147, .415], [.07, .45]], [0, 0, .009], [femaleWidth, 1, .76])
  // Cuirass ridge, gorget and overlapping waist lames retain a forged silhouette.
  line(torso, edge, [0, .15, .11], [0, .35, .145], .008)
  line(torso, gold, [0, .22, .137], [-.125, .34, .118], .004)
  line(torso, gold, [0, .22, .137], [.125, .34, .118], .004)
  for (const side of [-1, 1]) {
    curvedLine(torso, edge, [[side * .054, .406, .068], [side * .117, .372, .094], [side * .141, .30, .106], [side * .112, .222, .096]], .0032, 15)
    curvedLine(torso, gold, [[side * .020, .302, .148], [side * .043, .324, .145], [side * .079, .327, .139]], .0022, 10)
    for (let i = 0; i < 3; i++) ball(torso, gold, [side * (.085 + i * .014), .361 - i * .018, .112], [.0045, .0045, .003], 8)
  }
  plate(torso, gold, [[0, .07], [.025, .025], [0, 0], [-.025, .025]], [0, .27, .146], [1, 1, 1])
  for (let i = 0; i < 3; i++) {
    const y = .07 + i * .035
    profile(torso, i === 1 ? shadow : steel, [[.14 - i * .006, y], [.145 - i * .006, y + .028]], [0, 0, .002], [femaleWidth, 1, .72])
    ring(torso, edge, [0, y, .002], .14 - i * .006, .003, [femaleWidth, .72, 1])
  }
  taper(torso, chain, [0, .47, 0], .062, .076, .065, [0, 0, 0], 16)
  ring(torso, edge, [0, .45, 0], .071, .009, [1, .9, 1])
  ring(torso, gold, [0, .058, 0], .146, .017, [femaleWidth, .76, 1])
  box(torso, gold, [0, .058, .125], [.048, .045, .012])
  box(torso, shadow, [0, .058, .136], [.028, .027, .006])

  const skirtShape = [[-.049, 0], [.049, 0], [.063, -.18], [.032, -.25], [-.032, -.25], [-.063, -.18]]
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4
    const flap = joint(torso, `Tasset ${i}`, [Math.sin(a) * .127, .009, Math.cos(a) * .10])
    flap.rotation.y = a
    flap.rotation.x = -.15
    plate(flap, i % 2 ? shadow : steel, skirtShape, [0, 0, 0], [1, 1, 1])
    line(flap, gold, [-.044, -.015, .021], [.044, -.015, .021], .004)
    line(flap, edge, [0, -.04, .022], [0, -.207, .022], .003)
    for (const x of [-.029, .029]) ball(flap, gold, [x, -.024, .023], [.006, .006, .003], 8)
    flap.updateMatrix()
    for (const child of [...flap.children]) {
      child.applyMatrix4(flap.matrix)
      torso.add(child)
    }
    torso.remove(flap)
  }
  const frontTabard = plate(torso, cloth, [[-.064, 0], [.064, 0], [.083, -.36], [0, -.42], [-.083, -.36]], [0, -.07, .108], [1, 1, 1], [.1, 0, 0], .003)
  frontTabard.name = 'Split crimson tabard'
  line(torso, gold, [0, -.16, .147], [0, -.33, .16], .006)
  line(torso, gold, [-.037, -.205, .151], [.037, -.205, .151], .004)

  const head = joint(torso, 'Head', [0, .53, .005])
  let braid = null
  if (!enemy) {
    taper(head, skin, [0, .016, -.007], .042, .051, .108, [0, 0, 0], 20)
    const faceRings = [
      [.018, .008, .035], [.03, .039, .052], [.052, .058, .067], [.077, .076, .075],
      [.107, .088, .080], [.14, .094, .083], [.173, .096, .085], [.204, .099, .083],
      [.233, .094, .074], [.258, .080, .057], [.278, .052, .030], [.291, .001, .001],
    ]
    const bell = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2) - ((y - cy) / sy) ** 2)
    const face = surface(head, skin, 64, 52, (u, v) => {
      const y = .291 - v * .273
      let lower = 0
      while (lower < faceRings.length - 2 && faceRings[lower + 1][0] < y) lower++
      const a = faceRings[lower]
      const b = faceRings[lower + 1]
      const t = clamp((y - a[0]) / (b[0] - a[0]), 0, 1)
      const angle = u * Math.PI * 2
      const x = Math.sin(angle) * mix(a[1], b[1], t)
      const front = Math.max(0, Math.cos(angle))
      let z = Math.cos(angle) * mix(a[2], b[2], t) + .006
      if (front > 0) {
        const cheek = bell(x, y, .052, .119, .023, .026) + bell(x, y, -.052, .119, .023, .026)
        const sockets = bell(x, y, .040, .162, .028, .016) + bell(x, y, -.040, .162, .028, .016)
        const brows = bell(x, y, .039, .184, .034, .012) + bell(x, y, -.039, .184, .034, .012)
        z += (cheek * .010 - sockets * .009 + brows * .005) * front
        z += bell(x, y, 0, .143, .013, .034) * .023
        z += bell(x, y, 0, .119, .015, .014) * .023
        z += (bell(x, y, .012, .113, .009, .008) + bell(x, y, -.012, .113, .009, .008)) * .009
        z += bell(x, y, 0, .083, .025, .013) * .009
        z += bell(x, y, 0, .045, .026, .012) * .006
      }
      return [x, y, z]
    }, true)
    face.name = 'Sculpted face and jaw'
    for (const side of [-1, 1]) {
      ball(head, skin, [side * .096, .14, -.003], [.013, .029, .018], 16)
      curvedLine(head, skinShade, [[side * .099, .119, .005], [side * .105, .14, .012], [side * .099, .160, .001]], .0023, 12)
      const eyeX = side * .039
      surface(head, sclera, 20, 6, (u, v) => {
        const x = (u * 2 - 1) * .021
        const arch = Math.sin(u * Math.PI)
        return [eyeX + x, .162 + (1 - v * 2) * arch * .0063 + x * side * .065, .083 + arch * .0036]
      })
      ball(head, eyes, [eyeX, .162, .0872], [.0066, .0060, .0017], 16)
      ball(head, black, [eyeX, .162, .0886], [.0031, .0035, .0009], 12)
      ball(head, sclera, [eyeX - .0018, .164, .0892], [.0013, .0013, .0005], 8)
      for (const upper of [-1, 1]) {
        const points = Array.from({ length: 7 }, (_, i) => {
          const t = i / 6
          const x = (t * 2 - 1) * .0215
          return [eyeX + x, .162 + upper * Math.sin(t * Math.PI) * .0068 + x * side * .065, .0836 + Math.sin(t * Math.PI) * .0038]
        })
        curvedLine(head, upper === 1 ? skinShade : skin, points, upper === 1 ? .0014 : .0016, 18, 5)
      }
      curvedLine(head, hairShade, [[side * .018, .183, .087], [side * .038, .187, .086], [side * .060, .181, .079]], .0024, 16)
      curvedLine(head, lips, [[side * .008, .111, .109], [side * .014, .111, .106], [side * .018, .114, .102]], .0013, 10)
      ball(head, gold, [side * .097, .112, .002], [.0055, .0065, .0045], 12)
    }
    surface(head, lips, 24, 6, (u, v) => {
      const x = (u * 2 - 1) * .022
      const arch = Math.sin(u * Math.PI)
      const cupid = .0018 * Math.exp(-(((Math.abs(x) - .006) / .004) ** 2))
      return [x, .082 + arch * (.0035 - v * .0072) + cupid * (1 - v), .089 + arch * .0032 + Math.sin(v * Math.PI) * .0013]
    })
    curvedLine(head, skinShade, [[-.019, .0815, .091], [0, .081, .094], [.019, .0815, .091]], .0008, 16)
    const scalp = surface(head, hairShade, 40, 18, (u, v) => {
      const angle = u * Math.PI * 2
      const front = Math.max(0, Math.cos(angle))
      const polar = .008 + v * (1.94 - front * .85)
      const y = .149 + Math.cos(polar) * .147
      let lower = 0
      while (lower < faceRings.length - 2 && faceRings[lower + 1][0] < y) lower++
      const a = faceRings[lower]
      const b = faceRings[lower + 1]
      const t = clamp((y - a[0]) / (b[0] - a[0]), 0, 1)
      return [Math.sin(angle) * (mix(a[1], b[1], t) + .005), y + .003, .006 + Math.cos(angle) * (mix(a[2], b[2], t) + .005)]
    }, true)
    scalp.name = 'Swept ash-blonde hair cap'
    for (const side of [-1, 1]) {
      for (let strand = 0; strand < 7; strand++) {
        const spread = strand * .008
        curvedLine(head, strand % 3 === 0 ? hairShade : hair, [
          [side * (.008 + spread), .291 - strand * .004, .025],
          [side * (.043 + spread * .55), .266 - strand * .006, .076 - strand * .005],
          [side * (.086 + strand * .002), .218 - strand * .008, .047 - strand * .005],
          [side * (.102 - strand * .002), .171 - strand * .004, -.014 - strand * .004],
          [side * .057, .142 - strand * .003, -.088],
        ], .0048 - strand * .00024, 23, 5)
      }
      curvedLine(head, hair, [[side * .092, .19, .025], [side * .104, .126, .017], [side * .078, .092, .026]], .004, 19, 5)
    }
    braid = joint(head, 'Woven three-strand braid', [0, .137, -.095])
    for (let strand = 0; strand < 3; strand++) {
      const points = Array.from({ length: 60 }, (_, index) => {
        const t = index / 59
        const angle = t * Math.PI * 16 + strand * Math.PI * 2 / 3
        const radius = .018 * (1 - t * .70)
        return [Math.sin(angle) * radius, -t * .44, -.020 * Math.sin(t * Math.PI * .7) + Math.cos(angle) * radius * .65]
      })
      curvedLine(braid, strand === 1 ? hairShade : hair, points, .009, 110, 5)
    }
    ring(braid, gold, [0, -.425, -.018], .011, .0032)
    for (let i = 0; i < 5; i++) curvedLine(braid, hair, [[(i - 2) * .003, -.428, -.018], [(i - 2) * .004, -.461, -.021], [(i - 2) * .005, -.473, -.017]], .0024, 10)
    curvedLine(head, gold, [[-.079, .224, .066], [0, .216, .096], [.079, .224, .066]], .0027, 28)
    plate(head, gold, [[0, .008], [.007, 0], [0, -.011], [-.007, 0]], [0, .215, .097], [1, 1, 1], [0, 0, 0], .002)
  } else {
    profile(head, shadow, [[.075, .015], [.095, .042], [.107, .095], [.113, .18], [.099, .238], [.068, .28], [.02, .305]], [0, 0, -.004], [1, 1, .96], 20)
    plate(head, steel, [[-.094, .21], [0, .265], [.094, .21], [.08, .074], [0, .026], [-.08, .074]], [0, 0, .067], [1, 1, 1], [0, 0, 0], .033)
    line(head, edge, [0, .042, .112], [0, .256, .109], .010)
    for (const side of [-1, 1]) {
      box(head, black, [side * .044, .178, .109], [.065, .019, .012], [0, 0, side * .13])
      box(head, eyes, [side * .044, .178, .118], [.043, .006, .004], [0, 0, side * .13])
      line(head, gold, [side * .095, .211, .10], [side * .082, .075, .104], .006)
      for (let i = 0; i < 3; i++) box(head, black, [side * (.028 + i * .018), .092, .109], [.005, .023, .008], [0, 0, -side * .1])
      curvedLine(head, edge, [[side * .081, .070, .069], [side * .103, .046, .01], [side * .072, .046, -.073]], .0037, 12)
      for (let i = 0; i < 3; i++) ball(head, gold, [side * .086, .105 + i * .039, .108], [.0042, .0042, .003], 8)
    }
    plate(head, edge, [[-.009, 0], [.009, 0], [.014, .12], [0, .17], [-.014, .12]], [0, .245, -.026], [1, .6, 1])
  }

  function arm(side) {
    const shoulder = joint(torso, side < 0 ? 'Sword shoulder' : 'Offhand shoulder', [side * .207 * femaleWidth, .406, 0])
    ball(shoulder, chain, [side * .018, -.035, 0], [.072, .086, .070])
    for (let i = 0; i < 3; i++) {
      pauldron(shoulder, side, i === 0 ? .069 : .036, .102 - i * .008, .097 - i * .006, -.008 - i * .037, steel)
      const rimPoints = Array.from({ length: 17 }, (_, index) => {
        const a = index / 16 * Math.PI * 2
        return [side * .022 + Math.sin(a) * (.102 - i * .008), -.008 - i * .037, Math.cos(a) * (.097 - i * .006)]
      })
      curvedLine(shoulder, i === 0 ? gold : edge, rimPoints, .0032, 24, 4)
    }
    curvedLine(shoulder, edge, [[side * .022, .061, 0], [side * .077, .044, .018], [side * .120, -.008, .025]], .003, 12)
    for (const z of [-.060, .060]) ball(shoulder, gold, [side * .092, -.037, z], [.005, .005, .004], 8)
    taper(shoulder, leather, [0, -.162, 0], .044, .035, .19)
    profile(shoulder, steel, [[.052, -.244], [.048, -.15], [.065, -.10]], [0, 0, 0], [1, 1, .85])
    ring(shoulder, edge, [0, -.237, 0], .052, .005, [1, .85, 1])
    const elbow = joint(shoulder, 'Elbow', [0, -.265, 0])
    ball(elbow, leather, [0, 0, 0], [.046, .045, .044])
    plate(elbow, steel, [[0, .045], [.05, 0], [0, -.052], [-.05, 0]], [0, 0, .025], [1, 1, 1])
    profile(elbow, steel, [[.039, -.23], [.051, -.18], [.052, -.06], [.043, -.035]], [0, 0, 0], [1, 1, .86])
    line(elbow, edge, [0, -.05, .046], [0, -.212, .035], .006)
    for (const y of [-.072, -.193]) ring(elbow, gold, [0, y, 0], .052 - (y < -.1 ? .01 : 0), .004, [1, .86, 1])
    const wrist = joint(elbow, 'Gauntlet', [0, -.245, 0])
    box(wrist, leather, [0, -.027, .007], [.054, .054, .037])
    plate(wrist, steel, [[-.031, .003], [.031, .003], [.034, -.035], [.020, -.055], [-.022, -.055], [-.034, -.035]], [0, 0, -.016], [1, 1, 1], [0, Math.PI, 0], .007)
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * .013
      const length = .037 - Math.abs(i - 1.3) * .004
      curvedLine(wrist, leather, [[x, -.043, -.004], [x, -.053 - length * .3, .007], [x, -.056, .029], [x, -.041, .033]], .007, 12, 5)
      for (let knuckle = 0; knuckle < 2; knuckle++) {
        box(wrist, knuckle === 0 ? steel : edge, [x, -.052 - knuckle * .01, .001 + knuckle * .014], [.011, .012, .012], [-.46 + knuckle * .6, 0, 0])
      }
    }
    curvedLine(wrist, leather, [[side * .029, -.015, .006], [side * .038, -.026, .024], [side * .020, -.037, .034]], .010, 12, 6)
    line(wrist, edge, [-.02, -.007, -.027], [.02, -.007, -.027], .0024)
    return { shoulder, elbow, wrist }
  }
  const swordArm = arm(-1)
  const freeArm = arm(1)
  const sword = joint(swordArm.wrist, enemy ? 'Blacksteel sword' : 'Oathkeeper longsword', [0, -.012, .029])
  taper(sword, leather, [0, -.005, 0], .013, .013, .13)
  for (let i = 0; i < 6; i++) ring(sword, gold, [0, .043 - i * .017, 0], .014, .002)
  ball(sword, gold, [0, .082, 0], [.026, .028, .02], 10)
  ball(sword, eyes, [0, .084, .018], [.01, .014, .005], 8)
  line(sword, edge, [-.11, -.073, .008], [0, -.093, 0], .014)
  line(sword, edge, [.11, -.073, .008], [0, -.093, 0], .014)
  ball(sword, gold, [-.11, -.073, .008], [.018, .014, .015], 8)
  ball(sword, gold, [.11, -.073, .008], [.018, .014, .015], 8)
  plate(sword, edge, [[-.025, -.1], [.025, -.1], [.022, -.68], [0, -.81], [-.022, -.68]], [0, 0, -.006], [1, 1, 1], [0, 0, 0], .010)
  plate(sword, steel, [[-.009, -.12], [.009, -.12], [.006, -.68], [0, -.74], [-.006, -.68]], [0, 0, .007], [1, 1, 1], [0, 0, 0], .002)
  const weaponTip = joint(sword, 'Blade tip', [0, -.81, 0])

  function leg(side) {
    const hip = joint(body, side < 0 ? 'Right hip' : 'Left hip', [side * .092, -.01, 0])
    taper(hip, leather, [0, -.2, 0], .060, .049, .36)
    profile(hip, steel, [[.058, -.355], [.067, -.27], [.072, -.10], [.066, -.045]], [0, 0, .006], [1, 1, 1.06])
    line(hip, edge, [0, -.10, .084], [0, -.32, .069], .006)
    ring(hip, gold, [0, -.11, .006], .071, .004, [1, 1.06, 1])
    const knee = joint(hip, 'Knee', [0, -.40, 0])
    ball(knee, leather, [0, -.008, 0], [.053, .054, .052])
    plate(knee, steel, [[0, .056], [.059, .012], [.045, -.043], [0, -.066], [-.045, -.043], [-.059, .012]], [0, -.006, .044], [1, 1, 1])
    line(knee, gold, [0, .041, .073], [0, -.05, .073], .005)
    profile(knee, steel, [[.038, -.39], [.049, -.30], [.057, -.14], [.049, -.066]], [0, 0, -.006], [1, 1, 1])
    line(knee, edge, [0, -.085, .052], [0, -.375, .034], .006)
    ring(knee, gold, [0, -.362, -.006], .041, .005)
    const ankle = joint(knee, 'Sabatons', [0, -.427, 0])
    box(ankle, leather, [0, -.068, .062], [.100, .040, .205])
    box(ankle, shadow, [0, -.091, .062], [.104, .013, .209])
    profile(ankle, steel, [[.048, -.08], [.051, -.025], [.039, .027]], [0, 0, -.007], [1, 1, 1.05], enemy ? 10 : 14)
    for (let i = 0; i < 4; i++) {
      surface(ankle, steel, enemy ? 10 : 16, 3, (u, v) => {
        const angle = (1 - u) * Math.PI
        return [Math.cos(angle) * (.055 - i * .004), -.060 + Math.sin(angle) * (.041 - i * .006), .020 + i * .032 + v * .038]
      })
      curvedLine(ankle, edge, [[-.052 + i * .004, -.059, .053 + i * .032], [0, -.022 - i * .006, .053 + i * .032], [.052 - i * .004, -.059, .053 + i * .032]], .002, 12, 4)
    }
    return { hip, knee, ankle }
  }
  const rightLeg = leg(-1)
  const leftLeg = leg(1)

  const cape = joint(torso, 'Mantle', [0, .42, -.092])
  const capeWidth = enemy ? .36 : .34
  const capeGeometry = new THREE.PlaneGeometry(capeWidth, .86, enemy ? 8 : 14, enemy ? 12 : 20)
  const capePositions = capeGeometry.attributes.position
  const capeBase = new Float32Array(capePositions.array.length)
  for (let i = 0; i < capePositions.count; i++) {
    const x = capePositions.getX(i)
    const v = (.43 - capePositions.getY(i)) / .86
    const xx = x * (.78 + v * .70)
    const yy = -v * .86 + Math.cos(x * 32) * v * .018
    const zz = -.018 - Math.sin(v * Math.PI * .7) * .10 - Math.cos(x * 55) * .014
    capePositions.setXYZ(i, xx, yy, zz)
    capeBase.set([xx, yy, zz], i * 3)
  }
  capeGeometry.computeVertexNormals()
  const mantle = mesh(cape, capeGeometry, cloth)
  mantle.userData.keepSeparate = true
  for (const side of [-1, 1]) {
    ball(torso, gold, [side * .135, .394, .074], [.024, .02, .008], 10)
    line(torso, gold, [side * .135, .39, .085], [side * .015, .355, .14], .003)
  }

  const metalPalette = makeMaterial({ color: 0xffffff, vertexColors: true, map: textures.metal, bumpMap: textures.forge, bumpScale: .0015, metalness: 1, roughness: 1 })
  metalPalette.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 surface;\nvarying vec2 vSurface;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSurface = surface;')
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vSurface;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = vSurface.y;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = vSurface.x;')
  }
  metalPalette.customProgramCacheKey = () => 'castle-forged-equipment-v2'
  const skinPalette = makeMaterial({ color: 0xffffff, vertexColors: true, roughness: .76 })
  const hairPalette = makeMaterial({ color: 0xffffff, vertexColors: true, map: textures.hair, bumpMap: textures.hair, bumpScale: .0007, roughness: .77 })
  const clothPalette = makeMaterial({ color: 0xffffff, vertexColors: true, map: textures.cloth, bumpMap: textures.weave, bumpScale: .0012, roughness: .98, side: THREE.DoubleSide })
  const chainPalette = makeMaterial({ color: 0xffffff, vertexColors: true, map: textures.chain, bumpMap: textures.chain, bumpScale: .003, metalness: .58, roughness: .64 })
  const eyePalette = makeMaterial({ color: 0xffffff, vertexColors: true, emissive: eyes.emissive.clone(), emissiveIntensity: eyes.emissiveIntensity, roughness: .5 })
  function paletteFor(material) {
    if (material === eyes || material === sclera) return eyePalette
    if (material === skin || material === skinShade || material === lips) return skinPalette
    if (material === hair || material === hairShade) return hairPalette
    if (material === cloth) return clothPalette
    if (material === chain) return chainPalette
    return metalPalette
  }

  // Bake palette colors into vertices; each articulated joint needs only a few draw calls.
  root.updateMatrixWorld(true)
  root.traverse((node) => {
    if (!node.isGroup) return
    const batches = new Map()
    for (const child of [...node.children]) {
      if (!child.isMesh || child.userData.keepSeparate) continue
      child.updateMatrix()
      const geometry = child.geometry.clone().applyMatrix4(child.matrix)
      const color = child.material.color
      const colors = new Float32Array(geometry.attributes.position.count * 3)
      const surfaces = new Float32Array(geometry.attributes.position.count * 2)
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = color.r
        colors[i + 1] = color.g
        colors[i + 2] = color.b
      }
      for (let i = 0; i < surfaces.length; i += 2) {
        surfaces[i] = child.material.metalness
        surfaces[i + 1] = child.material.roughness
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      geometry.setAttribute('surface', new THREE.BufferAttribute(surfaces, 2))
      const material = paletteFor(child.material)
      const list = batches.get(material) || []
      list.push(geometry)
      batches.set(material, list)
      node.remove(child)
    }
    for (const [material, geometries] of batches) {
      const flat = geometries.map((g) => g.index ? g.toNonIndexed() : g)
      const geometry = mergeGeometries(flat, false)
      flat.forEach((g) => g.dispose())
      geometries.forEach((g) => g.dispose())
      if (geometry) mesh(node, geometry, material)
    }
  })
  const activeGeometry = new Set()
  root.traverse((node) => { if (node.isMesh) activeGeometry.add(node.geometry) })
  for (const geometry of resources) if (!activeGeometry.has(geometry)) geometry.dispose()
  const emissiveBases = new Map(materials.map((material) => [material, material.emissive.clone()]))
  const hitColor = new THREE.Color(0xffa07c)

  function animate({ time = 0, speed = 0, attack = -1, dodge = -1, jump = -1, hit = 0, dead = 0 } = {}) {
    const jumpWeight = jump >= 0 ? Math.sin(clamp(jump, 0, 1) * Math.PI) : 0
    const running = jump >= 0 ? 0 : clamp(speed, 0, 1.6)
    const stride = Math.sin(time * (enemy ? 8.7 : 10.2)) * Math.min(running, 1)
    const step = Math.cos(time * (enemy ? 8.7 : 10.2)) * Math.min(running, 1)
    const breathing = Math.sin(time * 2.1) * .007
    const dodgeWeight = dodge >= 0 ? Math.sin(clamp(dodge, 0, 1) * Math.PI) : 0
    const death = clamp(dead, 0, 1)
    body.position.y = mix(.95 + Math.abs(step) * .028 + breathing - dodgeWeight * .3, .14, death)
    body.rotation.set(dodgeWeight * .28, 0, death * 1.48)
    torso.rotation.set(-running * .055 + dodgeWeight * .65, stride * .045, stride * .02)
    head.rotation.set(dodgeWeight * -.25, Math.sin(time * .65) * .035, -.02 * Math.sin(time))
    if (braid) {
      braid.rotation.x = running * .13 + dodgeWeight * .32 + Math.sin(time * 3.1) * .025
      braid.rotation.z = -stride * .13 + Math.sin(time * 2.2) * .025
    }
    rightLeg.hip.rotation.x = stride * .56 - dodgeWeight * .70
    leftLeg.hip.rotation.x = -stride * .56 - dodgeWeight * .26
    rightLeg.knee.rotation.x = Math.max(0, -stride) * .64 + dodgeWeight * 1.35
    leftLeg.knee.rotation.x = Math.max(0, stride) * .64 + dodgeWeight * .80
    rightLeg.ankle.rotation.x = Math.max(0, stride) * -.18
    leftLeg.ankle.rotation.x = Math.max(0, -stride) * -.18
    swordArm.shoulder.rotation.set(-.10 - stride * .18, .05, -.10)
    freeArm.shoulder.rotation.set(.08 + stride * .35, -.05, .11)
    swordArm.elbow.rotation.set(-.12, 0, 0)
    freeArm.elbow.rotation.set(-.18 - Math.abs(stride) * .12, 0, 0)
    swordArm.wrist.rotation.set(-.12, 0, 0)
    if (jump >= 0 && death === 0) {
      torso.rotation.x -= jumpWeight * .12
      rightLeg.hip.rotation.x -= .18 + jumpWeight * .32
      leftLeg.hip.rotation.x -= .10 + jumpWeight * .18
      rightLeg.knee.rotation.x += .22 + jumpWeight * .72
      leftLeg.knee.rotation.x += .14 + jumpWeight * .46
      rightLeg.ankle.rotation.x -= jumpWeight * .18
      leftLeg.ankle.rotation.x -= jumpWeight * .18
      swordArm.shoulder.rotation.x -= jumpWeight * .35
      freeArm.shoulder.rotation.z += jumpWeight * .25
      freeArm.elbow.rotation.x -= jumpWeight * .45
    }
    if (attack >= 0 && death === 0) {
      const phase = clamp(attack, 0, 1)
      const lift = Math.sin(phase * Math.PI)
      const swing = Math.sin((phase * 1.25 - .2) * Math.PI)
      torso.rotation.y = -.52 * Math.cos(phase * Math.PI) * lift
      torso.rotation.x -= lift * .13
      swordArm.shoulder.rotation.set(-.24 - lift * 1.9, swing * .45, -.12 - swing * 1.13)
      swordArm.elbow.rotation.x = -.12 - Math.sin(phase * Math.PI) * .65
      swordArm.wrist.rotation.x = -.12 + lift * .5
      freeArm.shoulder.rotation.set(-lift * .75, -.1, .18 + lift * .18)
      freeArm.elbow.rotation.x = -.4 - lift * .8
    }
    if (dodgeWeight > 0) {
      swordArm.shoulder.rotation.x -= dodgeWeight * 1.2
      freeArm.shoulder.rotation.x -= dodgeWeight * 1.2
      freeArm.elbow.rotation.x -= dodgeWeight * .8
    }
    if (death > 0) {
      torso.rotation.x += death * .16
      head.rotation.z += death * .30
      swordArm.shoulder.rotation.z -= death * .65
      freeArm.shoulder.rotation.z += death * .45
      rightLeg.knee.rotation.x += death * .38
      leftLeg.hip.rotation.x -= death * .20
    }
    cape.rotation.x = .10 + running * .23 + dodgeWeight * .48 + jumpWeight * .22
    cape.rotation.z = -stride * .045
    const positions = capeGeometry.attributes.position
    for (let i = 0; i < positions.count; i++) {
      const offset = i * 3
      const v = -capeBase[offset + 1] / .86
      const wave = Math.sin(time * 5.5 + v * 4.2 + capeBase[offset] * 8) * v * (.013 + running * .025)
      positions.setZ(i, capeBase[offset + 2] + wave)
      positions.setX(i, capeBase[offset] + Math.sin(time * 3.8 + v * 6.1) * v * running * .008)
    }
    positions.needsUpdate = true
    capeGeometry.computeVertexNormals()
    for (const material of materials) {
      material.emissive.copy(emissiveBases.get(material)).lerp(hitColor, clamp(hit, 0, 1) * .75)
      if (material !== eyes && material !== eyePalette) material.emissiveIntensity = hit > 0 ? .8 : 1
    }
  }
  animate()
  let disposed = false
  function dispose() {
    if (disposed) return
    disposed = true
    activeGeometry.forEach((geometry) => geometry.dispose())
    materials.forEach((material) => material.dispose())
    textureLease.release()
    root.removeFromParent()
    root.clear()
  }
  return { root, weaponTip, animate, dispose }
}

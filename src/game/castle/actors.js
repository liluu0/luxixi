import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const clamp = THREE.MathUtils.clamp
const mix = THREE.MathUtils.lerp

// All joints are local to a grounded, +Z-facing character. Combat owns world motion.
export function createKnight({ enemy = false } = {}) {
  const root = new THREE.Group()
  root.name = enemy ? 'Ashen Keep Guard' : 'Seren Silver Knight'
  const resources = new Set()
  const materials = []
  const makeMaterial = (options) => {
    const material = new THREE.MeshStandardMaterial(options)
    materials.push(material)
    return material
  }
  const steel = makeMaterial({ color: enemy ? 0x303b40 : 0xb1bfc5, metalness: .78, roughness: .33 })
  const edge = makeMaterial({ color: enemy ? 0x65706c : 0xe0e9e8, metalness: .85, roughness: .24 })
  const shadow = makeMaterial({ color: enemy ? 0x141b20 : 0x31404a, metalness: .62, roughness: .62 })
  const gold = makeMaterial({ color: enemy ? 0x8c7450 : 0xb5a373, metalness: .82, roughness: .38 })
  const leather = makeMaterial({ color: enemy ? 0x201c1c : 0x292a30, roughness: .93 })
  const cloth = makeMaterial({ color: enemy ? 0x3e3035 : 0x681d2c, roughness: .98, side: THREE.DoubleSide })
  const skin = makeMaterial({ color: 0xd3a489, roughness: .84 })
  const hair = makeMaterial({ color: 0x9b9587, roughness: .88 })
  const hairShade = makeMaterial({ color: 0x4e4b47, roughness: .91 })
  const black = makeMaterial({ color: 0x16171a, roughness: .86 })
  const eyes = makeMaterial({ color: enemy ? 0xd47235 : 0x8baca8, emissive: enemy ? 0xb1340e : 0x000000, emissiveIntensity: enemy ? .8 : 0, roughness: .5 })
  const lips = makeMaterial({ color: 0x8a544d, roughness: .9 })

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
  function profile(parent, mat, points, pos, scale, segments = 12) {
    return mesh(parent, new THREE.LatheGeometry(points.map(([radius, height]) => new THREE.Vector2(radius, height)), segments), mat, pos, [0, 0, 0], scale)
  }
  function plate(parent, mat, vertices, pos, size, rotation = [0, 0, 0], depth = .012) {
    const shape = new THREE.Shape()
    vertices.forEach(([x, y], index) => index ? shape.lineTo(x, y) : shape.moveTo(x, y))
    shape.closePath()
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: .008, bevelThickness: .005, bevelSegments: 1, steps: 1 })
    return mesh(parent, geometry, mat, pos, rotation, size)
  }

  const body = joint(root, 'Pelvis', [0, .95, 0])
  const torso = joint(body, 'Cuirass')
  const femaleWidth = enemy ? 1.1 : 1
  profile(torso, shadow, [[.10, -.06], [.15, .02], [.14, .13], [.135, .24], [.18, .35], [.17, .41], [.07, .47]], [0, 0, 0], [femaleWidth, 1, .67])
  profile(torso, steel, [[.125, .11], [.126, .16], [.155, .24], [.184, .34], [.16, .40], [.07, .45]], [0, 0, .009], [femaleWidth, 1, .76])
  // Cuirass ridge, gorget and overlapping waist lames retain a forged silhouette.
  line(torso, edge, [0, .15, .11], [0, .35, .145], .008)
  line(torso, gold, [0, .22, .137], [-.125, .34, .118], .004)
  line(torso, gold, [0, .22, .137], [.125, .34, .118], .004)
  plate(torso, gold, [[0, .07], [.025, .025], [0, 0], [-.025, .025]], [0, .27, .146], [1, 1, 1])
  for (let i = 0; i < 3; i++) {
    const y = .07 + i * .035
    profile(torso, i === 1 ? shadow : steel, [[.14 - i * .006, y], [.145 - i * .006, y + .028]], [0, 0, .002], [femaleWidth, 1, .72])
    ring(torso, edge, [0, y, .002], .14 - i * .006, .003, [femaleWidth, .72, 1])
  }
  taper(torso, shadow, [0, .47, 0], .062, .076, .065)
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
  if (!enemy) {
    ball(head, skin, [0, .137, .012], [.102, .145, .094], 20)
    ball(head, skin, [0, .055, .045], [.066, .065, .063], 16)
    ball(head, skin, [0, .067, .060], [.047, .041, .038], 16)
    ball(head, skin, [0, .117, .109], [.012, .03, .018], 10)
    ball(head, skin, [0, .098, .117], [.02, .012, .014], 10)
    for (const side of [-1, 1]) {
      ball(head, skin, [side * .101, .133, -.002], [.014, .03, .019], 10)
      ball(head, skin, [side * .044, .144, .091], [.03, .011, .012], 12)
      ball(head, black, [side * .040, .143, .103], [.019, .006, .004], 12)
      ball(head, eyes, [side * .040, .144, .107], [.009, .005, .002], 10)
      line(head, hairShade, [side * .02, .162, .102], [side * .06, .17, .095], .0035)
      line(head, skin, [side * .008, .06, .104], [side * .021, .064, .101], .003)
      ball(head, gold, [side * .104, .101, 0], [.008, .014, .007], 8)
    }
    line(head, lips, [-.019, .066, .102], [.019, .066, .102], .0033)
    line(head, skin, [-.012, .055, .099], [.012, .055, .099], .003)
    mesh(head, new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI * .47), hair, [0, .147, -.007], [-.4, 0, 0], [.106, .151, .100])
    ball(head, hairShade, [0, .159, -.043], [.092, .10, .079], 16)
    // Swept temple strands and a visible three-strand braid make the heroine readable from behind.
    for (const side of [-1, 1]) {
      for (let s = 0; s < 4; s++) {
        line(head, s % 2 ? hairShade : hair, [side * (.017 + s * .017), .272 - s * .008, .047], [side * (.088 + s * .002), .171 - s * .012, .008], .013 - s * .001)
        line(head, hair, [side * (.086 + s * .002), .17, .004], [side * .075, .084 - s * .004, -.01], .011)
      }
    }
    for (let i = 0; i < 17; i++) {
      const y = .105 - i * .027
      const z = -.086 - Math.sin(i * .13) * .025
      for (let s = 0; s < 3; s++) {
        const a = i * 1.9 + s * Math.PI * 2 / 3
        ball(head, s === 1 ? hairShade : hair, [Math.sin(a) * .018, y, z + Math.cos(a) * .013], [.019 - i * .0005, .023, .014], 8)
      }
    }
    ring(head, gold, [0, -.29, -.109], .014, .005)
    for (let i = 0; i < 5; i++) line(head, hair, [(i - 2) * .005, -.30, -.11], [(i - 2) * .006, -.35, -.11], .003)
    line(head, gold, [-.072, .204, .084], [0, .194, .104], .004)
    line(head, gold, [.072, .204, .084], [0, .194, .104], .004)
    ball(head, eyes, [0, .193, .108], [.012, .016, .006], 10)
  } else {
    profile(head, shadow, [[.075, .015], [.103, .095], [.113, .18], [.092, .26], [.02, .305]], [0, 0, -.004], [1, 1, .96])
    plate(head, steel, [[-.094, .21], [0, .265], [.094, .21], [.08, .074], [0, .026], [-.08, .074]], [0, 0, .067], [1, 1, 1], [0, 0, 0], .033)
    line(head, edge, [0, .042, .112], [0, .256, .109], .010)
    for (const side of [-1, 1]) {
      box(head, black, [side * .044, .178, .109], [.065, .019, .012], [0, 0, side * .13])
      box(head, eyes, [side * .044, .178, .118], [.043, .006, .004], [0, 0, side * .13])
      line(head, gold, [side * .095, .211, .10], [side * .082, .075, .104], .006)
      for (let i = 0; i < 3; i++) box(head, black, [side * (.028 + i * .018), .092, .109], [.005, .023, .008], [0, 0, -side * .1])
    }
    plate(head, edge, [[-.009, 0], [.009, 0], [.014, .12], [0, .17], [-.014, .12]], [0, .245, -.026], [1, .6, 1])
  }

  function arm(side) {
    const shoulder = joint(torso, side < 0 ? 'Sword shoulder' : 'Offhand shoulder', [side * .207 * femaleWidth, .406, 0])
    ball(shoulder, shadow, [side * .018, -.035, 0], [.083, .092, .082])
    for (let i = 0; i < 3; i++) {
      ball(shoulder, i === 1 ? edge : steel, [side * (.023 + i * .009), -.014 - i * .035, .003], [.104 - i * .004, .047, .103 - i * .008])
    }
    ball(shoulder, gold, [side * .071, -.06, .072], [.012, .012, .005], 8)
    taper(shoulder, leather, [0, -.162, 0], .051, .043, .19)
    profile(shoulder, steel, [[.052, -.244], [.048, -.15], [.065, -.10]], [0, 0, 0], [1, 1, .85])
    ring(shoulder, edge, [0, -.237, 0], .052, .005, [1, .85, 1])
    const elbow = joint(shoulder, 'Elbow', [0, -.265, 0])
    ball(elbow, shadow, [0, 0, 0], [.046, .045, .044])
    plate(elbow, steel, [[0, .045], [.05, 0], [0, -.052], [-.05, 0]], [0, 0, .025], [1, 1, 1])
    profile(elbow, steel, [[.039, -.23], [.051, -.18], [.052, -.06], [.043, -.035]], [0, 0, 0], [1, 1, .86])
    line(elbow, edge, [0, -.05, .046], [0, -.212, .035], .006)
    for (const y of [-.072, -.193]) ring(elbow, gold, [0, y, 0], .052 - (y < -.1 ? .01 : 0), .004, [1, .86, 1])
    const wrist = joint(elbow, 'Gauntlet', [0, -.245, 0])
    ball(wrist, leather, [0, -.029, .009], [.035, .045, .035])
    ball(wrist, steel, [0, -.025, -.011], [.038, .038, .022])
    for (let i = 0; i < 4; i++) ball(wrist, edge, [(i - 1.5) * .014, -.047, .025], [.008, .012, .014], 8)
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
    taper(hip, leather, [0, -.2, 0], .068, .057, .36)
    profile(hip, steel, [[.058, -.355], [.067, -.27], [.072, -.10], [.066, -.045]], [0, 0, .006], [1, 1, 1.06])
    line(hip, edge, [0, -.10, .084], [0, -.32, .069], .006)
    ring(hip, gold, [0, -.11, .006], .071, .004, [1, 1.06, 1])
    const knee = joint(hip, 'Knee', [0, -.40, 0])
    ball(knee, shadow, [0, -.008, 0], [.053, .054, .052])
    plate(knee, steel, [[0, .056], [.059, .012], [.045, -.043], [0, -.066], [-.045, -.043], [-.059, .012]], [0, -.006, .044], [1, 1, 1])
    line(knee, gold, [0, .041, .073], [0, -.05, .073], .005)
    profile(knee, steel, [[.038, -.39], [.049, -.30], [.057, -.14], [.049, -.066]], [0, 0, -.006], [1, 1, 1])
    line(knee, edge, [0, -.085, .052], [0, -.375, .034], .006)
    ring(knee, gold, [0, -.362, -.006], .041, .005)
    const ankle = joint(knee, 'Sabatons', [0, -.427, 0])
    ball(ankle, leather, [0, -.047, .043], [.051, .063, .102])
    ball(ankle, steel, [0, -.067, .069], [.059, .046, .12])
    for (let i = 0; i < 4; i++) {
      ball(ankle, i % 2 ? steel : edge, [0, -.044 - i * .007, .038 + i * .03], [.057 - i * .004, .028, .027])
    }
    return { hip, knee, ankle }
  }
  const rightLeg = leg(-1)
  const leftLeg = leg(1)

  const cape = joint(torso, 'Mantle', [0, .42, -.092])
  const capeWidth = enemy ? .36 : .34
  const capeGeometry = new THREE.PlaneGeometry(capeWidth, .86, 6, 9)
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

  const metalPalette = makeMaterial({ color: 0xffffff, vertexColors: true, metalness: enemy ? .57 : .78, roughness: enemy ? .50 : .36 })
  const fabricPalette = makeMaterial({ color: 0xffffff, vertexColors: true, roughness: .9, side: THREE.DoubleSide })
  const eyePalette = makeMaterial({ color: 0xffffff, vertexColors: true, emissive: eyes.emissive.clone(), emissiveIntensity: eyes.emissiveIntensity, roughness: .5 })
  const metals = new Set([steel, edge, shadow, gold])
  function paletteFor(material) {
    if (material === eyes) return eyePalette
    if (metals.has(material) || (enemy && material !== cloth)) return metalPalette
    return fabricPalette
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
      geometry.deleteAttribute('uv')
      const color = child.material.color
      const colors = new Float32Array(geometry.attributes.position.count * 3)
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = color.r
        colors[i + 1] = color.g
        colors[i + 2] = color.b
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
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

  function animate({ time = 0, speed = 0, attack = -1, dodge = -1, hit = 0, dead = 0 } = {}) {
    const running = clamp(speed, 0, 1.6)
    const stride = Math.sin(time * (enemy ? 8.7 : 10.2)) * Math.min(running, 1)
    const step = Math.cos(time * (enemy ? 8.7 : 10.2)) * Math.min(running, 1)
    const breathing = Math.sin(time * 2.1) * .007
    const dodgeWeight = dodge >= 0 ? Math.sin(clamp(dodge, 0, 1) * Math.PI) : 0
    const death = clamp(dead, 0, 1)
    body.position.y = mix(.95 + Math.abs(step) * .028 + breathing - dodgeWeight * .3, .14, death)
    body.rotation.set(dodgeWeight * .28, 0, death * 1.48)
    torso.rotation.set(-running * .055 + dodgeWeight * .65, stride * .045, stride * .02)
    head.rotation.set(dodgeWeight * -.25, Math.sin(time * .65) * .035, -.02 * Math.sin(time))
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
    cape.rotation.x = .10 + running * .23 + dodgeWeight * .48
    cape.rotation.z = -stride * .045
    const positions = capeGeometry.attributes.position
    for (let i = 0; i < positions.count; i++) {
      const offset = i * 3
      const v = -capeBase[offset + 1] / .86
      positions.setZ(i, capeBase[offset + 2] + Math.sin(time * 5.5 + v * 4.2 + capeBase[offset] * 8) * v * (.013 + running * .025))
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
    root.removeFromParent()
    root.clear()
  }
  return { root, weaponTip, animate, dispose }
}

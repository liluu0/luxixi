import * as THREE from 'three'

export function createEntrance() {
  const root = new THREE.Group()
  root.name = 'Open royal doorway'
  root.position.set(7, 10.43, 5.3)
  const pixels = new Uint8Array(128 * 128 * 4)
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const value = 115 + Math.sin(x * 1.3 + Math.sin(y * .18)) * 9 + Math.sin(x * .39) * 5
    pixels.set([value, value, value, 255], (y * 128 + x) * 4)
  }
  const grain = new THREE.DataTexture(pixels, 128, 128)
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping
  grain.needsUpdate = true
  const stone = new THREE.MeshStandardMaterial({ color: 0x495459, roughness: 0.86, bumpMap: grain, bumpScale: 0.024 })
  const bronze = new THREE.MeshStandardMaterial({ color: 0x9f8451, metalness: 0.75, roughness: 0.36 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x10222e, roughness: 0.86, bumpMap: grain, bumpScale: 0.045 })
  const timber = new THREE.MeshStandardMaterial({ color: 0x263b42, roughness: 0.78, bumpMap: grain, bumpScale: 0.055 })
  const light = new THREE.MeshBasicMaterial({ color: 0x8bc9d2, transparent: true, opacity: 0.5, depthWrite: false })
  const shape = (width, height) => {
    const path = new THREE.Shape()
    path.moveTo(-width / 2, 0)
    path.lineTo(width / 2, 0)
    path.lineTo(width / 2, height * 0.65)
    path.quadraticCurveTo(width / 2, height * 0.85, 0, height)
    path.quadraticCurveTo(-width / 2, height * 0.85, -width / 2, height * 0.65)
    path.closePath()
    return path
  }
  function add(geometry, material, position) {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(...position)
    mesh.receiveShadow = true
    root.add(mesh)
    return mesh
  }
  add(new THREE.ShapeGeometry(shape(2.4, 3.65), 20), dark, [0, 0, 0.12])
  const arch = shape(2.8, 3.95)
  const inner = shape(2.4, 3.65)
  arch.holes.push(new THREE.Path(inner.getPoints(20)))
  add(new THREE.ExtrudeGeometry(arch, { depth: 0.24, bevelEnabled: false, curveSegments: 20 }), stone, [0, 0, 0.08])
  for (const side of [-1, 1]) {
    for (let row = 0; row < 8; row++) {
      add(new THREE.BoxGeometry(0.28, 0.33, 0.35), stone, [side * 1.42, row * 0.38 + 0.18, 0.2])
    }
    const door = add(new THREE.BoxGeometry(1.05, 2.65, 0.12), timber, [side * 0.98, 1.33, 0.48])
    door.rotation.y = -side * 0.75
    for (const y of [-1.07, -0.03, 1.03]) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.085, 0.035), bronze)
      brace.position.set(0, y, 0.085)
      door.add(brace)
      for (const x of [-0.39, 0.39]) {
        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 4), bronze)
        stud.position.set(x, y, 0.12)
        door.add(stud)
      }
    }
    for (const x of [-0.34, 0, 0.34]) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.014, 2.59, 0.024), dark)
      seam.position.set(x, 0, 0.075)
      door.add(seam)
    }
    for (const y of [0.45, 2.25]) add(new THREE.BoxGeometry(0.24, 0.1, 0.47), bronze, [side * 1.3, y, 0.18])
    add(new THREE.BoxGeometry(0.055, 2.55, 0.06), light, [side * 0.68, 1.3, 0.42])
  }
  add(new THREE.BoxGeometry(3.0, 0.1, 1.65), stone, [0, -0.03, 0.65])
  const lantern = new THREE.PointLight(0x7dbed1, 10, 6, 2)
  lantern.position.set(0, 2.6, 1.3)
  root.add(lantern)
  const marker = add(new THREE.OctahedronGeometry(0.13), light, [0, 3.1, 0.65])
  return {
    root,
    update(time) { marker.rotation.y = time * 0.8; marker.position.y = 3.1 + Math.sin(time * 1.7) * 0.05 },
    dispose() {
      root.traverse(object => object.geometry?.dispose())
      for (const material of [stone, bronze, dark, timber, light]) material.dispose()
      grain.dispose()
      root.removeFromParent()
    },
  }
}

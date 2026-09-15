import test from 'node:test'
import assert from 'node:assert/strict'
import RAPIER from '@dimforge/rapier3d-compat'
import { PLAY_AREAS, protectedPosition } from '../../src/game/castle/safety.js'

await RAPIER.init()

for (const [zone, area] of Object.entries(PLAY_AREAS)) {
  test(`${zone}: sprinting and dodging into every boundary stays above the floor`, () => {
    const world = new RAPIER.World({ x: 0, y: -24, z: 0 })
    const cx = (area.minX + area.maxX) / 2
    const cz = (area.minZ + area.maxZ) / 2
    const sx = (area.maxX - area.minX) / 2 + 0.5
    const sz = (area.maxZ - area.minZ) / 2 + 0.5
    world.createCollider(RAPIER.ColliderDesc.cuboid(sx, 0.2, sz).setTranslation(cx, area.floor - 0.2, cz))
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(cx, area.floor + 0.84, cz))
    const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.56, 0.28), body)
    const controller = world.createCharacterController(0.018)
    controller.enableSnapToGround(0.35)
    let lastSafe = { x: cx, y: area.floor, z: cz }
    for (const [x, z] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, -1]]) {
      for (let step = 0; step < 360; step++) {
        controller.computeColliderMovement(collider, { x: x * 6.7 / 60, y: -24 / 60, z: z * 6.7 / 60 })
        const delta = controller.computedMovement()
        const current = body.translation()
        body.setNextKinematicTranslation({ x: current.x + delta.x, y: current.y + delta.y, z: current.z + delta.z })
        world.step()
        const moved = body.translation()
        const safe = protectedPosition({ x: moved.x, y: moved.y - 0.84, z: moved.z }, zone, lastSafe)
        assert.ok(safe.x >= area.minX && safe.x <= area.maxX)
        assert.ok(safe.z >= area.minZ && safe.z <= area.maxZ)
        assert.ok(safe.y >= area.floor)
        const position = { x: safe.x, y: safe.y + 0.84, z: safe.z }
        body.setTranslation(position, true)
        body.setNextKinematicTranslation(position)
        lastSafe = safe
      }
    }
    world.free()
  })

  test(`${zone}: missed collision and nonfinite physics state cannot expose a fall`, () => {
    const safe = { x: (area.minX + area.maxX) / 2, y: area.floor, z: area.minZ + 2 }
    assert.equal(protectedPosition({ ...safe, y: -200 }, zone, safe).y, area.floor)
    assert.deepEqual(protectedPosition({ x: NaN, y: -Infinity, z: 0 }, zone, safe), safe)
  })
}

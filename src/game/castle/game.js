import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import { createKnight } from './actors.js'
import { loadEnvironment } from './environment.js'
import { createBattleAudio } from './audio.js'

let physicsReady
const FIXED_STEP = 1 / 60
const BODY_OFFSET = 0.84
const ATTACK_TIME = 0.6
const DODGE_TIME = 0.62
const clamp = THREE.MathUtils.clamp

function shortestAngle(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from))
}

export async function createCastleGame(canvas, callbacks = {}) {
  const { onState = () => {}, onLoading = () => {}, onError = () => {} } = callbacks
  let disposed = false
  let renderer
  let environment
  let world
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(58, 1, 0.12, 2500)
  const audio = createBattleAudio()
  const removers = []
  const characters = []
  const invisibleBoundaryHandles = new Set()
  const effects = []
  const keys = new Set()
  const touchMove = new THREE.Vector2()
  const desired = new THREE.Vector3()
  const cameraTarget = new THREE.Vector3(0, 13, 2)
  let player
  let enemies = []
  let phase = 'ready'
  let elapsed = 0
  let animationTime = 0
  let accumulator = 0
  let lastTime = 0
  let notifyTime = 0
  let frame = 0
  let yaw = 0
  let pitch = 0.32
  let kills = 0
  let target = null
  let quality = 'balanced'
  let muted = false
  let mouseAttack = false
  let dragging = false
  let intentionalUnlock = false
  let screenShake = 0
  let resizeObserver
  let contextLost = false

  const shadowGeometry = new THREE.CircleGeometry(0.42, 24)
  const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x071013, transparent: true, opacity: 0.32, depthWrite: false })
  const sparkGeometry = new THREE.IcosahedronGeometry(0.035, 0)
  const slashGeometry = new THREE.RingGeometry(1.0, 1.13, 26, 1, -1.15, 2.3)

  function listen(object, event, handler, options) {
    object.addEventListener(event, handler, options)
    removers.push(() => object.removeEventListener(event, handler, options))
  }

  function notify() {
    if (disposed || !player) return
    const activeTarget = target?.health > 0 ? target : nearestEnemy(4.2)
    onState({
      phase, health: Math.ceil(player.health), stamina: Math.ceil(player.stamina),
      potions: player.potions, kills, total: enemies.length, elapsed: Math.floor(elapsed),
      locked: !!target, targetName: activeTarget?.name || '',
      targetHealth: activeTarget ? Math.ceil(activeTarget.health) : 0,
      targetMaxHealth: activeTarget?.maxHealth || 100, quality, muted,
      hurt: player.hit > 0,
    })
  }

  function releasePointer() {
    mouseAttack = false
    dragging = false
    keys.clear()
    touchMove.set(0, 0)
    if (document.pointerLockElement === canvas) {
      intentionalUnlock = true
      document.exitPointerLock()
    }
  }

  function changePhase(next) {
    if (disposed) return
    phase = next
    if (next !== 'playing') releasePointer()
    notify()
  }

  function createPhysicsCharacter(position) {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(position[0], position[1] + BODY_OFFSET, position[2]))
    const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.56, 0.28).setFriction(0.1), body)
    const controller = world.createCharacterController(0.018)
    controller.enableAutostep(0.46, 0.2, true)
    controller.enableSnapToGround(0.35)
    controller.setMaxSlopeClimbAngle(Math.PI / 3.2)
    controller.setMinSlopeSlideAngle(Math.PI / 3)
    return { body, collider, controller }
  }

  function addCharacter(position, enemy = false, index = 0) {
    const actor = createKnight({ enemy })
    actor.root.position.fromArray(position)
    actor.root.rotation.y = Math.PI
    actor.root.traverse(object => {
      if (object.isMesh) { object.castShadow = false; object.receiveShadow = true }
    })
    scene.add(actor.root)
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial)
    shadow.rotation.x = -Math.PI / 2
    scene.add(shadow)
    const tell = enemy ? new THREE.Mesh(
      new THREE.RingGeometry(0.53, 0.58, 32),
      new THREE.MeshBasicMaterial({ color: 0xf56a3b, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    ) : null
    if (tell) { tell.rotation.x = -Math.PI / 2; scene.add(tell) }
    const unit = {
      actor, shadow, tell, ...createPhysicsCharacter(position), enemy, index,
      name: index === 7 ? '钟庭执剑者' : '失落守卫',
      health: enemy ? (index === 7 ? 120 : 78) : 100,
      maxHealth: enemy ? (index === 7 ? 120 : 78) : 100,
      stamina: 100, potions: 3, hit: 0, deadTime: 0, velocityY: 0,
      attackTime: -1, dodgeTime: -1, cooldown: 0.9 + index * 0.23,
      healCooldown: 0, staminaDelay: 0, damageGrace: enemy ? 0 : 2, combo: 0, comboGrace: 0,
      dodgeDirection: new THREE.Vector3(), struck: new Set(),
      mode: 'idle', stepTime: 0, speed: 0, home: new THREE.Vector3().fromArray(position),
    }
    if (enemy && index === 7) actor.root.scale.setScalar(1.08)
    characters.push(unit)
    return unit
  }

  function removePhysics(unit) {
    if (!unit.body) return
    world.removeCharacterController(unit.controller)
    world.removeRigidBody(unit.body)
    unit.body = null
    unit.collider = null
    unit.controller = null
  }

  function clearCharacters() {
    for (const unit of characters) {
      removePhysics(unit)
      scene.remove(unit.actor.root, unit.shadow)
      unit.actor.dispose()
      if (unit.tell) { scene.remove(unit.tell); unit.tell.geometry.dispose(); unit.tell.material.dispose() }
    }
    characters.length = 0
  }

  function nearestEnemy(maxDistance = Infinity) {
    if (!player) return null
    let best = null
    let distance = maxDistance
    for (const enemy of enemies) {
      if (enemy.health <= 0) continue
      const next = enemy.actor.root.position.distanceTo(player.actor.root.position)
      if (next < distance) { best = enemy; distance = next }
    }
    return best
  }

  function movement() {
    let x = touchMove.x + (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0)
    let y = touchMove.y + (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0)
    const magnitude = Math.hypot(x, y)
    if (magnitude > 1) { x /= magnitude; y /= magnitude }
    return desired.set(x * Math.cos(yaw) - y * Math.sin(yaw), 0, -x * Math.sin(yaw) - y * Math.cos(yaw))
  }

  function attack() {
    if (!player || phase !== 'playing' || player.attackTime >= 0 || player.dodgeTime >= 0 || player.stamina < 18) return
    player.stamina -= 18
    player.staminaDelay = 0.45
    player.attackTime = 0
    player.combo = player.comboGrace > 0 ? (player.combo + 1) % 3 : 0
    player.comboGrace = 1.3
    player.struck.clear()
    const aim = target || nearestEnemy(3.3)
    if (aim) {
      const direction = aim.actor.root.position.clone().sub(player.actor.root.position)
      player.actor.root.rotation.y = Math.atan2(direction.x, direction.z)
    }
    audio.play('swing')
    slash(player)
  }

  function dodge() {
    if (!player || phase !== 'playing' || player.dodgeTime >= 0 || player.stamina < 24) return
    player.stamina -= 24
    player.staminaDelay = 0.5
    player.dodgeTime = 0
    player.attackTime = -1
    player.dodgeDirection.copy(movement())
    if (player.dodgeDirection.lengthSq() < 0.01) {
      player.dodgeDirection.set(Math.sin(player.actor.root.rotation.y), 0, Math.cos(player.actor.root.rotation.y))
    }
    player.dodgeDirection.normalize()
    audio.play('dodge')
  }

  function heal() {
    if (!player || phase !== 'playing' || player.potions <= 0 || player.health >= 100 || player.healCooldown > 0) return
    player.potions--
    player.health = Math.min(100, player.health + 55)
    player.healCooldown = 1.5
    audio.play('heal')
    burst(player.actor.root.position.clone().add(new THREE.Vector3(0, 0.9, 0)), 0x9be0c1, 20)
    notify()
  }

  function toggleLock() {
    if (phase !== 'playing') return
    target = target ? null : nearestEnemy(13)
    notify()
  }

  function slash(unit) {
    const material = new THREE.MeshBasicMaterial({ color: unit.enemy ? 0xf3834a : 0xf4d39b, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
    const mesh = new THREE.Mesh(slashGeometry, material)
    mesh.rotation.set(-Math.PI / 2 + 0.25, 0, -unit.actor.root.rotation.y + Math.PI / 2)
    mesh.position.copy(unit.actor.root.position).add(new THREE.Vector3(0, 1.05, 0))
    scene.add(mesh)
    effects.push({ mesh, time: 0.28, life: 0.28, slash: true })
  }

  function burst(position, color = 0xffcb7b, count = 10) {
    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false })
      const mesh = new THREE.Mesh(sparkGeometry, material)
      mesh.position.copy(position)
      scene.add(mesh)
      const life = 0.25 + Math.random() * 0.3
      effects.push({ mesh, time: life, life, velocity: new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3) })
    }
  }

  function hurt(unit, damage) {
    if (unit.health <= 0) return
    if (!unit.enemy && unit.dodgeTime >= 0.025 && unit.dodgeTime < 0.48) return
    if (!unit.enemy && unit.damageGrace > 0 && damage < 100) return
    if (!unit.enemy) unit.damageGrace = 0.6
    unit.health = Math.max(0, unit.health - damage)
    unit.hit = 0.26
    burst(unit.actor.root.position.clone().add(new THREE.Vector3(0, 1.1, 0)), unit.enemy ? 0xffc28a : 0xdb8b8b)
    audio.play(unit.enemy ? 'hit' : 'hurt')
    if (unit.enemy) {
      unit.attackTime = -1
      unit.mode = 'stagger'
      unit.cooldown = 0.65
    } else screenShake = 0.18
    if (unit.health === 0) {
      unit.deadTime = 0.001
      removePhysics(unit)
      if (unit.tell) unit.tell.visible = false
      if (unit.enemy) {
        kills++
        if (target === unit) target = null
        audio.play('kill')
        if (kills === enemies.length) { audio.play('victory'); changePhase('victory') }
      } else changePhase('dead')
    }
    notify()
  }

  function inReach(attacker, victim, range, angle) {
    const delta = victim.actor.root.position.clone().sub(attacker.actor.root.position)
    if (Math.abs(delta.y) > 1.8) return false
    delta.y = 0
    return delta.length() <= range && Math.abs(shortestAngle(attacker.actor.root.rotation.y, Math.atan2(delta.x, delta.z))) <= angle
  }

  function stepCharacter(unit, direction, speed, dt) {
    if (!unit.body) return
    unit.velocityY = Math.max(-25, unit.velocityY - 24 * dt)
    const displacement = { x: direction.x * speed * dt, y: unit.velocityY * dt, z: direction.z * speed * dt }
    unit.controller.computeColliderMovement(unit.collider, displacement)
    const delta = unit.controller.computedMovement()
    const position = unit.body.translation()
    unit.body.setNextKinematicTranslation({ x: position.x + delta.x, y: position.y + delta.y, z: position.z + delta.z })
    if (unit.controller.computedGrounded()) unit.velocityY = -0.8
    unit.speed = Math.hypot(delta.x, delta.z) / dt
  }

  // The circular basin splits pursuit routes into two accessible garden paths.
  function pursueDirection(unit, destination) {
    const origin = unit.actor.root.position
    const direction = destination.clone().sub(origin)
    direction.y = 0
    const pool = new THREE.Vector3(0, origin.y, 5)
    const length = direction.length()
    if (length < 0.01) return direction
    const line = direction.clone().normalize()
    const along = clamp(pool.clone().sub(origin).dot(line), 0, length)
    const closest = origin.clone().addScaledVector(line, along)
    if (closest.distanceTo(pool) < 2.9 && along > 0.6 && length > 2.7) {
      const a = Math.atan2(origin.z - pool.z, origin.x - pool.x)
      const b = Math.atan2(destination.z - pool.z, destination.x - pool.x)
      const side = Math.sign(shortestAngle(a, b)) || (unit.index % 2 ? 1 : -1)
      const waypoint = new THREE.Vector3(Math.cos(a + side * 0.65) * 3.55, origin.y, 5 + Math.sin(a + side * 0.65) * 3.55)
      direction.copy(waypoint).sub(origin)
    }
    for (const other of enemies) {
      if (other === unit || other.health <= 0) continue
      const separation = origin.clone().sub(other.actor.root.position)
      separation.y = 0
      const d = separation.length()
      if (d > 0.01 && d < 1.05) direction.addScaledVector(separation.normalize(), (1.05 - d) * 2.6)
    }
    return direction.normalize()
  }

  function updatePlayer(dt) {
    player.hit = Math.max(0, player.hit - dt)
    player.damageGrace = Math.max(0, player.damageGrace - dt)
    player.healCooldown = Math.max(0, player.healCooldown - dt)
    player.comboGrace = Math.max(0, player.comboGrace - dt)
    player.staminaDelay = Math.max(0, player.staminaDelay - dt)
    if (player.staminaDelay === 0) player.stamina = Math.min(100, player.stamina + 25 * dt)
    if ((mouseAttack || keys.has('Space')) && player.attackTime < 0) attack()
    const direction = movement().clone()
    let speed = 3.2
    if ((keys.has('ShiftLeft') || keys.has('ShiftRight')) && player.stamina > 8 && direction.lengthSq() > 0.1) {
      speed = 4.7
      player.stamina -= 15 * dt
      player.staminaDelay = 0.4
    }
    if (player.attackTime >= 0) {
      player.attackTime += dt
      speed *= 0.27
      if (player.attackTime > 0.17 && player.attackTime < 0.43) {
        for (const enemy of enemies) {
          if (enemy.health <= 0 || player.struck.has(enemy)) continue
          if (inReach(player, enemy, 2.45, 1.24)) {
            player.struck.add(enemy)
            hurt(enemy, player.combo === 2 ? 46 : 34)
          }
        }
      }
      if (player.attackTime >= ATTACK_TIME) player.attackTime = -1
    }
    if (player.dodgeTime >= 0) {
      player.dodgeTime += dt
      direction.copy(player.dodgeDirection)
      speed = 6.7 * Math.max(0.22, 1 - player.dodgeTime / DODGE_TIME)
      if (player.dodgeTime >= DODGE_TIME) player.dodgeTime = -1
    }
    if (player.attackTime < 0 && direction.lengthSq() > 0.01) {
      const facing = target ? target.actor.root.position.clone().sub(player.actor.root.position) : direction
      const angle = Math.atan2(facing.x, facing.z)
      player.actor.root.rotation.y += shortestAngle(player.actor.root.rotation.y, angle) * Math.min(1, dt * 14)
    }
    stepCharacter(player, direction, speed, dt)
    player.stepTime += player.speed * dt
    if (player.stepTime > 1.6 && player.dodgeTime < 0) { player.stepTime = 0; audio.play('step') }
    if (player.actor.root.position.y < -3) hurt(player, 100)
  }

  function updateEnemy(unit, dt) {
    if (unit.health <= 0) return
    unit.hit = Math.max(0, unit.hit - dt)
    unit.cooldown = Math.max(0, unit.cooldown - dt)
    const distance = unit.actor.root.position.distanceTo(player.actor.root.position)
    const direction = new THREE.Vector3()
    let speed = 0
    if (unit.hit > 0) {
      unit.mode = 'stagger'
    } else if (unit.attackTime >= 0) {
      unit.attackTime += dt
      if (unit.attackTime < 0.52) {
        const facing = player.actor.root.position.clone().sub(unit.actor.root.position)
        unit.actor.root.rotation.y += shortestAngle(unit.actor.root.rotation.y, Math.atan2(facing.x, facing.z)) * dt * 5
      }
      if (unit.attackTime > 0.64 && !unit.struck.has(player)) {
        unit.struck.add(player)
        slash(unit)
        if (inReach(unit, player, 2.25, 1.15)) hurt(player, unit.index === 7 ? 19 : 12)
      }
      if (unit.attackTime > 1.02) {
        unit.attackTime = -1
        unit.cooldown = 0.85 + (unit.index % 3) * 0.2
      }
    } else if (elapsed > 2 && distance < 2.0 && unit.cooldown === 0 && enemies.filter(enemy => enemy.health > 0 && enemy.attackTime >= 0).length < 2) {
      unit.mode = 'attack'
      unit.attackTime = 0
      unit.struck.clear()
    } else if (distance < 13) {
      unit.mode = 'chase'
      direction.copy(pursueDirection(unit, player.actor.root.position))
      speed = distance > 1.55 ? 1.15 + (unit.index % 3) * 0.12 : 0
    } else {
      unit.mode = 'idle'
      if (unit.actor.root.position.distanceTo(unit.home) > 0.6) { direction.copy(pursueDirection(unit, unit.home)); speed = 0.8 }
    }
    if (direction.lengthSq() > 0.01) unit.actor.root.rotation.y += shortestAngle(unit.actor.root.rotation.y, Math.atan2(direction.x, direction.z)) * Math.min(1, dt * 7)
    stepCharacter(unit, direction, speed, dt)
    if (unit.tell) {
      unit.tell.position.copy(unit.actor.root.position).add(new THREE.Vector3(0, 0.04, 0))
      const warning = unit.attackTime >= 0 && unit.attackTime < 0.68
      unit.tell.material.opacity = warning ? 0.3 + unit.attackTime * 0.8 : 0
      unit.tell.scale.setScalar(warning ? 1 + unit.attackTime * 1.2 : 1)
    }
    if (unit.actor.root.position.y < -3) hurt(unit, unit.health)
  }

  function updatePhysics(dt) {
    if (phase !== 'playing') return
    elapsed += dt
    updatePlayer(dt)
    if (phase === 'playing') for (const enemy of enemies) updateEnemy(enemy, dt)
    world.timestep = dt
    world.step()
    for (const unit of characters) {
      if (!unit.body) continue
      const position = unit.body.translation()
      unit.actor.root.position.set(position.x, position.y - BODY_OFFSET, position.z)
    }
    if (target?.health <= 0 || (target && target.actor.root.position.distanceTo(player.actor.root.position) > 16)) target = null
  }

  function updateCamera(dt) {
    if (phase === 'ready') {
      const a = 0.37 + Math.sin(animationTime * 0.08) * 0.055
      const distance = camera.aspect < 1 ? 93 : camera.aspect < 1.35 ? 75 : 61
      camera.position.set(Math.sin(a) * distance, 35 + (distance - 61) * 0.35, Math.cos(a) * distance)
      camera.lookAt(1, 14, 1)
      return
    }
    const position = player.actor.root.position
    const lookAt = position.clone().add(new THREE.Vector3(0, 1.22, 0))
    if (target) {
      const aim = target.actor.root.position.clone().sub(position)
      const followYaw = Math.atan2(-aim.x, -aim.z)
      yaw += shortestAngle(yaw, followYaw) * Math.min(1, dt * 3.5)
    }
    const distance = matchMedia('(max-width:700px)').matches ? 6.8 : 5.7
    const offset = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(distance)
    const ray = new RAPIER.Ray(lookAt, offset.clone().normalize())
    const hit = world.castRay(ray, distance, true, RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC, undefined, undefined, undefined,
      collider => !invisibleBoundaryHandles.has(collider.handle))
    if (hit && hit.timeOfImpact > 0.5) offset.setLength(Math.max(1.1, hit.timeOfImpact - 0.23))
    const destination = lookAt.clone().add(offset)
    camera.position.lerp(destination, 1 - Math.exp(-dt * 6))
    cameraTarget.lerp(lookAt, 1 - Math.exp(-dt * 12))
    screenShake = Math.max(0, screenShake - dt)
    if (screenShake > 0) camera.position.x += Math.sin(animationTime * 65) * screenShake * 0.13
    camera.lookAt(cameraTarget)
  }

  function draw(time) {
    if (disposed || contextLost) return
    frame = requestAnimationFrame(draw)
    const dt = Math.min(0.07, lastTime ? (time - lastTime) / 1000 : FIXED_STEP)
    lastTime = time
    animationTime += dt
    accumulator += dt
    while (accumulator >= FIXED_STEP) { updatePhysics(FIXED_STEP); accumulator -= FIXED_STEP }
    for (const unit of characters) {
      if (unit.health <= 0) unit.deadTime = Math.min(1, unit.deadTime + dt / 0.8)
      const moving = phase === 'playing' && unit.health > 0
      unit.actor.animate({ time: animationTime, speed: moving ? Math.min(1.6, unit.speed / 3) : 0,
        attack: moving && unit.attackTime >= 0 ? (unit.enemy ? unit.attackTime / 1.02 : unit.attackTime / ATTACK_TIME) : -1,
        dodge: moving && unit.dodgeTime >= 0 ? unit.dodgeTime / DODGE_TIME : -1,
        hit: unit.health > 0 ? unit.hit / 0.26 : 0, dead: unit.deadTime })
      unit.shadow.position.copy(unit.actor.root.position).add(new THREE.Vector3(0, 0.02, 0))
    }
    for (let i = effects.length - 1; i >= 0; i--) {
      const effect = effects[i]
      effect.time -= dt
      effect.mesh.material.opacity = Math.max(0, effect.time / effect.life) * (effect.slash ? 0.45 : 1)
      if (effect.velocity) { effect.velocity.y -= dt * 7; effect.mesh.position.addScaledVector(effect.velocity, dt) }
      if (effect.slash) effect.mesh.scale.multiplyScalar(1 + dt * 0.9)
      if (effect.time <= 0) { scene.remove(effect.mesh); effect.mesh.material.dispose(); effects.splice(i, 1) }
    }
    environment.update?.(animationTime, dt)
    updateCamera(dt)
    renderer.render(scene, camera)
    notifyTime += dt
    if (notifyTime > 0.08) { notifyTime = 0; notify() }
  }

  function resize() {
    if (!renderer || disposed) return
    const width = Math.max(1, canvas.clientWidth)
    const height = Math.max(1, canvas.clientHeight)
    renderer.setSize(width, height, false)
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality === 'high' ? 1.7 : 1.2))
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  function reset() {
    clearCharacters()
    for (const effect of effects) { scene.remove(effect.mesh); effect.mesh.material.dispose() }
    effects.length = 0
    elapsed = 0
    kills = 0
    target = null
    yaw = 0
    pitch = 0.32
    accumulator = 0
    player = addCharacter(environment.spawn)
    enemies = environment.enemySpawns.map((point, index) => addCharacter(point, true, index))
    world.step()
    cameraTarget.copy(player.actor.root.position).add(new THREE.Vector3(0, 1.22, 0))
  }

  function pause() { if (phase === 'playing') changePhase('paused') }
  function resume() { if (phase === 'paused') { audio.unlock(); changePhase('playing') } }
  function start() { if (phase === 'ready') { audio.unlock(); changePhase('playing') } }
  function restart() { if (disposed) return; releasePointer(); reset(); audio.unlock(); changePhase('playing') }
  function look(dx, dy) {
    if (phase !== 'playing') return
    if (!target) yaw -= dx * 0.003
    pitch = clamp(pitch + dy * 0.0025, 0.05, 0.85)
  }

  function dispose() {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(frame)
    releasePointer()
    resizeObserver?.disconnect()
    for (const remove of removers) remove()
    clearCharacters()
    for (const effect of effects) { scene.remove(effect.mesh); effect.mesh.material.dispose() }
    shadowGeometry.dispose(); shadowMaterial.dispose(); sparkGeometry.dispose(); slashGeometry.dispose()
    environment?.dispose()
    world?.free()
    audio.dispose()
    renderer?.dispose()
    if (import.meta.env.DEV && window.__castleBattle?.canvas === canvas) delete window.__castleBattle
  }

  try {
    onLoading({ progress: 0.04, label: '准备场景' })
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.shadowMap.autoUpdate = false
    renderer.shadowMap.needsUpdate = true
    physicsReady ||= RAPIER.init()
    await physicsReady
    world = new RAPIER.World({ x: 0, y: -24, z: 0 })
    environment = await loadEnvironment(scene, renderer, value => onLoading(typeof value === 'number' ? { progress: 0.12 + value * 0.72, label: '载入古堡' } : value))
    onLoading({ progress: 0.88, label: '布置守卫' })
    const point = new THREE.Vector3()
    for (const mesh of environment.groundMeshes) {
      mesh.updateWorldMatrix(true, false)
      const attribute = mesh.geometry.attributes.position
      const vertices = new Float32Array(attribute.count * 3)
      for (let i = 0; i < attribute.count; i++) {
        point.fromBufferAttribute(attribute, i).applyMatrix4(mesh.matrixWorld)
        vertices.set([point.x, point.y, point.z], i * 3)
      }
      const indices = mesh.geometry.index ? new Uint32Array(mesh.geometry.index.array) : Uint32Array.from({ length: attribute.count }, (_, i) => i)
      world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices).setFriction(0.3))
    }
    for (const obstacle of environment.obstacles) {
      const descriptor = obstacle.type === 'cylinder'
        ? RAPIER.ColliderDesc.cylinder(obstacle.height / 2, obstacle.radius)
        : RAPIER.ColliderDesc.cuboid(...obstacle.size.map(value => value / 2))
      descriptor.setTranslation(...obstacle.position)
      if (obstacle.rotation) descriptor.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), obstacle.rotation))
      const collider = world.createCollider(descriptor)
      if (obstacle.id?.startsWith('arena')) invisibleBoundaryHandles.add(collider.handle)
    }
    reset()
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    resize()
    canvas.tabIndex = 0
    listen(canvas, 'contextmenu', event => event.preventDefault())
    listen(canvas, 'pointerdown', event => {
      if (event.pointerType === 'touch' || phase !== 'playing') return
      canvas.focus({ preventScroll: true })
      if (event.button === 0) { mouseAttack = true; attack() }
      if (event.button === 2) dragging = true
    })
    listen(window, 'pointerup', event => { if (event.button === 0) mouseAttack = false; if (event.button === 2) dragging = false })
    listen(window, 'pointermove', event => { if (document.pointerLockElement === canvas || dragging) look(event.movementX, event.movementY) })
    listen(window, 'keydown', event => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code) && phase === 'playing') event.preventDefault()
      if (event.repeat) return
      keys.add(event.code)
      if (event.code === 'Escape' || event.code === 'KeyP') { if (phase === 'playing') pause(); else if (phase === 'paused') resume() }
      if (event.code === 'KeyF') attack()
      if (event.code === 'KeyE') heal()
      if (event.code === 'KeyQ') toggleLock()
      if (event.code === 'KeyR' && (phase === 'dead' || phase === 'victory')) restart()
      if (event.code === 'AltLeft' || event.code === 'AltRight' || event.code === 'KeyC') { event.preventDefault(); dodge() }
    })
    listen(window, 'keyup', event => keys.delete(event.code))
    listen(window, 'blur', pause)
    listen(document, 'visibilitychange', () => { if (document.hidden) pause() })
    listen(document, 'pointerlockchange', () => {
      if (document.pointerLockElement) return
      mouseAttack = false
      keys.clear()
      if (!intentionalUnlock) pause()
      intentionalUnlock = false
    })
    listen(canvas, 'webglcontextlost', event => { event.preventDefault(); contextLost = true; pause(); onError(new Error('图形连接已中断，请重新进入游戏。')) })
    onLoading({ progress: 1, label: '古堡已就绪' })
    notify()
    frame = requestAnimationFrame(draw)
    if (import.meta.env.DEV) {
      window.__castleBattle = { canvas, snapshot: () => ({ phase, elapsed, kills, yaw, renderer: { ...renderer.info.render },
        player: { position: player.actor.root.position.toArray(), health: player.health, stamina: player.stamina, potions: player.potions },
        enemies: enemies.map(enemy => ({ position: enemy.actor.root.position.toArray(), health: enemy.health, mode: enemy.mode })) }) }
    }
  } catch (error) {
    dispose()
    throw error
  }

  return {
    start, restart, pause, resume, attack, dodge, heal, toggleLock, look, dispose,
    setMovement({ x = 0, y = 0 }) { touchMove.set(clamp(x, -1, 1), clamp(y, -1, 1)) },
    setMuted(value) { muted = !!value; audio.setMuted(muted); notify() },
    setQuality(value) { quality = value === 'high' ? 'high' : 'balanced'; resize(); notify() },
  }
}

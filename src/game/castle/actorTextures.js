import * as THREE from 'three'

let sharedTextures = null
let users = 0

const fract = (value) => value - Math.floor(value)
const noise = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453)

function texture(size, draw, color = false) {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const pixel = draw(x, y, x / size, y / size)
      const offset = (y * size + x) * 4
      data[offset] = pixel[0]
      data[offset + 1] = pixel[1]
      data[offset + 2] = pixel[2]
      data[offset + 3] = 255
    }
  }
  const result = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  result.wrapS = result.wrapT = THREE.RepeatWrapping
  result.magFilter = THREE.LinearFilter
  result.minFilter = THREE.LinearMipmapLinearFilter
  result.generateMipmaps = true
  result.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
  result.needsUpdate = true
  return result
}

// Characters share these small, deterministic surface maps until the last actor is disposed.
export function acquireActorTextures() {
  if (!sharedTextures) {
    const metal = texture(128, (x, y) => {
      const value = 230 + noise(x, y) * 19 + Math.sin(x * .37 + Math.sin(y * .21)) * 5
      return [value, value, value]
    }, true)
    const forge = texture(128, (x, y) => {
      const scratch = y % 23 === 0 && noise(Math.floor(x / 13), y) > .67 ? 28 : 0
      const value = 127 + Math.sin(x * .37 + Math.cos(y * .32)) * 8 + noise(x, y) * 15 - scratch
      return [value, value, value]
    })
    const chain = texture(256, (x, y, u, v) => {
      const row = Math.floor(v * 16)
      const cx = fract(u * 12 + (row % 2) * .5) - .5
      const cy = fract(v * 16) - .5
      const distance = Math.abs(Math.hypot(cx / .34, cy / .43) - 1)
      const link = Math.max(0, 1 - distance / .24)
      const sheen = Math.max(0, .55 - cx + cy * .28)
      const value = 48 + link * (100 + sheen * 85) + noise(x, y) * 9
      return [value, value, value]
    }, true)
    chain.repeat.set(3, 3)
    const cloth = texture(256, (x, y, u, v) => {
      const weave = (x % 4 < 2 ? 1 : -1) * (y % 4 < 2 ? 1 : -1) * 5
      const grain = noise(x, y) * 7 + weave
      const border = Math.min(u, 1 - u) < .045 || v < .032
      const stitch = border && (Math.min(u, 1 - u) > .030 || v > .024)
      const medallionY = fract(v * 3) - .5
      const medallionX = u - .5
      const emblem = Math.abs(medallionX) < .024 && Math.abs(medallionY) < .12
        || Math.abs(medallionY) < .019 && Math.abs(medallionX) < .09
      const base = border ? (stitch ? [176, 145, 91] : [119, 89, 48]) : emblem ? [121, 47, 51] : [100, 26, 39]
      return base.map((channel) => channel + grain)
    }, true)
    const weave = texture(128, (x, y) => {
      const value = 118 + (x % 4 < 2 ? 10 : -10) + (y % 4 < 2 ? 6 : -6) + noise(x, y) * 8
      return [value, value, value]
    })
    const hair = texture(128, (x, y) => {
      const value = 207 + Math.sin(x * 2.0) * 17 + Math.sin(x * .42 + y * .02) * 13 + noise(x, y) * 10
      return [value, value, value]
    }, true)
    sharedTextures = { metal, forge, chain, cloth, weave, hair }
  }
  users++
  let released = false
  return {
    textures: sharedTextures,
    release() {
      if (released) return
      released = true
      users--
      if (users === 0) {
        Object.values(sharedTextures).forEach((map) => map.dispose())
        sharedTextures = null
      }
    },
  }
}

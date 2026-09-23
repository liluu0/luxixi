import level from './level.json'

const COURTYARD_FLOOR = 9.6
const COURTYARD_CEILING = 16
const courtyardAreas = (level.courtyardAreas?.length ? level.courtyardAreas : [level.arena])
  .map(area => ({ ...area, floor: COURTYARD_FLOOR, ceiling: COURTYARD_CEILING }))

export const PLAY_AREAS = {
  courtyard: courtyardAreas,
  interior: { minX: 71.65, maxX: 88.35, minZ: -23.35, maxZ: 7.35, floor: 10.52, ceiling: 14 },
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function insideArea(position, area) {
  return position.x >= area.minX && position.x <= area.maxX
    && position.z >= area.minZ && position.z <= area.maxZ
}

function closestCourtyardPoint(position) {
  if (courtyardAreas.some(area => insideArea(position, area))) return position

  let closest = null
  let closestDistance = Infinity
  for (const area of courtyardAreas) {
    const candidate = {
      x: clamp(position.x, area.minX, area.maxX),
      z: clamp(position.z, area.minZ, area.maxZ),
    }
    const distance = (candidate.x - position.x) ** 2 + (candidate.z - position.z) ** 2
    if (distance < closestDistance) {
      closest = candidate
      closestDistance = distance
    }
  }
  return { ...position, ...closest }
}

// Physics handles the detailed floor; this guard keeps a missed contact inside the playable volume.
export function protectedPosition(position, zone, fallback) {
  const finite = [position.x, position.y, position.z].every(Number.isFinite)
  const source = finite ? position : fallback
  if (zone === 'courtyard') {
    const horizontal = closestCourtyardPoint(source)
    return {
      x: horizontal.x,
      y: clamp(source.y, COURTYARD_FLOOR, COURTYARD_CEILING),
      z: horizontal.z,
    }
  }

  const area = PLAY_AREAS.interior
  return {
    x: clamp(source.x, area.minX, area.maxX),
    y: clamp(source.y, area.floor, area.ceiling),
    z: clamp(source.z, area.minZ, area.maxZ),
  }
}

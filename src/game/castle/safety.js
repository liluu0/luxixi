export const PLAY_AREAS = {
  courtyard: { minX: -7.4, maxX: 7.4, minZ: -2.4, maxZ: 12.4, floor: 10.12, ceiling: 14 },
  interior: { minX: 71.65, maxX: 88.35, minZ: -23.35, maxZ: 7.35, floor: 10.52, ceiling: 14 },
}

// Physics handles the detailed floor; this guard keeps a missed contact inside the playable volume.
export function protectedPosition(position, zone, fallback) {
  const area = PLAY_AREAS[zone]
  const finite = [position.x, position.y, position.z].every(Number.isFinite)
  const source = finite ? position : fallback
  return {
    x: Math.max(area.minX, Math.min(area.maxX, source.x)),
    y: Math.max(area.floor, Math.min(area.ceiling, source.y)),
    z: Math.max(area.minZ, Math.min(area.maxZ, source.z)),
  }
}

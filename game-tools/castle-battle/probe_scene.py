"""Inspect candidate spawn surfaces in the real GLB geometry."""

from pathlib import Path
import bpy
import json
from mathutils import Vector

TOOLS_DIR = Path(__file__).resolve().parent
PROJECT_DIR = TOOLS_DIR.parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(PROJECT_DIR / 'public/assets/castle-battle/castle-sanctuary-lite.glb'))
candidates = [(0, 11), (0, .7), (3.04, 1.96), (4.3, 5.7), (3.04, 8.04),
              (0, 9.3), (-3.04, 8.04), (-4.3, 5), (-3.04, 1.96),
              (-5.5, 5), (5.5, 7), (-5.5, 9), (5.5, 9)]
report = []
for x, z in candidates:
    hits = []
    for obj in bpy.data.objects:
        if obj.type != 'MESH' or any(key in obj.name for key in ('Lake', 'Glacial', 'Waterfall')):
            continue
        origin = obj.matrix_world.inverted() @ Vector((x, -z, 50))
        direction = obj.matrix_world.to_3x3().inverted() @ Vector((0, 0, -1))
        hit, point, normal, index = obj.ray_cast(origin, direction)
        if hit:
            world_point = obj.matrix_world @ point
            hits.append({'mesh': obj.name, 'height': round(world_point.z, 3)})
    report.append({'xz': [x, z], 'hits': sorted(hits, key=lambda hit: hit['height'], reverse=True)[:5]})
(TOOLS_DIR / 'surface-probe.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print('SURFACE_PROBE', json.dumps(report))

"""Create the web asset without modifying the source Blender document."""

from pathlib import Path
import bpy
import json


TOOLS_DIR = Path(__file__).resolve().parent
PROJECT_DIR = TOOLS_DIR.parents[1]
ASSET_DIR = PROJECT_DIR / 'public' / 'assets' / 'castle-battle'
SOURCE = PROJECT_DIR.parent / 'sanctuary' / 'delivery' / 'aurelia_rebuilt.blend'

bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
for obj in list(bpy.data.objects):
    if obj.type != 'MESH' or obj.name in {
        'Lake mist volume', 'Atmosphere over the distant mountains'
    }:
        bpy.data.objects.remove(obj, do_unlink=True)

meshes = [obj for obj in bpy.data.objects if obj.type == 'MESH']
landscape = ('Glacial alpine', 'Lake |', 'Island vegetation', 'Natural rock', 'Waterfalls')
for obj in meshes:
    if len(obj.data.polygons) > 1500:
        bpy.context.view_layer.objects.active = obj
        mod = obj.modifiers.new('Web geometry reduction', 'DECIMATE')
        mod.ratio = 0.16 if any(key in obj.name for key in landscape) else 0.38
        bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.data.validate(clean_customdata=True)

bpy.ops.export_scene.gltf(
    filepath=str(ASSET_DIR / 'castle-sanctuary-lite.glb'),
    export_format='GLB', export_apply=True, export_materials='EXPORT',
    export_cameras=False, export_lights=False,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
)

report = {
    'source': 'sanctuary/delivery/aurelia_rebuilt.blend',
    'meshCount': len(meshes),
    'polygonsBeforeTriangulation': sum(len(obj.data.polygons) for obj in meshes),
    'bytes': (ASSET_DIR / 'castle-sanctuary-lite.glb').stat().st_size,
    'coordinateSystem': 'glTF right-handed, Y up',
    'platformHeight': 10,
    'spawn': [0, 10.52, 11],
    'gardenCenter': [0, 10.5, 5],
    'omitted': ['Blender lights', 'Blender cameras', 'volume-only fog meshes'],
}
(TOOLS_DIR / 'manifest.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print('WEB_EXPORT_COMPLETE', report)

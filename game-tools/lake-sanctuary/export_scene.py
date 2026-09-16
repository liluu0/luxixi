"""Export the supplied V3 scene for the portfolio; never save the source .blend.

blender --background --factory-startup --python export_scene.py -- SOURCE.blend
"""
import hashlib
import json
import sys
import tempfile
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/assets/lake-sanctuary'
SOURCE = Path(sys.argv[sys.argv.index('--') + 1])
OUT.mkdir(parents=True, exist_ok=True)
# A stable snapshot also makes the manifest correct if the artist saves the
# original scene again while this export is running. This scene is self-contained.
source_bytes = SOURCE.read_bytes()
source_hash = hashlib.sha256(source_bytes).hexdigest()
with tempfile.TemporaryDirectory(prefix='sanctuary-export-') as temporary:
    snapshot = Path(temporary) / SOURCE.name
    snapshot.write_bytes(source_bytes)
    bpy.ops.wm.open_mainfile(filepath=str(snapshot))

def web_vector(v):
    return [round(v.x, 4), round(v.z, 4), round(-v.y, 4)]

cameras = []
for obj in bpy.context.scene.objects:
    if obj.type == 'CAMERA':
        forward = obj.rotation_euler.to_quaternion() @ Vector((0, 0, -1))
        cameras.append({'name': obj.name, 'position': web_vector(obj.location),
                        'target': web_vector(obj.location + forward * 235),
                        'fov': round(obj.data.angle_y * 180 / 3.14159265, 3)})

omitted = ['Lake mist volume', 'Atmosphere over the distant mountains']
visible_objects = set()
def collect_visible(collection, parent_visible=True):
    visible = parent_visible and not collection.hide_render
    if visible:
        visible_objects.update(o.name for o in collection.objects if not o.hide_render)
    for child in collection.children:
        collect_visible(child, visible)
collect_visible(bpy.context.scene.collection)
for obj in list(bpy.data.objects):
    if obj.type != 'MESH' or obj.name in omitted or obj.name not in visible_objects:
        bpy.data.objects.remove(obj, do_unlink=True)

meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
source_polygons = sum(len(o.data.polygons) for o in meshes)
source_mesh_count = len(meshes)
for obj in meshes:
    # The source batches an 80 km horizon quad into the detailed lake. Remove
    # only that remote quad so Draco quantization preserves the nearby ripples.
    if obj.name.startswith('Lake |'):
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if max(abs(v.co.x), abs(v.co.y)) > 2000], context='VERTS')
        bm.to_mesh(obj.data)
        bm.free()

for material in bpy.data.materials:
    if not material.use_nodes:
        continue
    shader = next((n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not shader:
        continue
    # glTF does not encode Blender procedural node graphs. Preserve source
    # colors, roughness, metals and emissions, without exporting broken links.
    for name in ['Base Color', 'Normal']:
        for link in list(shader.inputs[name].links):
            material.node_tree.links.remove(link)
    shader.inputs['Base Color'].default_value = material.diffuse_color

# Thousands of individual leaves otherwise each become a browser draw call.
# Join matching material slots, preserving all geometry and world transforms.
batches = {}
for collection in bpy.data.collections:
    collection.hide_viewport = False
    collection.hide_select = False
def reveal_layer(layer):
    layer.exclude = False
    layer.hide_viewport = False
    for child in layer.children:
        reveal_layer(child)
reveal_layer(bpy.context.view_layer.layer_collection)
bpy.context.view_layer.update()
for obj in meshes:
    obj.hide_viewport = False
    obj.hide_select = False
    obj.hide_set(False)
    key = tuple(slot.material.name if slot.material else '' for slot in obj.material_slots)
    batches.setdefault(key, []).append(obj)
bpy.ops.object.select_all(action='DESELECT')
for key, objects in batches.items():
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    if len(objects) > 1:
        bpy.ops.object.join()
    objects[0].name = 'Sanctuary | ' + ' + '.join(key)
    bpy.ops.object.select_all(action='DESELECT')
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
assert len(meshes) <= len(batches), f'Incomplete material batching: {len(meshes)} meshes / {len(batches)} batches'

asset = OUT / 'aurelia-sanctuary-v3.glb'
bpy.ops.export_scene.gltf(
    filepath=str(asset), export_format='GLB', export_apply=True,
    export_materials='EXPORT', export_cameras=False, export_lights=False,
    export_animations=False, export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
    export_draco_position_quantization=16,
)
manifest = {
    'source': SOURCE.name, 'sourceSha256': source_hash,
    'sourceMeshCount': source_mesh_count, 'meshCount': len(meshes), 'sourcePolygons': source_polygons,
    'webPolygons': sum(len(o.data.polygons) for o in meshes),
    'bytes': asset.stat().st_size, 'cameras': cameras,
    'adaptations': ['Volume fog replaced by runtime fog', 'Procedural materials use source base colors',
                    'Distant horizon quad omitted', 'Runtime lighting replaces Blender lights',
                    'Objects and collections hidden from source rendering omitted'],
}
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
(ROOT / 'src/components/sanctuary/modelVersion.json').write_text(
    json.dumps({'sourceSha256': source_hash}) + '\n', encoding='utf-8')
print('SANCTUARY_EXPORT_COMPLETE', json.dumps(manifest))

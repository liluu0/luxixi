"""Render the current V3 source camera without saving changes to the .blend."""
import hashlib
import json
import sys
import tempfile
from pathlib import Path
import bpy

source = Path(sys.argv[sys.argv.index('--') + 1])
out = Path(__file__).resolve().parents[2] / 'public/assets/lake-sanctuary'
source_bytes = source.read_bytes()
with tempfile.TemporaryDirectory(prefix='sanctuary-preview-') as temporary:
    snapshot = Path(temporary) / source.name
    snapshot.write_bytes(source_bytes)
    bpy.ops.wm.open_mainfile(filepath=str(snapshot))
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.threads_mode = 'FIXED'
scene.render.threads = 8
scene.render.resolution_x = 1200
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = str(out / 'preview.png')
bpy.ops.render.render(write_still=True)
(out / 'preview-manifest.json').write_text(json.dumps({
    'source': source.name, 'sourceSha256': hashlib.sha256(source_bytes).hexdigest(),
    'camera': scene.camera.name, 'engine': 'Cycles', 'samples': 24,
    'resolution': [1200, 800],
}, indent=2), encoding='utf-8')

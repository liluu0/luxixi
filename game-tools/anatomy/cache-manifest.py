"""Run after changing atlas.json or model chunks; hashes version browser caches."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
assets = root / 'public/assets/anatomy'
atlas = json.loads((assets / 'atlas.json').read_text(encoding='utf-8'))
names = ['atlas.json'] + [Path(chunk['gzip']).name for chunk in atlas['chunks']]
files = {name: hashlib.sha256((assets / name).read_bytes()).hexdigest() for name in names}
lengths = {name: [(assets / name).stat().st_size] for name in names}
for chunk in atlas['chunks']:
    lengths[Path(chunk['gzip']).name].append(chunk['bytes'])
version = hashlib.sha256(json.dumps(files, sort_keys=True).encode()).hexdigest()[:16]
(root / 'src/components/anatomy/cacheManifest.json').write_text(
    json.dumps({'version': version, 'files': files, 'lengths': lengths}, indent=2) + '\n', encoding='utf-8')
print(f'Generated {version}: {len(files)} resources')

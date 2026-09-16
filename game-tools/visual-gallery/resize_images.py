"""Generate responsive gallery assets from the retained original WebP files."""
from pathlib import Path
from PIL import Image

assets = Path(__file__).resolve().parents[2] / 'public/assets/visual-gallery'
for name in ('storm-train', 'city-skater', 'inventor', 'boxing'):
    with Image.open(assets / f'{name}.webp') as source:
        for label, width, quality in [('mobile', 768, 78), ('desktop', 1280, 82)]:
            height = round(source.height * width / source.width)
            image = source.convert('RGB').resize((width, height), Image.Resampling.LANCZOS)
            target = assets / f'{name}-{label}.webp'
            image.save(target, 'WEBP', quality=quality, method=6)
            print(f'{target.name}: {width}x{height}, {target.stat().st_size} bytes')

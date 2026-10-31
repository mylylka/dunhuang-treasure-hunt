"""Derive wall decoration from existing user-supplied game artwork; no repainting."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/world/courtyard/v002'
RECORD = ROOT / 'art-source/world/wall-decoration/v001'
for folder in (OUT, RECORD):
    folder.mkdir(parents=True, exist_ok=True)
sources = [
    ('wall-floral-panel.jpg', 'public/assets/levels/coloring-grape-lotus/coloring-grape-lotus-reference-v002.png', None, 1024),
    ('wall-lotus-panel.jpg', 'public/assets/levels/patterns-lotus/patterns-lotus-a-v001.png', None, 1024),
    ('wall-vine-panel.jpg', 'public/assets/levels/coloring-grape-pomegranate/coloring-grape-pomegranate-reference-v002.png', None, 1024),
    ('wall-floral-border.jpg', 'public/assets/levels/coloring-grape-lotus/coloring-grape-lotus-reference-v002.png', [120,14,1133,111], 1013),
]
records = []
for name, source, crop, max_side in sources:
    with Image.open(ROOT / source) as raw:
        im = raw.convert('RGB')
        if crop:
            im = im.crop(crop)
        im.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        im.save(OUT / name, quality=92, subsampling=0)
        size = im.size
    records.append({'output': str((OUT / name).relative_to(ROOT)), 'source': source, 'sourceSha256': hashlib.sha256((ROOT / source).read_bytes()).hexdigest(), 'cropXYXY': crop, 'pixels': size, 'outputSha256': hashlib.sha256((OUT / name).read_bytes()).hexdigest()})
(RECORD / 'source-manifest.json').write_text(json.dumps({
    'version': 'v001', 'status': 'existing approved artwork reused for sample wall decoration',
    'method': 'Complete square artwork scaled proportionally; border is an explicitly recorded rectangular crop. JPEG92. No AI generation, repainting, perspective reconstruction, or watermark removal.',
    'meaning': 'Decorative use of user-supplied teaching illustrations, not a reconstruction of a historical building or an exact extraction of the concept mural.',
    'items': records,
}, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(records, ensure_ascii=False, indent=2))

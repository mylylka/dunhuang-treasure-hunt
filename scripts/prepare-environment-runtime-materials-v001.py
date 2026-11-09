"""Pack approved v002 material maps for the real-time ground shader.

Technical channel packing only: no regenerated artwork or sunlight bake.
python3 scripts/prepare-environment-runtime-materials-v001.py
"""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'outputs/environment-study/v002/textures'
OUT = ROOT / 'public/assets/world/environment-world/v001'
MANIFEST = ROOT / 'art-source/world/models/environment-world/v001/ground-material-manifest.json'
OUT.mkdir(parents=True, exist_ok=True)
MANIFEST.parent.mkdir(parents=True, exist_ok=True)


def pixels(name):
    return np.asarray(Image.open(SOURCE / name).convert('RGB'))


files = []
for kind in ('gravel', 'gobi'):
    albedo = pixels(f'{kind}-embedded-grit-basecolor.png')
    control = pixels(f'{kind}-embedded-grit-control.png')
    normal = pixels(f'{kind}-embedded-grit-normal.png')
    roughness = pixels(f'{kind}-embedded-grit-roughness.png')
    # PNG alpha is linear even when RGB is decoded as sRGB by WebGL.
    color_id = np.dstack((albedo, control[:, :, 1]))
    normal_roughness = np.dstack((normal[:, :, :2], roughness[:, :, 0], control[:, :, 0]))
    for name, data, space, channels in (
        ('color-id', color_id, 'sRGB RGB; linear alpha', 'RGB=original basecolor, A=per-particle random ID'),
        ('surface', normal_roughness, 'linear data', 'RG=tangent normal XY, B=roughness, A=particle coverage'),
    ):
        filename = f'ground-{kind}-{name}.png'
        Image.fromarray(data, 'RGBA').save(OUT / filename, optimize=True)
        # Exact decoded-byte roundtrip catches premultiplication/gamma mistakes.
        assert np.array_equal(np.asarray(Image.open(OUT / filename)), data)
        files.append({'path': f'environment-world/v001/{filename}', 'dimensions': list(data.shape[:2][::-1]),
                      'sha256': hashlib.sha256((OUT / filename).read_bytes()).hexdigest(),
                      'bytes': (OUT / filename).stat().st_size, 'colorSpace': space, 'channels': channels})

manifest = {
    'version': 'v001', 'sourceStudy': 'environment-study/v002',
    'method': 'Lossless technical channel packing of the approved embedded-grit image layers; no new art or directional lighting.',
    'microTileMetres': 2, 'fileTextureCount': 4,
    'runtimeControlTexture': {'resolution': [512, 512], 'channels': 'R=gravel probability, G=gobi probability, B=gravel hardpan, A=gobi hardpan',
                              'method': 'Nonperiodic world-coordinate region field, initialized once; not the repeated 64m study crop.'},
    'mesoscale': 'A reduced world-coordinate noise shader reproduces shallow deposition / compacted worn patches; no displacement or collision change.',
    'microAndControlGpuMiBIncludingMipmaps': round((4*1024*1024*4*4/3 + 512*512*4)/1024**2, 2),
    'basecolorContainsDirectionalSunlight': False,
    'files': files,
    'limitations': ['The runtime meso shader is a reduced approximation of the approved Blender node field, not a pixel-identical bake.',
                   '2m micro tiles repeat; their visible particles are gated by a separate nonrepeating world mask.',
                   'No extra geometry or collision is added by this material; larger rocks are a separate environment layer.'],
    'rebuild': 'python3 scripts/prepare-environment-runtime-materials-v001.py',
}
MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({'textures': len(files), 'bytes': sum(f['bytes'] for f in files), 'manifest': str(MANIFEST)}, ensure_ascii=False))

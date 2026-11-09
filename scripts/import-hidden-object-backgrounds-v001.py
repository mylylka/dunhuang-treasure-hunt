#!/usr/bin/env python3
"""Preserve the three approved imagegen chapter backgrounds, without image edits."""
import argparse
import hashlib
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GENERATED = Path('/Users/liujing/.codex/generated_images/01a19405-8b6b-7183-9aad-bc280fe40054')
ARCHIVE = ROOT / 'art-source/shared/hidden-object-backgrounds/v001'
RUNTIME = ROOT / 'public/assets/shared/hidden-object-backgrounds/v001'
SPECS = [
    (1, 'silk', 'exec-7039028d-5ded-418f-bd0a-8d66878f3696.png', '暖沙金绢帛',
     'Warm ivory silk, pale straw gold and faint ochre; tiny woven fibres, broad barely perceptible silk undulations; sparse faded abstract ribbon/braided side flourishes.'),
    (2, 'celadon', 'exec-6596ffb4-e1b1-4e9b-89ca-47d64bd31475.png', '浅青绿云气',
     'Pale celadon, very light sage and soft blue-green mineral-pigment wash; subtle pigment blooms; airy abstract cloud currents dissolve into the side margins.'),
    (3, 'plaster', 'exec-ef946764-f4a0-47a7-9532-ae7f039b8e7f.png', '淡藕灰壁面',
     'Very light warm grey-lilac plaster, soft powdery mineral finish and subtle pigment flecks; sparse discontinuous geometric side fragments in faded cinnabar, antique gold and mineral green.'),
]
SHARED_BRIEF = ('Single empty Dunhuang-inspired hidden-object playing background. Portrait 8:15, '
    'full-bleed flat 2D. Central 88% nearly empty and consistently very light; delicate far side accents. '
    'Every top/middle/bottom crop equally quiet. No text/UI/labels/watermarks/people/deities/animals/'
    'recognizable flowers/instruments/clothing/utensils/central motif/scroll rods/frame/dark patches/'
    'coarse cracks/strong vignette. Low-contrast tactile texture. Artistic game background, not historical reconstruction.')


def store(path, content, check):
    if path.exists():
        if path.read_bytes() != content:
            raise ValueError(f'Existing file differs; preserve it and create a new version: {path}')
    elif check:
        raise ValueError(f'Missing imported file: {path}')
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open('xb') as stream:
            stream.write(content)


def main(check):
    assets = []
    for chapter, slug, source, title, direction in SPECS:
        original = GENERATED / source
        # The archive remains sufficient for verification if the imagegen cache is unavailable.
        filename = f'chapter-{chapter}-{slug}.png'
        data = original.read_bytes() if original.exists() else (ARCHIVE / filename).read_bytes()
        assert data[:8] == b'\x89PNG\r\n\x1a\n', 'Expected original PNG'
        width, height = struct.unpack('>II', data[16:24])
        assert (width, height) == (916, 1717)
        store(ARCHIVE / filename, data, check)
        store(RUNTIME / filename, data, check)
        assets.append({'id': f'hidden-object-background-ch{chapter}', 'chapter': chapter, 'title': title,
            'generationTool': 'built-in imagegen', 'generatedSource': str(original),
            'archive': (ARCHIVE / filename).relative_to(ROOT).as_posix(),
            'runtime': '/' + (RUNTIME / filename).relative_to(ROOT / 'public').as_posix(),
            'width': width, 'height': height, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
            'promptBrief': direction, 'processing': 'Original PNG bytes copied intact. No recolouring, cropping, resizing or repainting.'})
    manifest = {'version': 'hidden-object-chapters-v001', 'approvedDate': '2026-11-03',
        'authorization': 'User requested three backgrounds, reviewed all three, then authorized development.',
        'sharedGenerationBrief': SHARED_BRIEF, 'scope': 'Three chapter backgrounds only; object sprites stay unchanged.',
        'assets': assets}
    store(ARCHIVE / 'manifest.json', (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode(), check)
    print(json.dumps({'checked': check, 'assets': len(assets), 'bytesPreserved': True}, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    main(parser.parse_args().check)

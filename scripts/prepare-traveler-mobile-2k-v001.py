#!/usr/bin/env python3
"""Create a review-only 2K texture candidate without changing the traveler rig."""

import gzip
import importlib.util
import io
import json
from copy import deepcopy
from pathlib import Path

from PIL import Image, __version__ as PILLOW_VERSION

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/assets/world/traveler-tripo/v002/traveler.glb'
OUTPUT = ROOT / 'public/assets/world/traveler-tripo/v003/traveler-mobile-2k-candidate.glb'
MANIFEST = ROOT / 'art-source/world/traveler-tripo/v003/mobile-2k-candidate-manifest.json'
spec = importlib.util.spec_from_file_location('glb_tools', ROOT / 'scripts/prepare-mogao-exhibit-interior-mobile-v001.py')
glb = importlib.util.module_from_spec(spec)
spec.loader.exec_module(glb)

def main():
    raw = SOURCE.read_bytes()
    original, binary = glb.unpack_glb(raw)
    assert len(original['images']) == 1
    image = original['images'][0]
    assert image['mimeType'] == 'image/jpeg'
    view = image['bufferView']
    assert not any(a.get('bufferView') == view for a in original['accessors'])
    encoded = glb.buffer_data(original, binary, view)
    with Image.open(io.BytesIO(encoded)) as source:
        source.load()
        assert source.mode == 'RGB' and source.size == (4096, 4096)
        assert source.getexif().get(274, 1) == 1
        scaled = source.resize((2048, 2048), Image.Resampling.LANCZOS)
    target = io.BytesIO()
    scaled.save(target, format='JPEG', quality=92, subsampling=0, optimize=True)
    replacement = target.getvalue()
    result = glb.repack(original, binary, {view: replacement}, {image['name']: 'image/jpeg'})

    candidate, candidate_binary = glb.unpack_glb(result)
    normalized = deepcopy(candidate)
    for index, item in enumerate(normalized['bufferViews']):
        previous = original['bufferViews'][index]
        expected = replacement if index == view else glb.buffer_data(original, binary, index)
        assert glb.buffer_data(candidate, candidate_binary, index) == expected
        item['byteLength'] = previous['byteLength']
        if 'byteOffset' in previous:
            item['byteOffset'] = previous['byteOffset']
        else:
            item.pop('byteOffset', None)
    normalized['buffers'][0]['byteLength'] = original['buffers'][0]['byteLength']
    assert normalized == original, 'unexpected glTF metadata change'
    assert len(original['skins']) == 1
    assert {clip['name'] for clip in original['animations']} == {'LookAround', 'Run', 'Idle', 'Walk', 'Greeting', 'HallLookUp'}
    with Image.open(io.BytesIO(glb.buffer_data(candidate, candidate_binary, view))) as check:
        check.load()
        assert check.mode == 'RGB' and check.size == (2048, 2048) and check.format == 'JPEG'
    gz = lambda data: len(gzip.compress(data, compresslevel=6, mtime=0))
    manifest = {
        'status': 'connected-gallery phone runtime; simulated visual review passed; physical-device review pending',
        'source': {'path': str(SOURCE.relative_to(ROOT)), 'bytes': len(raw), 'sha256': glb.sha(raw), 'gzipLevel6Bytes': gz(raw)},
        'output': {'path': str(OUTPUT.relative_to(ROOT)), 'bytes': len(result), 'sha256': glb.sha(result), 'gzipLevel6Bytes': gz(result)},
        'texture': {'sourceSize': [4096, 4096], 'outputSize': [2048, 2048], 'sourceMode': 'RGB JPEG without alpha', 'outputMode': 'RGB JPEG without alpha', 'sampling': 'Lanczos', 'quality': 92, 'chromaSubsampling': '4:4:4', 'pillow': PILLOW_VERSION},
        'verification': {'nonTextureBufferViews': len(original['bufferViews']) - 1, 'allNonTextureBytesIdentical': True, 'metadataIdenticalExcept': ['buffer lengths and offsets'], 'skins': len(original['skins']), 'animations': [a['name'] for a in original['animations']]},
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    glb.write_new_or_identical(OUTPUT, result)
    glb.write_new_or_identical(MANIFEST, (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode())
    print(f"Traveler: {len(raw):,} -> {len(result):,} bytes; gzip: {gz(raw):,} -> {gz(result):,} bytes")

if __name__ == '__main__':
    main()

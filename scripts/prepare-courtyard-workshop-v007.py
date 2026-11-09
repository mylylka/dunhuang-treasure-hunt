#!/usr/bin/env python3
"""Register the original high-resolution board and derive pale cabinet wood."""
import hashlib
import io
import json
from pathlib import Path
import runpy
import shutil
import struct

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'art-source/world/models/courtyard/v007'
RUNTIME = ROOT / 'public/assets/world/courtyard/v007'
BOARD = Path('/Users/liujing/Downloads/敦煌/3d视觉素材库/纹样馆道具_高清切图39个/props/02_easel_grid4.png')
BOARD_SHA = 'b626390ae1a39058c4cac1a41c4a911fe7a5864ba747a32be429c1321089367c'
RACK = ROOT / 'public/assets/world/pigment-rack/v001/pigment-rack.glb'
QUAD = [(30.37, 58.28), (524.49, 32.33), (603.99, 452.49), (108.02, 506.01)]
SIZE = (494, 426)
PALE_WOOD = (226, 199, 158)
PALE_AMOUNT = .28


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rack_wood():
    raw = RACK.read_bytes()
    size = struct.unpack_from('<I', raw, 12)[0]
    model = json.loads(raw[20:20 + size])
    binary = memoryview(raw)[28 + size:]
    images = {image.get('name'): image for image in model['images']}
    wood = {}
    for key in ('wood', 'wood_light'):
        view = model['bufferViews'][images[key]['bufferView']]
        start = view.get('byteOffset', 0)
        image = Image.open(io.BytesIO(binary[start:start + view['byteLength']])).convert('RGB')
        lut = [round(value * (1 - PALE_AMOUNT) + pale * PALE_AMOUNT) for pale in PALE_WOOD for value in range(256)]
        name = f'pigment-rack-{key.replace("_", "-")}-pale.png'
        path = ARCHIVE / name
        image.point(lut).save(path, optimize=True)
        wood[key] = {'file': name, 'sha256': digest(path), 'pixels': list(image.size)}
    return wood


def main():
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    RUNTIME.mkdir(parents=True, exist_ok=True)
    source = ARCHIVE / BOARD.name
    if not source.exists():
        if digest(BOARD) != BOARD_SHA:
            raise ValueError('High-resolution display source no longer matches the registered art.')
        shutil.copyfile(BOARD, source)
    if digest(source) != BOARD_SHA:
        raise ValueError('Archived display source no longer matches the registered art.')

    tools = runpy.run_path(str(ROOT / 'scripts/prepare-hall-decoration-v001.py'), run_name='courtyard_texture_tools')
    coefficients = tools['perspective_coefficients'](SIZE, QUAD)
    board = RUNTIME / 'display-board-art.jpg'
    with Image.open(source) as image:
        if image.size != (620, 590):
            raise ValueError('Unexpected dimensions in the high-resolution display reference.')
        image.convert('RGB').transform(SIZE, Image.Transform.PERSPECTIVE, coefficients,
            resample=Image.Resampling.BICUBIC).save(board, quality=97, subsampling=0, optimize=True)

    manifest = {
        'board': {'originalPath': str(BOARD), 'archive': source.name, 'sourceSha256': BOARD_SHA,
                  'quadClockwiseTLTRBRBL': QUAD, 'pixels': SIZE, 'file': board.name, 'sha256': digest(board)},
        'registration': {'reference': 'courtyard/v006/display-board-art.jpg', 'matches': 257,
                         'inliers': 234, 'medianSourceErrorPixels': .38},
        'cabinet': {'source': str(RACK.relative_to(ROOT)), 'sourceSha256': digest(RACK),
                    'mixColorSRGB': PALE_WOOD, 'amount': PALE_AMOUNT, 'materials': rack_wood()},
    }
    (ARCHIVE / 'workshop-textures.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()

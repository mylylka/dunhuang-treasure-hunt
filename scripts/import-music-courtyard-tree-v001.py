"""Preserve the supplied 2K GLBs; copy the selected tree without re-encoding."""
from pathlib import Path
import hashlib
import io
import json
import struct

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'art-source/world/music-courtyard-tree/v001'
RUNTIME = ROOT / 'public/assets/world/music-courtyard-tree/v001'
ARCHIVE.mkdir(parents=True, exist_ok=True)
RUNTIME.mkdir(parents=True, exist_ok=True)


def preserve(path, data):
    if path.exists():
        if path.read_bytes() != data:
            raise RuntimeError(f'Refusing to overwrite a different file: {path}')
    else:
        path.write_bytes(data)


records = []
for name in ['tree 3d model.glb', 'stylized tree 3d model.glb']:
    data = (Path('/Users/liujing/Downloads') / name).read_bytes()
    preserve(ARCHIVE / name, data)
    size = struct.unpack_from('<I', data, 12)[0]
    document = json.loads(data[20:20 + size])
    accessor = document['accessors'][0]
    image = document['images'][0]
    view = document['bufferViews'][image['bufferView']]
    binary = data[28 + size:]
    start = view.get('byteOffset', 0)
    picture = Image.open(io.BytesIO(binary[start:start + view['byteLength']]))
    if max(picture.size) > 2048:
        raise RuntimeError('Unexpected texture size; review before deriving another version')
    records.append({
        'sourceName': name, 'sourceSha256': hashlib.sha256(data).hexdigest(),
        'sourceBytes': len(data), 'bounds': {'min': accessor['min'], 'max': accessor['max']},
        'triangles': document['accessors'][3]['count'] // 3, 'textureSize': list(picture.size),
        'selected': name == 'tree 3d model.glb',
    })
selected = (ARCHIVE / 'tree 3d model.glb').read_bytes()
preserve(RUNTIME / 'music-courtyard-tree.glb', selected)
manifest = {
    'version': 1,
    'selection': 'tree 3d model.glb',
    'selectionReason': 'More upright main trunk and broad upper crown; offline silhouette comparison and building-envelope placement checks.',
    'runtimeFile': 'music-courtyard-tree.glb',
    'runtimeSha256': hashlib.sha256(selected).hexdigest(),
    'processing': 'Original GLB bytes copied unchanged. Embedded texture is already 2048x2048; no image resampling, repaint, geometry or material change.',
    'runtimePlacement': {'sourcePosition': [31.3, .035, -8.5], 'yawDegrees': 180, 'height': 34,
                         'rootAnchor': [.009765625, 0, -.013916015625]},
    'candidates': records,
}
(ARCHIVE / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(f'Original and runtime GLB preserved: {manifest["runtimeSha256"]}')

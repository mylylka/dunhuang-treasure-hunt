"""Archive supplied GLBs; only downsample embedded base-color JPEGs to 2K."""
from pathlib import Path
import hashlib
import io
import json
import math
import struct

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
INPUT = Path('/Users/liujing/Downloads/3d视觉素材库/3D模型')
ARCHIVE = ROOT / 'art-source/world/tower-trees/v001'
RUNTIME = ROOT / 'public/assets/world/tower-trees/v001'
FILES = [
    ('stylized tree 3d model (6).glb', 'stylized-tree.glb'),
    ('low-poly tree 3d model (2).glb', 'broad-tree.glb'),
]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def preserve(path, data):
    if path.exists():
        if path.read_bytes() != data:
            raise RuntimeError(f'Refusing to overwrite a different version: {path}')
        return
    path.write_bytes(data)


def read_glb(data):
    if data[:4] != b'glTF' or struct.unpack_from('<I', data, 4)[0] != 2:
        raise ValueError('Expected a binary glTF 2.0 model')
    json_length, chunk_type = struct.unpack_from('<II', data, 12)
    if chunk_type != 0x4E4F534A:
        raise ValueError('Expected JSON as the first GLB chunk')
    document = json.loads(data[20:20 + json_length])
    binary_length, binary_type = struct.unpack_from('<II', data, 20 + json_length)
    if binary_type != 0x004E4942:
        raise ValueError('Expected an embedded binary GLB chunk')
    return document, data[28 + json_length:28 + json_length + binary_length]


def view_bytes(document, binary, index):
    view = document['bufferViews'][index]
    start = view.get('byteOffset', 0)
    return binary[start:start + view['byteLength']]


def import_model(source_name, runtime_name):
    original = (INPUT / source_name).read_bytes()
    preserve(ARCHIVE / source_name, original)
    document, binary = read_glb(original)
    if len(document['buffers']) != 1 or document.get('animations') or document.get('skins'):
        raise ValueError('This importer expects the audited static, single-buffer models')
    for category in ['images', 'buffers']:
        if any('uri' in item for item in document.get(category, [])):
            raise ValueError('Unexpected external resource')
    replacements = {}
    texture_records = []
    for image in document['images']:
        index = image['bufferView']
        source_image = view_bytes(document, binary, index)
        picture = Image.open(io.BytesIO(source_image))
        source_size = list(picture.size)
        picture.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
        encoded = io.BytesIO()
        picture.save(encoded, format='JPEG', quality=92, subsampling=0, optimize=True)
        replacements[index] = encoded.getvalue()
        texture_records.append({
            'name': image.get('name'), 'sourceSize': source_size,
            'runtimeSize': list(picture.size), 'sourceSha256': sha(source_image),
            'runtimeSha256': sha(replacements[index]), 'runtimeBytes': len(replacements[index]),
            'operation': 'LANCZOS downsample to 2048px; JPEG quality 92, 4:4:4; no repaint, crop, recolor or AI processing',
        })
    old_views = [view_bytes(document, binary, i) for i in range(len(document['bufferViews']))]
    new_binary = bytearray()
    geometry_views = []
    for index, view in enumerate(document['bufferViews']):
        while len(new_binary) % 4:
            new_binary.append(0)
        payload = replacements.get(index, old_views[index])
        view['byteOffset'] = len(new_binary)
        view['byteLength'] = len(payload)
        new_binary.extend(payload)
        if index not in replacements:
            geometry_views.append({'index': index, 'bytes': len(payload), 'sha256': sha(payload)})
    document['buffers'][0]['byteLength'] = len(new_binary)
    while len(new_binary) % 4:
        new_binary.append(0)
    encoded_json = json.dumps(document, separators=(',', ':'), ensure_ascii=False).encode()
    encoded_json += b' ' * (-len(encoded_json) % 4)
    runtime = (struct.pack('<4sII', b'glTF', 2, 28 + len(encoded_json) + len(new_binary))
               + struct.pack('<II', len(encoded_json), 0x4E4F534A) + encoded_json
               + struct.pack('<II', len(new_binary), 0x004E4942) + new_binary)
    verify, verify_binary = read_glb(runtime)
    for item in geometry_views:
        assert sha(view_bytes(verify, verify_binary, item['index'])) == item['sha256']
    preserve(RUNTIME / runtime_name, runtime)
    accessor = document['accessors'][0]
    view = document['bufferViews'][accessor['bufferView']]
    start = accessor.get('byteOffset', 0)
    raw = old_views[accessor['bufferView']]
    points = [struct.unpack_from('<fff', raw, start + i * view.get('byteStride', 12)) for i in range(accessor['count'])]
    minimum = [min(point[k] for point in points) for k in range(3)]
    maximum = [max(point[k] for point in points) for k in range(3)]
    scale = 25 / (maximum[1] - minimum[1])
    scaled = [(point[0] * scale, (point[1] - minimum[1]) * scale, point[2] * scale) for point in points]
    low = [point for point in scaled if point[1] <= 2.4]
    # Include triangle intersections with the player-height plane, not only
    # vertices below it: slanted branches can cross 2.4m between vertices.
    for mesh in document['meshes']:
        for primitive in mesh['primitives']:
            index_accessor = document['accessors'][primitive['indices']]
            index_bytes = old_views[index_accessor['bufferView']]
            index_start = index_accessor.get('byteOffset', 0)
            component = {5123: 'H', 5125: 'I'}[index_accessor['componentType']]
            indices = struct.unpack_from('<' + component * index_accessor['count'], index_bytes, index_start)
            for i in range(0, len(indices), 3):
                triangle = [scaled[indices[i + j]] for j in range(3)]
                for a, b in zip(triangle, triangle[1:] + triangle[:1]):
                    if (a[1] < 2.4 < b[1]) or (b[1] < 2.4 < a[1]):
                        t = (2.4 - a[1]) / (b[1] - a[1])
                        low.append(tuple(a[k] + (b[k] - a[k]) * t for k in range(3)))
    bounds = lambda vertices: {'min': [min(p[k] for p in vertices) for k in range(3)], 'max': [max(p[k] for p in vertices) for k in range(3)]}
    triangles = sum(document['accessors'][primitive['indices']]['count'] // 3 for mesh in document['meshes'] for primitive in mesh['primitives'])
    return {
        'sourceName': source_name, 'sourcePath': str(INPUT / source_name),
        'sourceBytes': len(original), 'sourceSha256': sha(original),
        'runtimeFile': runtime_name, 'runtimeBytes': len(runtime), 'runtimeSha256': sha(runtime),
        'generator': document['asset'].get('generator'), 'upAxis': 'Y', 'groundY': minimum[1],
        'vertices': len(points), 'triangles': triangles, 'materials': len(document['materials']),
        'originalBounds': {'min': minimum, 'max': maximum}, 'targetHeight': 25, 'uniformScale': scale,
        'boundsAt25m': bounds(scaled), 'lowBoundsAt25m': bounds(low),
        'playerGeometryRadius': max(math.hypot(p[0], p[2]) for p in low),
        'fullGeometryRadius': max(math.hypot(p[0], p[2]) for p in scaled),
        'textures': texture_records, 'unchangedGeometryBufferViews': geometry_views,
        'preserved': ['positions', 'normals', 'UV coordinates', 'triangle indices', 'node transforms', 'material factors', 'mesh names'],
    }


ARCHIVE.mkdir(parents=True, exist_ok=True)
RUNTIME.mkdir(parents=True, exist_ok=True)
records = [import_model(*files) for files in FILES]
manifest = {'version': 1, 'scope': 'User-provided trees for the two sides of the nine-storey tower', 'originalsPreserved': True, 'records': records}
(ARCHIVE / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(records, ensure_ascii=False, indent=2))

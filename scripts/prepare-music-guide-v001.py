"""Archive the supplied Tripo GLBs and derive the six mobile guide assets.

Run with Python, NumPy, SciPy and Pillow. This keeps mesh, UV, skin weights
and bind matrices byte-identical, and adapts animation and texture data only.
"""

import argparse
from copy import deepcopy
import gzip
import hashlib
import io
import json
from pathlib import Path
import struct

import numpy as np
from PIL import Image, ImageOps
from scipy.spatial.transform import Rotation

from asset_intake import AssetIntake, digest, publish_file, read_json, regular_file, staged_path, write_json


ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'art-source/world/music-guide/v001'
OUTPUT = ROOT / 'public/assets/world/music-guide/v001'
SUPPLIED = Path.home() / 'Downloads/第二馆素材/服饰场景小导游3D模型'
OUTFITS = {
    'plain': ('小导游常服.glb', None),
    'northern-wei': ('北魏第257窟_沙弥守戒自杀壁画中的少女.glb', '北魏第257窟_沙弥守戒自杀壁画中的少女原型.PNG'),
    'western-wei': ('285西魏供养人原型.glb', '285西魏供养人原型.PNG'),
    'late-tang': ('晚唐第9窟供养人.glb', '晚唐第9窟供养人原型.jpg'),
    'five-dynasties': ('五代于阗皇后曹氏.glb', '五代于阗皇后曹氏原型.jpg'),
    'yuan': ('元代蒙古女供养人_第332窟.glb', '元代蒙古女供养人_第332窟原型.JPG'),
}
PROPERTIES = ('translation', 'rotation', 'scale')
TYPES = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
DTYPES = {5121: 'u1', 5123: '<u2', 5125: '<u4', 5126: '<f4'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def validate_guide_glb(path):
    with path.open('rb') as source:
        header = source.read(20)
        if len(header) != 20:
            raise ValueError(f'Incomplete GLB header: {path}')
        magic, version, size, json_size, json_kind = struct.unpack('<4sIII4s', header)
        if (magic, version, size, json_kind) != (b'glTF', 2, path.stat().st_size, b'JSON') or json_size > size - 28:
            raise ValueError(f'Invalid GLB header: {path}')
        document = json.loads(source.read(json_size))
        binary_size, binary_kind = struct.unpack('<I4s', source.read(8))
        if (binary_kind, size) != (b'BIN\x00', 28 + json_size + binary_size) or 'asset' not in document:
            raise ValueError(f'Invalid GLB payload: {path}')


def archive(intake, supplied, previous):
    rows = {row['file']: row for row in previous}
    required = {filename for files in OUTFITS.values() for filename in files if filename}
    names = set(rows) | required
    if supplied:
        names.update(path.relative_to(supplied).as_posix() for path in supplied.rglob('*')
                     if path.is_file() and path.suffix.lower() in {'.glb', '.jpg', '.jpeg', '.png'})
    paths = {}
    for name in sorted(map(Path, names)):
        if name.is_absolute() or '..' in name.parts:
            raise ValueError(f'Invalid guide source path: {name}')
        file = name.as_posix()
        old = rows.get(file, {})
        legacy = str((ARCHIVE / name).relative_to(ROOT))
        original = intake.original(old.get('originalPath', legacy), expected=old.get('sha256'),
                                   local=supplied / name if supplied else None,
                                   validate=validate_guide_glb if name.suffix.lower() == '.glb' else None)
        row = {'file': file, 'bytes': original.path.stat().st_size, 'sha256': original.sha256}
        if old and any(row[key] != old[key] for key in row):
            raise ValueError(f'Archived model or mural differs from its record: {file}')
        if original.reference != legacy:
            row['originalPath'] = original.reference
        rows[file] = {**old, **row}
        paths[file] = original.path
    return list(rows.values()), paths


def unpack_glb(data):
    assert struct.unpack_from('<4sII', data) == (b'glTF', 2, len(data))
    size, kind = struct.unpack_from('<I4s', data, 12)
    binary_size, binary_kind = struct.unpack_from('<I4s', data, 20 + size)
    assert (kind, binary_kind, len(data)) == (b'JSON', b'BIN\x00', 28 + size + binary_size)
    return json.loads(data[20:20 + size]), data[28 + size:]


def view_data(binary, view):
    offset = view.get('byteOffset', 0)
    return binary[offset:offset + view['byteLength']]


class PackedGlb:
    def __init__(self, document):
        self.document = document
        self.views = document['bufferViews'] = []
        self.accessors = document['accessors'] = []
        self.binary = bytearray()
        self.tracks = {}

    def add_view(self, data, settings=None):
        view = {**(settings or {}), 'buffer': 0, 'byteOffset': len(self.binary), 'byteLength': len(data)}
        self.binary.extend(data)
        self.binary.extend(b'\0' * (-len(self.binary) % 4))
        self.views.append(view)
        return len(self.views) - 1

    def add_track(self, values, kind, bounds=False):
        values = np.asarray(values, dtype='<f4')
        data = values.tobytes()
        key = (kind, bounds, data)
        if key not in self.tracks:
            accessor = {'bufferView': self.add_view(data), 'componentType': 5126, 'count': len(values), 'type': kind}
            if bounds:
                accessor.update(min=[float(values.min())], max=[float(values.max())])
            self.tracks[key] = len(self.accessors)
            self.accessors.append(accessor)
        return self.tracks[key]

    def add_clip(self, name, times, poses, nodes):
        channels, samplers = [], []
        for node in nodes:
            for kind, prop, frames in zip(('VEC3', 'VEC4', 'VEC3'), PROPERTIES, poses):
                values = frames[:, node].copy()
                if prop == 'rotation':
                    values /= np.linalg.norm(values, axis=1)[:, None]
                    for i in range(1, len(values)):
                        if np.dot(values[i - 1], values[i]) < 0:
                            values[i] *= -1
                if len(times) > 2 and np.max(np.abs(values - values[0])) <= 1e-6:
                    values, track_times = values[[0, -1]], times[[0, -1]]
                else:
                    track_times = times
                channels.append({'sampler': len(samplers), 'target': {'node': node, 'path': prop}})
                samplers.append({'input': self.add_track(track_times, 'SCALAR', bounds=True),
                                 'output': self.add_track(values, kind), 'interpolation': 'LINEAR'})
        self.document['animations'].append({'name': name, 'channels': channels, 'samplers': samplers})

    def bytes(self):
        self.document['buffers'] = [{'byteLength': len(self.binary)}]
        encoded = json.dumps(self.document, ensure_ascii=False, separators=(',', ':')).encode()
        encoded += b' ' * (-len(encoded) % 4)
        return b''.join((struct.pack('<4sII', b'glTF', 2, 28 + len(encoded) + len(self.binary)),
                         struct.pack('<I4s', len(encoded), b'JSON'), encoded,
                         struct.pack('<I4s', len(self.binary), b'BIN\x00'), self.binary))


class GuideRig:
    def __init__(self, document, binary):
        self.document, self.binary = document, binary
        self.nodes = document['nodes']
        assert len(document['meshes']) == len(document['images']) == len(document['skins']) == 1
        self.skin = document['skins'][0]
        self.primitive, = document['meshes'][0]['primitives']
        self.by_name = {node['name'].rsplit(':', 1)[-1]: index for index, node in enumerate(self.nodes)}
        self.hips, self.head = (self.by_name[name] for name in ('Hips', 'Head'))
        self.bind = [np.array([node.get(prop, fallback) for node in self.nodes], dtype=np.float64)
                     for prop, fallback in zip(PROPERTIES, ((0, 0, 0), (0, 0, 0, 1), (1, 1, 1)))]
        self.tree = []
        def visit(index, parent):
            assert 'matrix' not in self.nodes[index]
            self.tree.append((index, parent))
            for child in self.nodes[index].get('children', []):
                visit(child, index)
        for root in document['scenes'][document['scene']]['nodes']:
            visit(root, None)
        self.parents = dict(self.tree)
        assert np.allclose(self.matrices(self.bind)[self.parents[self.hips]], np.eye(4))
        attributes = self.primitive['attributes']
        self.positions = self.read(attributes['POSITION']).astype(np.float64)
        self.homogeneous = np.column_stack((self.positions, np.ones(len(self.positions))))
        self.joints = self.read(attributes['JOINTS_0'])
        self.weights = self.read(attributes['WEIGHTS_0'])
        self.inverse_bind = self.read(self.skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
        self.indices = self.read(self.primitive['indices'])
        assert np.max(np.abs(self.weights.sum(axis=1) - 1)) < .0001
        assert np.max(np.abs(self.skinned(self.bind) - self.positions)) < .0001

    def read(self, index):
        accessor = self.document['accessors'][index]
        view = self.document['bufferViews'][accessor['bufferView']]
        dtype = np.dtype(DTYPES[accessor['componentType']])
        width = TYPES[accessor['type']]
        return np.ndarray((accessor['count'], width), dtype=dtype, buffer=self.binary,
                          offset=view.get('byteOffset', 0) + accessor.get('byteOffset', 0),
                          strides=(view.get('byteStride', width * dtype.itemsize), dtype.itemsize))

    def matrices(self, pose):
        translation, rotation, scale = pose
        local = np.broadcast_to(np.eye(4), (len(self.nodes), 4, 4)).copy()
        local[:, :3, :3] = Rotation.from_quat(rotation).as_matrix() * scale[:, None, :]
        local[:, :3, 3] = translation
        world = local.copy()
        for index, parent in self.tree:
            if parent is not None:
                world[index] = world[parent] @ local[index]
        return world

    def skinned(self, pose, axes=slice(0, 3)):
        matrices = (self.matrices(pose)[self.skin['joints']] @ self.inverse_bind)[:, axes]
        points = np.zeros((len(self.positions), matrices.shape[1]))
        for joint, weight in zip(self.joints.T, self.weights.T):
            points += np.einsum('vci,vi->vc', matrices[joint], self.homogeneous) * weight[:, None]
        return points

    def place_feet(self, pose, floor):
        lift = max(0, floor - self.skinned(pose, slice(1, 2)).min())
        pose[0][self.hips, 1] += lift
        return lift

    def read_action(self, source_name, stride=1):
        animation = next(a for a in self.document['animations'] if a['name'].split('.')[0] == source_name)
        times = max((self.read(sampler['input'])[:, 0] for sampler in animation['samplers']), key=len)
        samples = np.unique(np.append(np.arange(0, len(times), stride), len(times) - 1))
        times = times[samples].astype(np.float64)
        poses = [np.broadcast_to(values, (len(times), *values.shape)).copy() for values in self.bind]
        for channel in animation['channels']:
            target = channel['target']
            sampler = animation['samplers'][channel['sampler']]
            values = self.read(sampler['output'])
            if sampler['interpolation'] == 'LINEAR':
                assert np.array_equal(times, self.read(sampler['input'])[samples, 0])
                values = values[samples]
            else:
                assert sampler['interpolation'] == 'STEP'
                keys = self.read(sampler['input'])[:, 0]
                values = values[np.maximum(0, np.searchsorted(keys, times, side='right') - 1)]
            poses[PROPERTIES.index(target['path'])][:, target['node']] = values
        return times - times[0], poses

    def locomotion(self, source, floor):
        times, poses = self.read_action(source, stride=2 if source == 'standing_relax' else 1)
        hips = poses[0][:, self.hips]
        offset = hips[0, [0, 2]].copy()
        travel = hips[-1, [0, 2]] - offset
        hips[:, [0, 2]] -= offset + times[:, None] / times[-1] * travel
        # Remove loop seams over the existing tail. Preserve side sway and lift.
        tail = .25 if source == 'standing_relax' else .167
        for index, second in enumerate(times):
            fade = smooth((second - times[-1] + tail) / tail)
            if fade:
                for part in (0, 2):
                    poses[part][index] += fade * (poses[part][0] - poses[part][index])
                poses[1][index] = blend_rotations(poses[1][index], poses[1][0], fade)
        lifts = np.array([self.place_feet([part[index] for part in poses], floor) for index in range(len(times))])
        if source != 'standing_relax':
            # Knees and long hems can reach lower between the animation keys.
            # Correct the neighboring keys together and preserve the loop seam.
            between_keys = np.zeros(len(times))
            for index in range(len(times) - 1):
                a, b = ([part[frame] for part in poses] for frame in (index, index + 1))
                for fraction in (.125, .25, .375, .5, .625, .75, .875):
                    sample = [(1 - fraction) * a[0] + fraction * b[0],
                              blend_rotations(a[1], b[1], fraction),
                              (1 - fraction) * a[2] + fraction * b[2]]
                    deficit = floor - self.skinned(sample, slice(1, 2)).min()
                    if deficit > 0:
                        between_keys[index:index + 2] = np.maximum(between_keys[index:index + 2], deficit + .0005)
            between_keys[0] = between_keys[-1] = max(between_keys[0], between_keys[-1])
            hips[:, 1] += between_keys
            lifts += between_keys
        assert np.allclose(poses[0][0], poses[0][-1], atol=1e-6)
        assert np.allclose(np.abs(np.sum(poses[1][0] * poses[1][-1], axis=1)), 1, atol=1e-6)
        return times, poses, travel, max(lifts)

    def adjust_rotation(self, pose, bone, world_rotation, matrices):
        index = self.by_name[bone]
        parent = matrices[self.parents[index], :3, :3]
        basis = Rotation.from_matrix(parent / np.linalg.norm(parent, axis=0))
        before = Rotation.from_quat(pose[1][index])
        pose[1][index] = (basis.inv() * world_rotation * basis * before).as_quat()

    def aim(self, pose, bone, child, direction, strength):
        if not strength:
            return
        matrices = self.matrices(pose)
        source = matrices[self.by_name[child], :3, 3] - matrices[self.by_name[bone], :3, 3]
        source /= np.linalg.norm(source)
        direction = np.asarray(direction) / np.linalg.norm(direction)
        axis = np.cross(source, direction)
        angle = np.arctan2(np.linalg.norm(axis), np.dot(source, direction))
        if angle > 1e-6:
            self.adjust_rotation(pose, bone, Rotation.from_rotvec(axis / np.linalg.norm(axis) * angle * strength), matrices)

    def rotate(self, pose, bone, axis, degrees):
        rotation = Rotation.from_rotvec(np.asarray(axis) * np.deg2rad(degrees))
        self.adjust_rotation(pose, bone, rotation, self.matrices(pose))


def smooth(value):
    t = min(1, max(0, value))
    return t * t * (3 - 2 * t)


def envelope(t, start, peak, end):
    return smooth((t - start) / (peak - start)) * smooth((end - t) / (end - peak))


def blend_rotations(a, b, weight):
    b = np.where(np.sum(a * b, axis=-1, keepdims=True) < 0, -b, b)
    result = (1 - weight) * a + weight * b
    return result / np.linalg.norm(result, axis=-1, keepdims=True)


def gestures(rig, idle, welcome):
    duration = 1.6 if welcome else 3.2
    times = np.linspace(0, duration, round(duration * 24) + 1)
    poses = [np.broadcast_to(part, (len(times), *part.shape)).copy() for part in idle]
    for index, t in enumerate(times):
        pose = [part[index] for part in poses]
        if welcome:
            lift = smooth((t - .14) / .42) * smooth((1.52 - t) / .39)
            swing = np.sin((t - .52) * 2 * np.pi / .36) * smooth((t - .52) / .12) * smooth((1.22 - t) / .12)
            rig.aim(pose, 'RightArm', 'RightForeArm', (-.80, -.40, .39), lift)
            rig.aim(pose, 'RightForeArm', 'RightHand', (-.10 + .16 * swing, .94, .34), lift)
            rig.aim(pose, 'RightHand', 'RightHandMiddle1', (.24 * swing, .98, .11), lift)
            for name, node in rig.by_name.items():
                if name.startswith('RightHand') and name != 'RightHand':
                    weight = .25 if 'Thumb' in name else .55
                    pose[1][node] = blend_rotations(pose[1][node], rig.bind[1][node], lift * weight)
            rig.rotate(pose, 'Head', (0, 0, 1), -2.5 * lift)
        else:
            sway = np.sin(2 * np.pi * t / duration) * np.sin(np.pi * t / duration) ** 2
            opening = envelope(t, .62, .99, 1.44)
            rig.rotate(pose, 'Spine1', (0, 0, 1), 1.65 * sway)
            rig.rotate(pose, 'Head', (0, 0, 1), -.8 * sway)
            rig.rotate(pose, 'RightArm', (0, 0, 1), -5 * opening)
            rig.rotate(pose, 'RightForeArm', (1, 0, 0), -13 * opening)
            rig.rotate(pose, 'RightHand', (0, 1, 0), 9 * opening)
    return times, poses


def file_details(filename, data):
    return {'file': filename, 'bytes': len(data), 'sha256': sha(data)}


def derive_model(outfit_id, filename, path, target_head_height):
    document, binary = unpack_glb(path.read_bytes())
    rig = GuideRig(document, binary)
    historical = outfit_id != 'plain'
    if historical:
        showcase = rig.bind
    else:
        _, source_idle = rig.read_action('standing_relax', stride=2)
        showcase = [part[0].copy() for part in source_idle]
        showcase[0][rig.hips, [0, 2]] = 0
    points = rig.skinned(showcase)
    floor, top = points[:, 1].min(), points[:, 1].max()
    head = rig.matrices(showcase)[rig.head, 1, 3] - floor
    scale = target_head_height / head if historical else 1.8 / (top - floor)
    head_height = float(head * scale)

    result = deepcopy(document)
    packed = PackedGlb(result)
    primitive = result['meshes'][0]['primitives'][0]
    geometry = hashlib.sha256()

    def keep_accessor(index):
        accessor = deepcopy(document['accessors'][index])
        view = document['bufferViews'][accessor['bufferView']]
        payload = view_data(binary, view)
        geometry.update(payload)
        accessor['bufferView'] = packed.add_view(payload, view)
        packed.accessors.append(accessor)
        return len(packed.accessors) - 1

    primitive['attributes'] = {key: keep_accessor(index) for key, index in primitive['attributes'].items()}
    primitive['indices'] = keep_accessor(primitive['indices'])
    result['skins'][0]['inverseBindMatrices'] = keep_accessor(rig.skin['inverseBindMatrices'])
    geometry_views = len(packed.views)
    image_view = document['bufferViews'][document['images'][0]['bufferView']]
    with Image.open(io.BytesIO(view_data(binary, image_view))) as source:
        texture = source.convert('RGB')
    texture.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    jpg = io.BytesIO()
    texture.save(jpg, 'JPEG', quality=84, optimize=True)
    texture_bytes = jpg.getvalue()
    result['images'][0]['bufferView'] = packed.add_view(texture_bytes)
    result['asset']['generator'] = 'Dunhuang guide asset preparation v001, derived from Tripo'
    scene = result['scenes'][result['scene']]
    scene_root = len(result['nodes'])
    result['nodes'].append({'name': 'music-guide-visual', 'children': scene['nodes'], 'rotation': [0, 1, 0, 0],
                            'scale': [scale] * 3, 'translation': [0, -floor * scale, 0]})
    scene['nodes'] = [scene_root]
    result['animations'] = []
    clips = {}
    for name, source in [('Idle', 'standing_relax'), ('Walk', 'walk'), ('Run', 'run')]:
        times, poses, travel, lift = rig.locomotion(source, floor)
        packed.add_clip(name, times, poses, rig.skin['joints'])
        if name == 'Idle':
            idle = [part[0].copy() for part in poses]
        clips[name] = {'seconds': float(times[-1]), 'removedHorizontalTravelMetres': float(np.linalg.norm(travel) * scale),
                       'maxFloorLiftMetres': float(lift * scale)}
    if not historical:
        showcase = idle
    packed.add_clip('ShowcasePose', np.array([0, .05]), [np.stack((part, part)) for part in showcase], rig.skin['joints'])
    clips['ShowcasePose'] = {'seconds': .05, 'pose': 'supplied bind' if historical else 'natural idle'}
    for name in (['Talk'] if historical else ['Talk', 'Welcome']):
        times, poses = gestures(rig, idle, name == 'Welcome')
        packed.add_clip(name, times, poses, rig.skin['joints'])
        clips[name] = {'seconds': float(times[-1])}

    data = packed.bytes()
    actual, actual_bin = unpack_glb(data)
    geometry_after = b''.join(view_data(actual_bin, view) for view in actual['bufferViews'][:geometry_views])
    assert sha(geometry_after) == geometry.hexdigest()
    assert {a['name'] for a in actual['animations']} == clips.keys()
    assert texture.size == (1024, 1024)
    print(f'{outfit_id}: {len(data):,} bytes, head {head_height:.3f} m', flush=True)
    return data, {
        **file_details(f'{outfit_id}.glb', data), 'source': filename, 'gzipBytes': len(gzip.compress(data, mtime=0)),
        'triangles': len(rig.indices) // 3, 'vertices': len(rig.positions), 'joints': len(rig.skin['joints']),
        'texture': {'width': texture.width, 'height': texture.height, 'bytes': len(texture_bytes)},
        'heightMetres': float((top - floor) * scale), 'headHeightMetres': head_height,
        'showcaseRadiusMetres': float(np.linalg.norm(points[:, [0, 2]], axis=1).max() * scale),
        'geometrySha256': geometry.hexdigest(), 'clips': clips,
    }


def derive_mural(outfit_id, filename, path):
    with Image.open(path) as source:
        mural = ImageOps.exif_transpose(source).convert('RGB')
    original_size = mural.size
    mural.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    output = io.BytesIO()
    mural.save(output, 'WEBP', quality=87, method=6)
    data = output.getvalue()
    return data, {**file_details(f'{outfit_id}.webp', data), 'source': filename, 'originalSize': original_size,
                  'width': mural.width, 'height': mural.height}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, help=f'Optional source directory (default for first import: {SUPPLIED})')
    parser.add_argument('--check', action='store_true', help='Verify registered inputs and existing models without writing')
    args = parser.parse_args()
    if args.check and args.source:
        parser.error('--check cannot import new originals')
    intake = AssetIntake(ROOT)
    with intake.transaction():
        prepare_guide(intake, args.source, args.check)


def prepare_guide(intake, supplied, check):
    source_manifest = ARCHIVE / 'source-manifest.json'
    runtime_manifest = OUTPUT / 'manifest.json'
    previous = read_json(source_manifest, {})
    previous_runtime = read_json(runtime_manifest)
    recorded = previous.get('derivatives')
    if previous_runtime and recorded and previous_runtime != recorded:
        raise ValueError('Published and archived guide derivative records disagree.')
    if recorded or previous_runtime:
        documented = {row['file'] for row in previous.get('originals', []) if row.get('sha256')}
        if any(filename not in documented for files in OUTFITS.values() for filename in files if filename):
            raise ValueError('Published guide models lack their original source records.')
    if not check and not previous and not supplied:
        supplied = SUPPLIED
    originals, paths = archive(intake, supplied, previous.get('originals', []))
    original_hashes = {row['file']: row['sha256'] for row in originals}
    known = {outfit['id']: outfit for outfit in (recorded or previous_runtime or {}).get('outfits', [])}
    manifest = {'version': 'v001', 'front': '-Z', 'units': 'metres', 'outfits': []}
    target_head_height = None
    outputs = {}
    for outfit_id, (model_file, mural_file) in OUTFITS.items():
        old = known.get(outfit_id, {})
        model = old.get('model')
        if not verify_derivative(model, model_file, f'{outfit_id}.glb', check):
            data, model = derive_model(outfit_id, model_file, paths[model_file], target_head_height)
            if digest(paths[model_file]) != original_hashes[model_file]:
                raise ValueError(f'Source model changed during preparation: {model_file}')
            if old.get('model') and model['sha256'] != old['model']['sha256']:
                raise ValueError(f'Rebuilt model differs from its record: {model["file"]}')
            outputs[model['file']] = data
        target_head_height = model['headHeightMetres']
        mural = None
        if mural_file:
            mural = old.get('mural')
            if not verify_derivative(mural, mural_file, f'{outfit_id}.webp', check):
                data, mural = derive_mural(outfit_id, mural_file, paths[mural_file])
                if digest(paths[mural_file]) != original_hashes[mural_file]:
                    raise ValueError(f'Source mural changed during preparation: {mural_file}')
                if old.get('mural') and mural['sha256'] != old['mural']['sha256']:
                    raise ValueError(f'Rebuilt mural differs from its record: {mural["file"]}')
                outputs[mural['file']] = data
        manifest['outfits'].append({'id': outfit_id, 'model': model, 'mural': mural})
    if (recorded or previous_runtime) and manifest != (recorded or previous_runtime):
        raise ValueError('Guide derivative metadata changed; use a new version.')
    if check:
        print(f'{len(originals)} originals and {len(OUTFITS)} outfits verified')
        return
    write_json(source_manifest, {
        'version': 'v001', 'suppliedDirectory': str(supplied or SUPPLIED), **previous, 'originals': originals,
        'derivatives': manifest,
    }, existing=previous)
    for filename, data in outputs.items():
        with staged_path(OUTPUT) as staged:
            staged.write_bytes(data)
            publish_file(staged, OUTPUT / filename, sha(data))
    write_json(runtime_manifest, manifest, existing=previous_runtime)
    print(f'{len(OUTFITS)} outfits verified, {len(outputs)} derivatives generated')


def verify_derivative(row, source, file, check):
    path = OUTPUT / file
    if row and (row['file'] != file or row['source'] != source):
        raise ValueError(f'Unexpected published asset path or source: {path}')
    if not row or not regular_file(path):
        if check:
            raise ValueError(f'Missing verified guide derivative: {path}')
        return False
    if path.stat().st_size != row['bytes'] or digest(path) != row['sha256']:
        raise ValueError(f'Published guide derivative failed SHA-256 verification: {path}')
    return True


if __name__ == '__main__':
    main()

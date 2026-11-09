#!/usr/bin/env python3
"""Verify the shipped v007 GLB against its own source-space layout and v006."""
from io import BytesIO
from pathlib import Path
import hashlib
import json
import struct

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]


def glb(path):
    raw = path.read_bytes()
    length = struct.unpack_from('<I', raw, 12)[0]
    return json.loads(raw[20:20 + length]), raw[28 + length:]


def meshes(model):
    return {node['name']: (index, node) for index, node in enumerate(model['nodes']) if 'mesh' in node}


def accessor(model, binary, index, width):
    entry = model['accessors'][index]
    view = model['bufferViews'][entry['bufferView']]
    dtype = np.dtype({5123: '<u2', 5125: '<u4', 5126: '<f4'}[entry['componentType']])
    return np.ndarray((entry['count'], width), dtype=dtype, buffer=binary,
                      offset=view.get('byteOffset', 0) + entry.get('byteOffset', 0),
                      strides=(view.get('byteStride', dtype.itemsize * width), dtype.itemsize))


def matrix(model, index, node):
    if 'matrix' in node:
        transform = np.array(node['matrix']).reshape((4, 4), order='F')
    else:
        x, y, z, w = node.get('rotation', [0, 0, 0, 1])
        rotation = np.array([
            [1 - 2 * (y*y + z*z), 2 * (x*y - z*w), 2 * (x*z + y*w)],
            [2 * (x*y + z*w), 1 - 2 * (x*x + z*z), 2 * (y*z - x*w)],
            [2 * (x*z - y*w), 2 * (y*z + x*w), 1 - 2 * (x*x + y*y)],
        ])
        transform = np.eye(4)
        transform[:3, :3] = rotation @ np.diag(node.get('scale', [1, 1, 1]))
        transform[:3, 3] = node.get('translation', [0, 0, 0])
    for parent_index, parent in enumerate(model['nodes']):
        if index in parent.get('children', []):
            return matrix(model, parent_index, parent) @ transform
    return transform


def bounds(model, binary, index, node):
    points = np.concatenate([accessor(model, binary, primitive['attributes']['POSITION'], 3)
                             for primitive in model['meshes'][node['mesh']]['primitives']])
    transform = matrix(model, index, node)
    points = points @ transform[:3, :3].T + transform[:3, 3] + [-12, 0, 2]
    return {'min': points.min(axis=0).round(6).tolist(), 'max': points.max(axis=0).round(6).tolist()}


def embedded_image(model, binary, name):
    material = next(item for item in model['materials'] if item['name'] == name)
    texture = model['textures'][material['pbrMetallicRoughness']['baseColorTexture']['index']]
    image = model['images'][texture['source']]
    view = model['bufferViews'][image['bufferView']]
    start = view.get('byteOffset', 0)
    return Image.open(BytesIO(binary[start:start + view['byteLength']])).convert('RGB')


def verify():
    old, old_bin = glb(ROOT / 'public/assets/world/courtyard/v006/courtyard.glb')
    new, new_bin = glb(ROOT / 'public/assets/world/courtyard/v007/courtyard.glb')
    layout = json.loads((ROOT / 'src/content/world/courtyard-hall-v007.json').read_text())
    manifest = json.loads((ROOT / 'art-source/world/models/courtyard/v007/export-manifest.json').read_text())
    for path, sha in manifest['priorAssets'].items():
        assert hashlib.sha256((ROOT / path).read_bytes()).hexdigest() == sha, path
    old_meshes, new_meshes = meshes(old), meshes(new)
    assert old_meshes.keys() == new_meshes.keys()
    changed = {
        'hall-v003-workbench': layout['workbench']['bounds'],
        'hall-v003-pattern-display': layout['display']['bounds'],
        'hall-v003-pigment-rack': layout['pigmentRack']['bounds'],
        'hall-v003-workshop-paper-art': layout['workshop']['paper']['bounds'],
        'hall-v003-pattern-display-art': layout['display']['artBounds'],
    }
    measured = {}
    for name, (index, node) in new_meshes.items():
        if name in changed:
            measured[name] = bounds(new, new_bin, index, node)
            for edge in ('min', 'max'):
                assert np.allclose(measured[name][edge], changed[name][edge], atol=1e-5, rtol=0), name
            continue
        old_index, old_node = old_meshes[name]
        assert np.allclose(matrix(old, old_index, old_node), matrix(new, index, node), atol=1e-6, rtol=0), name
        old_primitives = old['meshes'][old_node['mesh']]['primitives']
        new_primitives = new['meshes'][node['mesh']]['primitives']
        assert len(old_primitives) == len(new_primitives), name
        for before, after in zip(old_primitives, new_primitives):
            assert old['materials'][before['material']]['name'] == new['materials'][after['material']]['name'], name
            # A re-export may weld or split vertices without changing any triangle.
            previous = accessor(old, old_bin, before['attributes']['POSITION'], 3)[accessor(old, old_bin, before['indices'], 1).ravel()]
            current = accessor(new, new_bin, after['attributes']['POSITION'], 3)[accessor(new, new_bin, after['indices'], 1).ravel()]
            assert np.array_equal(previous, current), name
    assert embedded_image(new, new_bin, 'hall-v003-pattern-display-art').size == (494, 426)
    wood = {}
    for source, target in [('wood', 'courtyard-v007-pigment-wood'), ('wood_light', 'courtyard-v007-pigment-wood-light')]:
        before, after = (np.asarray(embedded_image(model, binary, name)) for model, binary, name in
                         [(old, old_bin, source), (new, new_bin, target)])
        assert before.shape == after.shape == (512, 512, 3)
        previous = np.median(before.reshape(-1, 3), axis=0)
        pale = np.median(after.reshape(-1, 3), axis=0)
        assert np.all(pale > previous)
        wood[source] = {'oldRGB': previous.tolist(), 'paleRGB': pale.tolist()}
    return {'priorInputsUnchanged': True, 'unchangedOtherMeshes': len(new_meshes) - len(changed),
            'workshop': measured, 'embeddedBoard': [494, 426], 'cabinetMedians': wood}


if __name__ == '__main__':
    print(json.dumps(verify(), indent=2))

#!/usr/bin/env python3
"""Build one instancing-ready GLB of volumetric V013 landscape prototypes."""
import argparse
import ctypes as ct
import hashlib
import json
import os
from pathlib import Path
import runpy
import struct

import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

from asset_intake import regular_file, staged_path
from desert_oasis_meshopt import BLENDER_LIB, parse

ROOT = Path(__file__).resolve().parents[1]
WORLD = ROOT / 'public/assets/world/desert-decoration'
CATALOG = ROOT / 'src/content/world/desert-oasis-models-v013.json'
INDEX = ROOT / 'src/content/world/desert-oasis-volume-v014.json'
MANIFEST = ROOT / 'art-source/world/desert-decoration/v014/manifest.json'
OUTPUT = WORLD / 'v014/route-volume.glb'
attribute = runpy.run_path(str(Path(__file__).with_name('prepare-desert-oasis-route-v013.py')))['attribute']
source_mesh = runpy.run_path(str(Path(__file__).with_name('prepare-desert-oasis-v013.py')))['mesh_data']

# These existing distance models are actual meshes. The poplar branches and leaves
# are separate geometry so their gold and bare variants keep the original rule.
REUSE = {
    't01': 't01-lod', 't02': 't02-lod', 't03': 't03-lod',
    'T02_弯曲胡杨树': 't02-lod', 'T03_展冠胡杨树': 't03-lod',
    'shrub-2': 'shrub-2-lod', 'S02_红柳灌木': 's02-lod',
}
ROCKS = {'r01', 'r02', 'r04', 'R05_碎石小群', 'valley-fractured-slab'}
LEAVES = {'g02', 'w01b', 'W01_水边芦苇'}
native = ct.CDLL(str(BLENDER_LIB)).meshopt_simplify
native.argtypes = [ct.c_void_p,ct.c_void_p,ct.c_size_t,ct.c_void_p,ct.c_size_t,ct.c_size_t,
                   ct.c_size_t,ct.c_float,ct.c_uint,ct.c_void_p]
native.restype = ct.c_size_t


def read_source(key, model):
    if key in REUSE:
        path = WORLD / 'v002' / (REUSE[key] + '.glb')
    else:
        path = ROOT / 'public' / (model['lodUrl'] if key in ROCKS else model.get('midUrl', model['url']))
    doc, blob = parse(path)
    primitive = doc['meshes'][0]['primitives'][0]
    attrs = primitive['attributes']
    if 'COLOR_0' not in attrs:
        # The V002 shrub uses its original colour texture: sample in linear RGB.
        mesh, faces, _ = source_mesh(path)
        return path, mesh['position'], mesh['normal'], mesh['color'], faces.reshape(-1, 3)
    node = doc['nodes'][0]
    scale = np.array(node.get('scale', [1, 1, 1]))
    pos = attribute(doc, blob, attrs['POSITION']) * scale + node.get('translation', [0, 0, 0])
    normals = attribute(doc, blob, attrs['NORMAL']) / scale
    normals /= np.maximum(1e-10, np.linalg.norm(normals, axis=1, keepdims=True))
    colors = attribute(doc, blob, attrs['COLOR_0'])[:, :3]
    faces = attribute(doc, blob, primitive['indices']).reshape(-1, 3)
    return path, pos, normals, colors, faces


def even_spread(centers, areas, number):
    # Largest projected surfaces first, then cover the footprint in 3D. Every
    # selected component remains at its own position and keeps its orientation.
    chosen = []
    score = np.sqrt(areas / max(1e-12, areas.max()))
    closest = np.full(len(centers), np.inf)
    for _ in range(min(number, len(centers))):
        i = np.argmax(score)
        chosen.append(i)
        closest = np.minimum(closest, np.linalg.norm(centers - centers[i], axis=1))
        score = closest * np.power(areas / max(1e-12, areas.max()), .36)
        score[chosen] = -1
    return chosen


def reduce_component(xyz, faces, target):
    if len(faces) <= target:
        return faces
    ix = np.ascontiguousarray(faces.flatten(), dtype='u4')
    points = np.ascontiguousarray(xyz, dtype='f4')
    out = np.empty_like(ix)
    count = native(out.ctypes.data, ix.ctypes.data, len(ix), points.ctypes.data, len(points),
                   12, 3*target, 1., 0, None)
    if count >= 3:
        return out[:count].reshape(-1, 3)
    # Very small open components sometimes collapse completely. Retain their
    # largest original face, with its original orientation and colour.
    patch = xyz[faces]
    areas = np.linalg.norm(np.cross(patch[:, 1]-patch[:, 0], patch[:, 2]-patch[:, 0]), axis=1)
    return faces[[np.argmax(areas)]]


def cluster_patch(points, faces, target):
    # Some original leaf sprays have non-manifold seams that prevent edge
    # collapses. Cluster vertices only inside this spray, retaining the source
    # triangles' winding and open outline. No faces connect neighbouring sprays.
    nearest = np.full(len(points), np.inf)
    representative = np.zeros(len(points), dtype=int)
    first = np.linalg.norm(points - points.mean(axis=0), axis=1).argmax()
    candidate = first
    best = None
    for _ in range(min(len(points), target + 2)):
        distance = np.linalg.norm(points - points[candidate], axis=1)
        closer = distance < nearest
        representative[closer] = candidate
        nearest = np.minimum(nearest, distance)
        candidate = nearest.argmax()
        triangles = representative[faces]
        triangles = triangles[(triangles[:, 0] != triangles[:, 1]) &
                              (triangles[:, 1] != triangles[:, 2]) &
                              (triangles[:, 2] != triangles[:, 0])]
        _, unique = np.unique(np.sort(triangles, axis=1), axis=0, return_index=True)
        triangles = triangles[np.sort(unique)]
        if len(triangles) and (best is None or abs(len(triangles)-target) < abs(len(best)-target)):
            best = triangles
        if len(triangles) >= target or nearest[candidate] == 0:
            break
    return best if best is not None else faces[:1]


def ribbon(points, normals, colors, faces):
    # Intersect the original twig or folded leaf at three stations. Taking all
    # corners on the same section avoids bridging opposite sides of a bent blade
    # with a wide triangle. Normals and colours interpolate on actual source edges.
    basis = np.linalg.svd(points - points.mean(axis=0), full_matrices=False)[2]
    along = points @ basis[0]
    if np.ptp(along) < 1e-9:
        return None
    edges = np.concatenate([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]])
    a, b = np.unique(np.sort(edges, axis=1), axis=0).T
    sections = []
    for f in (.006, .50, .994):
        coordinate = along.min() + np.ptp(along)*f
        hit = (along[a]-coordinate)*(along[b]-coordinate) < 0
        start, end = a[hit], b[hit]
        if len(start) < 2:
            return None
        weight = ((coordinate-along[start]) / (along[end]-along[start]))[:, None]
        sections.append(tuple(array[start] + (array[end]-array[start])*weight for array in (points, normals, colors)))
    middle = sections[1][0] @ basis[1:].T
    _, _, lateral = np.linalg.svd(middle - middle.mean(axis=0), full_matrices=True)
    middle = middle @ lateral.T
    tubular = np.ptp(middle[:, 1]) > np.ptp(middle[:, 0])*.42
    sides = 3 if tubular else 2
    angles = np.arange(sides) * (2*np.pi/sides)
    directions = np.array([np.cos(angles), np.sin(angles)])
    rings = []
    for section in sections:
        coords = section[0] @ basis[1:].T @ lateral.T
        ids = np.argmax((coords-coords.mean(axis=0)) @ directions, axis=0)
        rings.append(tuple(channel[ids] for channel in section))
    tris = []
    for row in range(len(rings)-1):
        for i in range(sides if tubular else 1):
            j = (i+1) % sides
            a,b = row*sides, (row+1)*sides
            tris += [[a+i, b+i, b+j], [a+i, b+j, a+j]]
    xyz, ns, cs = [np.concatenate(channel) for channel in zip(*rings)]
    tris = np.asarray(tris, dtype=int)
    face = xyz[tris]
    # Each submitted triangle's front winding must agree with the original
    # normals so DoubleSide shading illuminates the same side as the source.
    direction = np.cross(face[:, 1]-face[:, 0], face[:, 2]-face[:, 0])
    flip = np.einsum('ij,ij->i', direction, ns[tris].mean(axis=1)) < 0
    tris[flip] = tris[flip][:, [0, 2, 1]]
    return xyz, ns, cs, tris


def component_mesh(key, pos, normals, colors, faces):
    # Weld hard-normal and colour seams for topology only. The geometric form of
    # each twig, spray, grass blade and stone remains a separate connected shell.
    if key in ROCKS or key in REUSE:
        return pos, normals, colors, faces
    points, inverse = np.unique(np.round(pos, 6), axis=0, return_inverse=True)
    tri = inverse[faces]
    graph = coo_matrix((np.ones(tri.size, dtype='u1'), (tri.ravel(), np.roll(tri, 1, axis=1).ravel())),
                       shape=(len(points), len(points)))
    groups, group = connected_components(graph, directed=False)
    normal, color = np.zeros_like(points), np.zeros_like(points)
    np.add.at(normal, inverse, normals)
    np.add.at(color, inverse, colors)
    normal /= np.maximum(1e-10, np.linalg.norm(normal, axis=1, keepdims=True))
    color /= np.bincount(inverse)[:, None]
    patches = []
    face_groups = group[tri[:, 0]]
    for g in range(groups):
        indices = tri[face_groups == g]
        vertices, indices = np.unique(indices, return_inverse=True)
        xyz = points[vertices]
        triples = xyz[indices.reshape(-1, 3)]
        area = np.linalg.norm(np.cross(triples[:, 1]-triples[:, 0], triples[:, 2]-triples[:, 0]), axis=1).sum()
        if area > 1e-12:
            patches.append((vertices, indices.reshape(-1, 3), xyz.mean(axis=0), area))
    trees = key.startswith('大树')
    stem = max(range(len(patches)), key=lambda i: len(patches[i][1])) if trees else None
    selected = []
    sections = []
    if trees:
        vertices, indices, _, _ = patches[stem]
        reduced = reduce_component(points[vertices], indices, 210)
        # Thin poplar trunks must remain rooted. If decimation loses the bottom
        # or a substantial length, use its intact medium-distance trunk.
        source_y = points[vertices, 1]
        retained_y = points[vertices[np.unique(reduced)], 1]
        if retained_y.min() - source_y.min() > .025 * np.ptp(source_y) or np.ptp(retained_y) < .84*np.ptp(source_y):
            reduced = indices
        selected.append(vertices[reduced])
    leaves = [p for i,p in enumerate(patches) if i != stem]
    centers = np.array([p[2] for p in leaves])
    areas = np.array([p[3] for p in leaves])
    if trees:
        # The tightly upright tree has a much finer central branch network.
        # Preserve that wood, reducing the crown separately.
        keep = min(260, len(leaves))
        patches_to_use = [(i, 20, min(1.72, 1.27 * np.sqrt(len(leaves)/keep)))
                          for i in even_spread(centers, areas, keep)]
    elif key in LEAVES:
        # Preserve seed heads on large reeds, even though their surface area is
        # small beside the blades. All three types occupy different heights.
        patches_to_use = []
        for size in sorted({len(p[1]) for p in leaves}):
            subset = [i for i,p in enumerate(leaves) if len(p[1]) == size]
            keep = min(38 if key == 'g02' else 19 if size == 14 else 10, len(subset))
            for j in even_spread(centers[subset], areas[subset], keep):
                patches_to_use.append((subset[j], 4, 1.0))
    else:
        patches_to_use = []
        # Do not let the greater surface area of woody stems displace small
        # leaves from the upper crown. Sample the two botanical layers separately.
        for foliage in (True, False):
            subset = [i for i,p in enumerate(leaves) if (len(p[1]) <= 10) == foliage]
            if not subset:
                continue
            keep = min(76 if foliage else 28, len(subset))
            coverage = min(2.25, np.sqrt(len(subset)/keep)) if foliage else 1.
            for index in even_spread(centers[subset], areas[subset], keep):
                patches_to_use.append((subset[index], 3 if foliage else 9, coverage))
    for i, target, spread in patches_to_use:
        vertices, indices, center, _ = leaves[i]
        local = points[vertices]
        reduced = reduce_component(local, indices, target)
        if len(reduced) > target + 2:
            reduced = cluster_patch(local, reduced, target)
        if trees and np.linalg.norm(np.ptp(local[np.unique(reduced)], axis=0)) < .91*np.linalg.norm(np.ptp(local, axis=0)):
            reduced = cluster_patch(local, indices, target)
        extent = np.ptp(local, axis=0)
        retained = np.ptp(local[np.unique(reduced)], axis=0)
        if not trees and len(indices) >= 8 and (np.linalg.norm(retained) < .93 * np.linalg.norm(extent)):
            strip = ribbon(local, normal[vertices], color[vertices], indices)
            if strip is not None:
                sections.append(strip)
                continue
        selected.append(vertices[reduced])
        if spread != 1:
            points[vertices] = center + (local - center) * spread
    used, remap = np.unique(np.concatenate(selected), return_inverse=True)
    geometry = [(points[used], normal[used], color[used], remap.reshape(-1, 3)), *sections]
    offset = 0
    indices = []
    for xyz, _, _, tris in geometry:
        indices.append(tris + offset)
        offset += len(xyz)
    return (*[np.concatenate(channel) for channel in list(zip(*geometry))[:3]], np.concatenate(indices))


def pack_scene(doc, blob):
    # The bundled loader decodes the same EXT version used by V013. Every
    # compressed stream is decoded and byte-compared before publishing the GLB.
    library = ct.CDLL(str(BLENDER_LIB))
    size, ptr = ct.c_size_t, ct.c_void_p
    def bind(name, arguments, result):
        operation = getattr(library, 'meshopt_' + name)
        operation.argtypes, operation.restype = arguments, result
        return operation
    bind('encodeVertexVersion', [ct.c_int], None)(0)
    vertex_bound = bind('encodeVertexBufferBound', [size, size], size)
    index_bound = bind('encodeIndexSequenceBound', [size, size], size)
    encode_vertices = bind('encodeVertexBuffer', [ptr, size, ptr, size, size], size)
    encode_indices = bind('encodeIndexSequence', [ptr, size, ptr, size], size)
    decode_vertices = bind('decodeVertexBuffer', [ptr, size, size, ptr, size], ct.c_int)
    decode_indices = bind('decodeIndexSequence', [ptr, size, size, ptr, size], ct.c_int)
    ext = 'EXT_meshopt_compression'
    encoded = bytearray()
    for ac in doc['accessors']:
        view = doc['bufferViews'][ac['bufferView']]
        count, offset, length = ac['count'], view['byteOffset'], view['byteLength']
        raw = bytes(blob[offset:offset+length])
        stride = length // count
        if ac['type'] == 'SCALAR':
            indices = np.frombuffer(raw, dtype='<u2').astype('<u4')
            bound = index_bound(count, int(indices.max())+1)
            dest = ct.create_string_buffer(bound)
            n = encode_indices(dest, bound, indices.ctypes.data, count)
            mode, decode = 'INDICES', decode_indices
        else:
            bound = vertex_bound(count, stride)
            dest = ct.create_string_buffer(bound)
            n = encode_vertices(dest, bound, raw, count, stride)
            mode, decode = 'ATTRIBUTES', decode_vertices
        if not n:
            raise ValueError('Empty mesh stream')
        content = dest.raw[:n]
        expanded = ct.create_string_buffer(length)
        if decode(expanded, count, stride, content, n) != 0 or expanded.raw != raw:
            raise ValueError('Lossless geometry verification failed')
        encoded.extend(bytes((-len(encoded)) % 4))
        view.update(buffer=1, extensions={ext: {'buffer': 0, 'byteOffset': len(encoded),
                    'byteLength': n, 'byteStride': stride, 'count': count, 'mode': mode}})
        encoded.extend(content)
    encoded.extend(bytes((-len(encoded)) % 4))
    doc['buffers'] = [{'byteLength': len(encoded)}, {'byteLength': len(blob), 'extensions': {ext: {'fallback': True}}}]
    doc['extensionsUsed'].append(ext)
    doc['extensionsRequired'].append(ext)
    return encoded


def build():
    models = json.loads(CATALOG.read_text())
    doc = {'asset': {'version': '2.0'}, 'scene': 0, 'scenes': [{'nodes': []}], 'nodes': [],
           'meshes': [], 'bufferViews': [], 'accessors': [], 'extensionsUsed': ['KHR_mesh_quantization'],
           'extensionsRequired': ['KHR_mesh_quantization'],
           'materials': [{'name': 'Oasis vertex colours', 'doubleSided': True,
                          'pbrMetallicRoughness': {'metallicFactor': 0, 'roughnessFactor': .93}}]}
    blob = bytearray()
    catalog, sources = {}, {}
    fields = {}
    def field(values, component, shape, normalized=False, positions=False):
        key = (values.dtype.str, shape, component, values.tobytes())
        if key in fields:
            return fields[key]
        blob.extend(bytes((-len(blob)) % 4))
        start = len(blob)
        stride = values.dtype.itemsize * (1 if values.ndim == 1 else values.shape[1])
        view = {'buffer': 0, 'byteOffset': start, 'target': 34963 if shape == 'SCALAR' else 34962}
        if shape != 'SCALAR' and stride % 4:
            padded = np.zeros((len(values), stride + (-stride) % 4), dtype='u1')
            padded[:, :stride] = np.ascontiguousarray(values).view('u1').reshape(len(values), stride)
            values = padded
            view['byteStride'] = padded.shape[1]
        blob.extend(values.tobytes())
        view['byteLength'] = len(blob) - start
        ac = {'bufferView': len(doc['bufferViews']), 'componentType': component, 'type': shape, 'count': len(values)}
        if normalized:
            ac['normalized'] = True
        if positions:
            ac.update(min=values.min(axis=0).tolist(), max=values.max(axis=0).tolist())
        doc['bufferViews'].append(view)
        doc['accessors'].append(ac)
        fields[key] = len(doc['accessors']) - 1
        return fields[key]

    for key, spec in models.items():
        if key == '大树9':
            continue  # Venue-owned landmark has a dedicated two-channel exposure model.
        path, pos, normals, colors, faces = read_source(key, spec)
        xyz, normals, colors, tris = component_mesh(key, pos, normals, colors, faces)
        if np.ptp(xyz, axis=0).min() <= 1e-7:
            raise ValueError('Flat prototype ' + key)
        # Normalized once in geometry. Cloned instances need only placement yaw,
        # position and reviewed height. Preserve the approved footprint exactly.
        size = np.array([spec['width'], spec['height'], spec['depth']]) / spec['height']
        factors = size / np.ptp(xyz, axis=0)
        xyz = (xyz - xyz.min(axis=0)) * factors - [size[0]/2, 0, size[2]/2]
        xyz = (np.rint(xyz * 65536) / 65536).astype('<f4')
        normals = normals / factors
        normals /= np.maximum(1e-10, np.linalg.norm(normals, axis=1, keepdims=True))
        # Consolidate only byte-identical rendered vertices; colour and hard normals
        # still split geometry at genuine seams.
        encoded_normals = np.clip(np.rint(normals * 127), -127, 127).astype('i1')
        encoded_colors = np.clip(np.rint(colors * 255), 0, 255).astype('u1')
        cols = np.concatenate((xyz.view('u1').reshape(-1, 12), encoded_normals.view('u1'), encoded_colors), axis=1)
        _, take, remap = np.unique(cols, axis=0, return_index=True, return_inverse=True)
        tris = remap[tris]
        unique, first = np.unique(tris, return_index=True)
        order = unique[np.argsort(first)]
        ranks = np.zeros(len(take), dtype=int)
        ranks[order] = np.arange(len(order))
        tris = ranks[tris]
        take = take[order]
        xyz = xyz[take]
        attrs = {'POSITION': field(xyz, 5126, 'VEC3', positions=True),
                 'NORMAL': field(encoded_normals[take], 5120, 'VEC3', True),
                 'COLOR_0': field(encoded_colors[take], 5121, 'VEC3', True)}
        idx = field(tris.astype('<u2').flatten(), 5123, 'SCALAR')
        number = len(doc['nodes'])
        doc['nodes'].append({'name': 'volume-' + str(number), 'mesh': number, 'extras': {'oasisModel': key}})
        doc['meshes'].append({'primitives': [{'attributes': attrs, 'indices': idx, 'material': 0}]})
        doc['scenes'][0]['nodes'].append(number)
        catalog[key] = len(tris)
        sources[key] = {'source': path.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                        'triangles': len(tris)}
    blob.extend(bytes((-len(blob)) % 4))
    blob = pack_scene(doc, blob)
    head = json.dumps(doc, separators=(',', ':'), ensure_ascii=False).encode()
    head += b' ' * ((-len(head)) % 4)
    data = struct.pack('<4sIIII', b'glTF', 2, 28+len(head)+len(blob), len(head), 0x4E4F534A) + head
    data += struct.pack('<II', len(blob), 0x004E4942) + blob
    def json_file(value):
        return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
    return {OUTPUT: data, INDEX: json_file(catalog), MANIFEST: json_file({
        'version': 14, 'url': OUTPUT.relative_to(ROOT/'public').as_posix(),
        'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'models': sources})}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify', action='store_true')
    args = parser.parse_args()
    products = build()
    for path, data in products.items():
        if args.verify:
            if path.read_bytes() != data:
                raise ValueError('Derived product differs: ' + str(path))
        elif not regular_file(path) or path.read_bytes() != data:
            with staged_path(path.parent) as staged:
                staged.write_bytes(data)
                staged.chmod(0o644)
                os.replace(staged, path)
    print(f'{OUTPUT.name}: {len(products[OUTPUT]):,} bytes; {len(json.loads(products[INDEX]))} volumetric models.')

"""Compact original branches and leaf clusters independently for medium-distance trees."""
import ctypes as ct

import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

from desert_oasis_meshopt import BLENDER_LIB


def branch_preserving_tree(path, geom, faces, write_glb):
    # The supplied models separate their stem/branch network and individual sprays of
    # leaves into connected components. Simplifying each in its own coordinates keeps
    # small sprays at the branch tips even when a global error limit would remove them.
    pos, inverse = np.unique(geom['position'].round(6), axis=0, return_inverse=True)
    source_tri = inverse[faces].reshape(-1, 3)
    graph = coo_matrix((np.ones(source_tri.size, dtype='u1'),
        (source_tri.ravel(), source_tri[:, [1, 2, 0]].ravel())), shape=(len(pos), len(pos)))
    groups, group = connected_components(graph, directed=False)
    tri_group = group[source_tri[:, 0]]
    degree = np.bincount(inverse, minlength=len(pos))[:, None]
    normal = np.zeros_like(pos)
    color = np.zeros_like(pos)
    np.add.at(normal, inverse, geom['normal'])
    np.add.at(color, inverse, geom['color'])
    color /= degree
    normal /= np.maximum(1e-10, np.linalg.norm(normal, axis=1, keepdims=True))
    # Preserve the source colors across texture seams by sampling its own color atlas
    # before reduction. Distinct primitives are never joined or covered with new faces.
    sizes = np.bincount(tri_group, minlength=groups)
    stem = np.argmax(sizes)
    weights = sizes.astype(float)**.66
    weights[stem] = 0
    leaf_budget = max(2000, 13*(groups-1))
    targets = np.maximum(8, np.round(weights/weights.sum()*leaf_budget)).astype(int)
    targets[stem] = 1150
    native = ct.CDLL(str(BLENDER_LIB))
    simplify = native.meshopt_simplify
    size, ptr = ct.c_size_t, ct.c_void_p
    simplify.argtypes = [ptr, ptr, size, ptr, size, size, size, ct.c_float, ct.c_uint, ptr]
    simplify.restype = size
    result = []
    for component in range(groups):
        vertices, local = np.unique(source_tri[tri_group == component], return_inverse=True)
        indices = np.asarray(local.reshape(-1), dtype='u4')
        xyz = np.asarray(pos[vertices], dtype='f4')
        if len(indices) > 3*targets[component]:
            out = np.empty_like(indices)
            n = simplify(out.ctypes.data, indices.ctypes.data, len(indices), xyz.ctypes.data,
                len(xyz), 12, int(3*targets[component]), .1, 0, None)
            if n:
                indices = out[:n]
        result.append(vertices[indices])
    used, remap = np.unique(np.concatenate(result), return_inverse=True)
    p = pos[used]
    src = geom['position']
    p = src.min(axis=0) + (p-p.min(axis=0))*np.ptp(src,axis=0)/np.ptp(p,axis=0)
    write_glb(path, {'position':p, 'normal':normal[used], 'color':color[used]}, remap, None)

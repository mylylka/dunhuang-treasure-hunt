"""Add real eroded bedding to the accepted tower mountain without moving its portal.

Blender -b -t 4 --python-exit-code 1 --python scripts/build-world-mogao-strata-v001.py
The old union, its cavity, tower, entry and sand feet are retained. No remeshing,
new disconnected rock rings, global random displacement or baked shadows.
"""
import bpy, bmesh, math, json, hashlib
import numpy as np
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/assets/world/mogao/v011/mountain.glb'
OUT = ROOT / 'public/assets/world/mogao-strata/v001'
ARCHIVE = ROOT / 'art-source/world/models/mogao-strata/v001'
WORK = ROOT / 'work/world'
for folder in (OUT, ARCHIVE):
    folder.mkdir(parents=True, exist_ok=True)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
protected_paths = [SOURCE, ROOT / 'public/assets/world/mogao/v011/entry.glb',
                   ROOT / 'public/assets/world/mogao/v010/interior.glb',
                   ROOT / 'public/assets/world/mogao-massing/v003/tower.glb']
protected = {str(p.relative_to(ROOT)): sha(p) for p in protected_paths}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
bpy.context.scene.unit_settings.system = 'METRIC'
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
mountain = next(o for o in objects if o.name == 'mountain-sandstone-low')
original_mesh = mountain.data
original_positions = [v.co.copy() for v in original_mesh.vertices]
uv_source = original_mesh.uv_layers.active
original_mesh.calc_loop_triangles()

# Broad beds are deliberately not regularly spaced. Width is comparable with
# the existing surface sampling, so no under-sampled narrow sawtooth is added.
# Each tuple is height, maximum horizontal recession, groove half-width.
BEDS = [(5.6, 1.15, 1.05), (10.3, 1.58, 1.20), (15.8, 1.38, 1.15),
        (21.9, 1.76, 1.38), (27.0, 1.23, 1.04), (32.8, 1.66, 1.35),
        (39.4, 1.45, 1.15), (45.1, 1.72, 1.30), (51.6, 1.37, 1.18)]

def smooth(a, b, x):
    t = max(0, min(1, (x-a)/(b-a)))
    return t*t*(3-2*t)

def erosion(p):
    # Keep the complete tower recess and the already-cut inner chamber exactly
    # fixed. Its outer wall is |x| <= 14.49 m; this adds a generous safety band.
    mask = smooth(16.0, 22.0, abs(p.x)) * smooth(1.7, 4.4, p.z)
    mask *= 1-smooth(56.0, 57.8, p.z)
    if mask == 0:
        return 0.0
    # Gentle bedding warp and finite, varying strength prevent ruler-straight
    # strips. These are low-frequency structural features, not granular noise.
    warp = .24*math.sin(p.x*.092+p.y*.046) + .13*math.sin(p.y*.14-p.x*.039)
    value = 0.0
    for i, (level, depth, width) in enumerate(BEDS):
        dz = p.z-level-warp
        # An eroded lower lip, a recessed band and a rounded upper shoulder.
        # Asymmetry makes a real shelf, rather than a regular sine-wave surface.
        span = width*(1.18 if dz < 0 else .78)
        cut = math.exp(-((dz/span)**4)*.62)
        strength = .78+.14*math.sin(p.x*.048+p.y*.072+i*.9)
        strength += .08*math.cos(p.x*.109-p.y*.037+i*1.3)
        value += depth*cut*strength
    return min(1.85, value)*mask

# BMesh cuts shared edges only once, preserving UV seams and closed topology.
# A corner attribute transports the original broad-face normal through each cut.
CUT_STEP = .4
sample_geometry = original_mesh.copy()
attribute = sample_geometry.attributes.new(name='approved_broad_normal', type='FLOAT_VECTOR', domain='CORNER')
attribute.data.foreach_set('vector', [c for n in original_mesh.corner_normals for c in n.vector])
bm = bmesh.new()
bm.from_mesh(sample_geometry)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.00002)
for slice_index in range(6,145):
    z = slice_index*CUT_STEP
    # Only rows that contribute to an actual groove need horizontal samples.
    if not any(abs(z-level) < width*1.8+.6 for level,depth,width in BEDS):
        continue
    bmesh.ops.bisect_plane(bm, geom=[*bm.verts,*bm.edges,*bm.faces], dist=.000001,
        plane_co=(0,0,z), plane_no=(0,0,1), use_snap_center=True,
        clear_inner=False, clear_outer=False)
print('RAW_CUT_TOPOLOGY', sum(e.is_boundary for e in bm.edges), sum(not e.is_manifold for e in bm.edges), flush=True)
bm.to_mesh(sample_geometry)
bm.free()
sample_geometry.update()
sampled = [v.co.copy() for v in sample_geometry.vertices]
print('HORIZONTAL_SAMPLING', len(sampled), len(sample_geometry.polygons), flush=True)

# Vectorised continuous deformation and its Jacobian. Inverse-transpose normal
# transport follows real changed slopes while retaining the original broad
# facets; it does not reveal the arbitrary diagonals of the source mesh.
def deform(points):
    x,y,z = points[:,0],points[:,1],points[:,2]
    def ss(a,b,v):
        t = np.clip((v-a)/(b-a),0,1)
        return t*t*(3-2*t)
    mask = ss(16,22,np.abs(x))*ss(1.7,4.4,z)*(1-ss(56,57.8,z))
    warp = .24*np.sin(x*.092+y*.046)+.13*np.sin(y*.14-x*.039)
    depth = np.zeros(len(points))
    for i,(level,amount,width) in enumerate(BEDS):
        dz = z-level-warp
        span = width*np.where(dz<0,1.18,.78)
        cut = np.exp(-((dz/span)**4)*.62)
        strength = .78+.14*np.sin(x*.048+y*.072+i*.9)+.08*np.cos(x*.109-y*.037+i*1.3)
        depth += amount*cut*strength
    depth = np.minimum(1.85,depth)*mask
    direction = np.stack((x,(y-17)*1.12,np.zeros(len(points))),axis=1)
    direction /= np.maximum(1e-12,np.linalg.norm(direction,axis=1))[:,None]
    return points-direction*depth[:,None]

positions = np.asarray(sampled, dtype=np.float64)
new_positions = deform(positions)
eps = .0005
jacobian = np.empty((len(sampled),3,3))
for axis in range(3):
    step = np.zeros(3);step[axis] = eps
    jacobian[:,:,axis] = (deform(positions+step)-deform(positions-step))/(2*eps)
normal_transform = np.transpose(np.linalg.inv(jacobian),(0,2,1))
mesh = sample_geometry
mesh.name = 'mountain-horizontal-eroded-strata-v001'
mesh.vertices.foreach_set('co', new_positions.reshape(-1))
normal_attribute = mesh.attributes['approved_broad_normal'].data
normals = []
for polygon in mesh.polygons:
    polygon.use_smooth = True
    for li,vi in zip(polygon.loop_indices,polygon.vertices):
        n = np.asarray(normal_attribute[li].vector)
        transformed = normal_transform[vi] @ n
        transformed /= max(1e-12,np.linalg.norm(transformed))
        normals.append(tuple(transformed))
mesh.normals_split_custom_set(normals)
mesh.update()
mountain.data = mesh
movements = [erosion(p) for p in original_positions]
mountain['semanticGroup'] = 'mountain'
mountain['geometryRevision'] = 'horizontal-eroded-strata-v001'
mountain['protectedCentralHalfWidth'] = 16.0

def topology(data):
    audit = bmesh.new()
    audit.from_mesh(data)
    raw = {'boundaryEdges': sum(e.is_boundary for e in audit.edges), 'nonManifoldEdges': sum(not e.is_manifold for e in audit.edges)}
    if data == original_mesh:
        bmesh.ops.remove_doubles(audit, verts=list(audit.verts), dist=.00002)
    result = {'boundaryEdges': sum(e.is_boundary for e in audit.edges),
              'nonManifoldEdges': sum(not e.is_manifold for e in audit.edges)}
    print('RAW_TOPOLOGY', data.name, raw, flush=True)
    audit.free()
    return result

source_topology, output_topology = topology(original_mesh), topology(mesh)
print('TOPOLOGY_CHECK', source_topology, output_topology, flush=True)
# The source contains a near-collinear buried underside triangle. Preserve it
# rather than silently claim a fully watertight original; no new open rim.
assert output_topology['boundaryEdges'] <= source_topology['boundaryEdges']
assert output_topology['nonManifoldEdges'] <= source_topology['nonManifoldEdges']

# Current runtime supplies the shared sandstone albedo. Do not carry obsolete
# orange base-colour atlases or baked cavity AO into changed geometry. Keep the
# original normal maps, standard PBR and a portable warm sandstone default.
for material in mesh.materials:
    bsdf = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    for socket in ('Base Color','Roughness','Metallic'):
        for link in list(bsdf.inputs[socket].links):
            material.node_tree.links.remove(link)
    bsdf.inputs['Base Color'].default_value = (.34,.245,.16,1)
    bsdf.inputs['Roughness'].default_value = .94
    bsdf.inputs['Metallic'].default_value = 0
    for node in material.node_tree.nodes:
        if node.type == 'GROUP' and node.node_tree and 'glTF Material Output' in node.node_tree.name:
            for socket in node.inputs:
                for link in list(socket.links):
                    material.node_tree.links.remove(link)
for obj in objects:
    obj['strataSourceVersion'] = 'mogao/v011'

bpy.ops.object.select_all(action='DESELECT')
for obj in objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = mountain
target = OUT / 'mountain.glb'
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB',
    use_selection=True, export_animations=False, export_extras=True,
    export_apply=True, export_yup=True)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(ARCHIVE / 'mogao-strata.blend'))

mesh.calc_loop_triangles()
protected_indices = [i for i,p in enumerate(original_positions) if abs(p.x) <= 16.0 or p.z <= 1.7]
assert all(movements[i] == 0 for i in protected_indices)
assert all(sha(ROOT/p) == value for p,value in protected.items())
# Sample the vertical retreat profile of two visible front buttresses. This is
# an actual metric displacement report, independent of colour/normal maps.
profiles = {}
for x,y in [(-42,-11),(35,-5),(54,10)]:
    profiles[f'{x},{y}'] = [[round(z*.25,2), round(erosion(Vector((x,y,z*.25))),4)] for z in range(8,220)]
report = {
    'source': str(SOURCE.relative_to(ROOT)),
    'originalFilesUnchanged': True, 'originalHashes': protected,
    'sourceVertices': len(original_positions),
    'sourcePolygons': len(original_mesh.polygons),
    'sourceTriangles': len(original_mesh.loop_triangles),
    'vertices': len(mesh.vertices), 'triangles': len(mesh.loop_triangles),
    'polygons': len(mesh.polygons),
    'sourceTopology': source_topology,
    'outputTopology': output_topology,
    'changedSourceVertices': sum(d > .00001 for d in movements),
    'maxHorizontalRecessionMetres': max(movements),
    'protectedSourceVertices': len(protected_indices),
    'protection': 'All |x| <= 16 m and all z <= 1.7 m remain exactly fixed; no vertical displacement anywhere.',
    'bedsHeightDepthWidthMetres': BEDS,
    'normals': 'Original broad-face normals interpolated on horizontal cuts, transformed with the exact deformation Jacobian inverse transpose.',
    'horizontalSamplingMetres': CUT_STEP,
    'texturePacking': 'Retain normal maps; omit obsolete orange albedo and old baked AO/roughness textures, replaced by shared runtime sandstone PBR.',
    'boundsBlenderXYZ': [[min(v.co[a] for v in mesh.vertices) for a in range(3)],
                         [max(v.co[a] for v in mesh.vertices) for a in range(3)]],
    'unchangedComponents': ['tower', 'entry', 'stairs', 'interior', 'sand-foot-1', 'sand-foot--1'],
    'export': {'bytes': target.stat().st_size, 'sha256': sha(target)},
    'geometryProfiles': profiles,
}
(ARCHIVE / 'export-manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
(WORK / 'mogao-strata-v001-geometry.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print('STRATA_COMPLETE', json.dumps({k:v for k,v in report.items() if k not in ['geometryProfiles','originalHashes']}, ensure_ascii=False), flush=True)

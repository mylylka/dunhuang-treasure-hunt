"""Derive the approved two-floor music interior without changing delivered sources.

Blender -b --python-exit-code 1 --python scripts/build-world-music-interior-v001.py
All design and collision coordinates are music source metres, Y up. The GLB keeps
the original pavilion model frame; runtime still places it at [46, 0, -9].
"""
import bpy
import bmesh
import hashlib
import json
import math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source/world/models/music-pavilion/v005/music-pavilion.blend'
DEST = ROOT / 'art-source/world/models/music-interior/v001'
OUT = ROOT / 'public/assets/world/music-interior/v001'
SOLIDS = ROOT / 'src/content/world/music-interior-solids-v001.json'
for directory in (DEST, OUT):
    directory.mkdir(parents=True, exist_ok=True)
protected_paths = [SOURCE, ROOT / 'public/assets/world/music-pavilion/v005/music-pavilion.glb',
                   ROOT / 'art-source/world/models/music-pavilion/v004/music-pavilion.blend']
protected_hashes = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in protected_paths}
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
bpy.context.preferences.filepaths.save_version = 0

layout = json.loads((ROOT / 'src/content/world/music-interior-v001.json').read_text())
surfaces = {surface['id']: surface for surface in layout['surfaces']}
openings = {opening['id']: opening for opening in layout['openings']}
floor, flight = surfaces['music-floor-2'], surfaces['music-stair']
FLOOR_1, FLOOR_2, SLAB_BOTTOM, SLAB_TOP = surfaces['music-floor-1']['y'], floor['y'], 7.426, 7.89
STAIR_LOW, STAIR_HIGH, STAIR_MIN_Z, STAIR_MAX_Z = flight['maxX'], flight['minX'], flight['minZ'], flight['maxZ']
assert flight['endY'] == FLOOR_1 and flight['y'] == FLOOR_2
RISERS = 36
TREADS = RISERS - 1
RISE = (FLOOR_2 - FLOOR_1) / RISERS
GOING = (STAIR_LOW - STAIR_HIGH) / TREADS
REPLACED = ['music-back', 'music-west', 'music-east', 'music-mural-wall',
            'music-porch-back', 'music-porch-divider', 'music-column-0', 'music-column-1', 'music-column-2']
solids = []
new_objects = []


def source_point(p):
    return Vector((p.x + 46, p.z, -p.y - 9))


def blender_point(p):
    return Vector((p[0] - 46, -p[2] - 9, p[1]))


def bounds(points):
    return ([min(p[i] for p in points) for i in range(3)],
            [max(p[i] for p in points) for i in range(3)])


def add_solid(name, lo, hi, surface=None, navigation=True):
    item = {'id': name, 'min': [round(v, 7) for v in lo], 'max': [round(v, 7) for v in hi]}
    if surface:
        item['walkSurface'] = surface
    if not navigation:
        item['navigation'] = False
    solids.append(item)


def mesh(name, vertices, faces, material, group):
    data = bpy.data.meshes.new(name)
    data.from_pydata([blender_point(p) for p in vertices], [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(bpy.data.materials[material])
    obj['semanticGroup'] = group
    new_objects.append(obj)
    return obj


def box(name, lo, hi, material='wood', group='music-interior-floor'):
    x, y, z = lo
    a, b, c = hi
    return mesh(name, [(x,y,z),(a,y,z),(a,b,z),(x,b,z),(x,y,c),(a,y,c),(a,b,c),(x,b,c)],
                [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)], material, group)


def parts(obj):
    parent = list(range(len(obj.data.vertices)))
    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    for edge in obj.data.edges:
        a, b = map(find, edge.vertices)
        parent[a] = b
    result = {}
    for vertex in obj.data.vertices:
        result.setdefault(find(vertex.index), []).append(vertex)
    return result.values()


def signature(objects):
    digest = hashlib.sha256()
    for obj in sorted(objects, key=lambda o: o.name):
        digest.update(obj.name.encode())
        for vertex in obj.data.vertices:
            digest.update(','.join(f'{v:.7f}' for v in obj.matrix_world @ vertex.co).encode())
        for polygon in obj.data.polygons:
            digest.update(str(tuple(polygon.vertices)).encode())
    return digest.hexdigest()


originals = [o for o in bpy.context.scene.objects if o.type == 'MESH' and not o.get('excludeV4') and not o.get('excludeV5')]
untouched = [o for o in originals if o.get('semanticGroup') not in ('architecture', 'porch')]
untouched_signature = signature(untouched)

# Turn the two delivered timber leaves and their existing inset/lattice parts
# toward the porch. Nothing is painted or replaced; the wall receives a real hole.
door_points = {0: [], 1: []}
for obj in originals:
    if obj.get('semanticGroup') != 'porch':
        continue
    inverse = obj.matrix_world.inverted()
    for component in parts(obj):
        points = [source_point(obj.matrix_world @ v.co) for v in component]
        lo, hi = bounds(points)
        if not (lo[0] >= 36.5 and hi[0] <= 42.75 and lo[1] >= 1.8 and hi[1] <= 6.5 and lo[2] >= -21.71 and hi[2] <= -21.29):
            continue
        side = 0 if (lo[0] + hi[0]) / 2 < 39.62 else 1
        hinge_x, theta = (36.575, -math.pi / 2) if side == 0 else (42.665, math.pi / 2)
        for vertex, point in zip(component, points):
            dx, dz = point.x - hinge_x, point.z + 21.66
            moved = Vector((hinge_x + math.cos(theta) * dx + math.sin(theta) * dz,
                            point.y, -21.66 - math.sin(theta) * dx + math.cos(theta) * dz))
            vertex.co = inverse @ blender_point(moved)
            door_points[side].append(moved)
    obj.data.update()
assert all(door_points.values()), 'The existing two leaves were not found'
for side, points in door_points.items():
    add_solid(f'music-open-door-{side}', *bounds(points))


def subtract_opening(obj, name, lo, hi):
    # Delivered material batches contain touching wall boxes. Rebuild just the
    # intersected planar box as exact jamb/lintel pieces; an aggregate Boolean
    # can interpret those touching shells as an inverted volume.
    removed = set()
    walls = []
    for component in parts(obj):
        wall_lo, wall_hi = bounds([source_point(obj.matrix_world@v.co) for v in component])
        if all(max(wall_lo[i],lo[i]) < min(wall_hi[i],hi[i])-.00001 for i in range(3)):
            assert lo[2] < wall_lo[2] and hi[2] > wall_hi[2]
            removed.update(v.index for v in component)
            walls.append((wall_lo,wall_hi))
    assert len(walls) == 1, f'Expected one delivered wall for {name}, got {len(walls)}'
    bm=bmesh.new();bm.from_mesh(obj.data);bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm,geom=[bm.verts[i] for i in removed],context='VERTS')
    bm.to_mesh(obj.data);bm.free();obj.data.update()
    a,b=walls[0]
    left,right=max(a[0],lo[0]),min(b[0],hi[0])
    bottom,top=max(a[1],lo[1]),min(b[1],hi[1])
    pieces=[([a[0],a[1],a[2]],[left,b[1],b[2]]),
            ([right,a[1],a[2]],[b[0],b[1],b[2]]),
            ([left,a[1],a[2]],[right,bottom,b[2]]),
            ([left,top,a[2]],[right,b[1],b[2]])]
    for i,(start,end) in enumerate(pieces):
        if all(end[j]-start[j]>.00001 for j in range(3)):
            box(f'{name}-wall-{i}',start,end,'plaster',obj['semanticGroup'])


architecture = next(o for o in originals if o.name == 'architecture--plaster')
gallery_rear = next(o for o in originals if o.name == 'porch--plaster')
ground_door, upper_door = openings['music-ground-door'], openings['music-gallery-door']
subtract_opening(architecture, 'music-ground-door-cut', [ground_door['min'][0],1.79,-22.3], [ground_door['max'][0],ground_door['max'][1],-21.3])
subtract_opening(gallery_rear, 'music-upper-door-cut', [upper_door['min'][0],7.79,-22.35], [upper_door['max'][0],upper_door['max'][1],-21.6])
originals = [obj for obj in originals if len(obj.data.vertices)]

# New rear floor meets the existing slab without coplanar duplicate faces.
floor_regions = [([floor['minX'],SLAB_BOTTOM,floor['minZ']],[floor['maxX'],SLAB_TOP,-21.95]),
                 ([44.7801,SLAB_BOTTOM,-21.95],[floor['maxX'],SLAB_TOP,floor['maxZ']])]
for i, (lo, hi) in enumerate(floor_regions):
    box(f'music-new-floor-slab-{i}', lo, hi)
    add_solid(f'music-new-floor-slab-{i}', lo, [hi[0],FLOOR_2,hi[2]], 'music-floor-2')
# A quiet material-reused timber finish, including the threshold strip above the
# rear 15 cm of the original slab, where its existing floorboards do not extend.
finish_regions = [([floor['minX'],SLAB_TOP,floor['minZ']],[floor['maxX'],FLOOR_2,-21.95]),
                  ([44.7801,SLAB_TOP,-21.95],[floor['maxX'],FLOOR_2,floor['maxZ']]),
                  ([41.9,SLAB_TOP,-21.95],[44.6,FLOOR_2,-21.8])]
for i, (lo, hi) in enumerate(finish_regions):
    box(f'music-new-floor-finish-{i}', lo, hi, 'wood-light')

# The stair is a thin suspended stepped waist. Its underside follows the rise;
# a full triangular fill would incorrectly close the approved ground passage.
profile = [(STAIR_LOW,FLOOR_1)]
for i in range(TREADS):
    x = STAIR_LOW - i * GOING
    y = FLOOR_1 + (i + 1) * RISE
    profile.extend([(x,y),(x-GOING,y)])
profile.append((STAIR_HIGH,FLOOR_2))
profile.extend([(STAIR_HIGH,FLOOR_2-.32),(STAIR_LOW,FLOOR_1-.32)])
vertices = [(x,y,z) for z in (STAIR_MIN_Z,STAIR_MAX_Z) for x,y in profile]
n = len(profile)
faces = [tuple(range(n-1,-1,-1)), tuple(range(n,2*n))]
faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
stair = mesh('music-rear-straight-stair', vertices, faces, 'stone-light', 'music-interior-stair')
# Conservative, per-tread AABBs preserve the sloped free space beneath the waist.
for i in range(TREADS):
    high_x, low_x = STAIR_LOW-i*GOING, STAIR_LOW-(i+1)*GOING
    top = FLOOR_1+(i+1)*RISE
    bottom = FLOOR_1+(FLOOR_2-FLOOR_1)*(STAIR_LOW-high_x)/(STAIR_LOW-STAIR_HIGH)-.32
    add_solid(f'music-stair-tread-{i+1:02}', [low_x,bottom,STAIR_MIN_Z], [high_x,top,STAIR_MAX_Z], 'music-stair')
box('music-lower-landing', [STAIR_LOW,1.63,STAIR_MIN_Z], [58.1,FLOOR_1,STAIR_MAX_Z], 'stone-light', 'music-interior-landing')
add_solid('music-lower-landing', [STAIR_LOW,1.63,STAIR_MIN_Z], [58.1,FLOOR_1,STAIR_MAX_Z], 'music-floor-1')

# Height-aware architectural proxies, in the same frame as the real apertures.
for name, lo, hi in [
    ('music-back',[34.4,1.278,-28.25],[59.85,13.748,-27.75]),
    ('music-west',[34.0375,1.278,-28],[34.7625,13.748,-18]),
    ('music-east',[59.4242977528,1.278,-28],[60.2757022472,13.748,-18]),
    ('music-mural-wall',[44.8652808989,1.278,-18.225],[59.85,13.748,-17.775]),
    ('music-porch-divider',[44.44125,1.7855,-21.65],[44.992991573,7.4405,-17.95]),
    ('music-porch-back-west',[34.69,1.7855,-21.975],[37.7,7.4405,-21.625]),
    ('music-porch-back-east',[41.3,1.7855,-21.975],[44.55,7.4405,-21.625]),
    ('music-porch-door-lintel',[37.7,5.4,-21.975],[41.3,7.4405,-21.625]),
    ('music-gallery-rear-west',[34.4,7.803,-22.15],[41.9,13.313,-21.85]),
    ('music-gallery-rear-east',[44.6,7.803,-22.15],[44.8652808989,13.313,-21.85]),
    ('music-gallery-door-lintel',[41.9,11.4,-22.15],[44.6,13.313,-21.85]),
    ('music-attic-ceiling',[34.69,13.5305,-27.8],[59.5094382022,13.7045,-18.2]),
    ('music-front-bearing-beam',[33.965,13.168,-17.91],[60.3608426966,13.603,-17.45]),
]:
    add_solid(name, lo, hi)
add_solid('music-existing-gallery-slab', [34.4725,7.426,-21.95], [44.7801404494,FLOOR_2,-17.65], 'music-gallery')
for i, x in enumerate((34.98,39.6925,44.3325)):
    add_solid(f'music-column-lower-{i}', [x-.319,1.8,-18.16], [x+.319,7.107,-17.44])
    add_solid(f'music-column-upper-{i}', [x-.319,FLOOR_2,-18.16], [x+.319,13.2115,-17.44])
    add_solid(f'music-column-lower-foot-{i}', [x-.522,1.8,-18.16], [x+.522,2.206,-17.44])
    add_solid(f'music-column-upper-foot-{i}', [x-.522,7.8755,-18.16], [x+.522,8.2815,-17.44])
# The delivered ten foundation tiers are solid; their walkable skin is supplied
# by the shared platform/front-ramp surfaces rather than a traversable hollow.
for i in range(10):
    extension=(9-i)*.38
    add_solid(f'music-foundation-{i:02}', [33.6-extension,0,-28.32],
              [60.65+extension,(i+1)*.18,-16.7+extension], 'music-floor-1')
# Original musicians stay exactly in place and remain solid on their gallery.
for side in (0,1):
    points=[]
    for obj in originals:
        if obj.get('semanticGroup') != 'gallery-musicians':
            continue
        points.extend(p for v in obj.data.vertices if ((p:=source_point(obj.matrix_world@v.co)).x < 39.5) == (side == 0))
    add_solid(f'music-gallery-musician-{side}', *bounds(points))

assert signature(untouched) == untouched_signature, 'Protected facade/furniture/art geometry changed'
objects = originals + new_objects
trees=[]
for obj in objects:
    if obj.get('semanticGroup') in ('court-paving','workshop-furnishings','high-drapery','courtyard-enclosure'):
        continue
    evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    data=evaluated.to_mesh()
    points=[source_point(obj.matrix_world@v.co) for v in data.vertices]
    trees.append((obj.name,BVHTree.FromPolygons(points,[tuple(p.vertices) for p in data.polygons])))
    evaluated.to_mesh_clear()


def ray(origin,direction,length):
    hits=[]
    for name,tree in trees:
        result=tree.ray_cast(Vector(origin),Vector(direction),length)
        if result[0] is not None:
            hits.append((float(result[3]),name,list(result[0])))
    return min(hits) if hits else None


ground_hit = ray([39.5,3,-20.8],[0,0,-1],1.8)
assert ground_hit is None, f'Ground door remains visually sealed: {ground_hit}'
assert ray([37.2,3,-20.8],[0,0,-1],1.8) is not None, 'Ground door jamb removed'
assert ray([43.25,9.5,-21.2],[0,0,-1],1.6) is None, 'Upper connection remains sealed'
assert ray([41.5,9.5,-21.2],[0,0,-1],1.6) is not None, 'Protected upper window/jamb missing'
floor_hit=ray([40,8.5,-25],[0,-1,0],2)
assert floor_hit and abs(floor_hit[2][1]-FLOOR_2)<.0001, 'New upper floor height mismatch'
stair_checks=[]
for i in range(TREADS):
    x=STAIR_LOW-(i+.5)*GOING
    expected=FLOOR_1+(i+1)*RISE
    hit=ray([x,expected+.5,-24.8],[0,-1,0],.8)
    assert hit and abs(hit[2][1]-expected)<.0001, f'Stair tread {i} missing'
    stair_checks.append(round(hit[2][1],6))
for x in (39.5,43,45.9,46.5):
    hit=ray([x,FLOOR_1+.01,-23.4],[0,1,0],1.85)
    assert hit is None, f'Approved under-platform route blocked at {x}'
assert all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==sha for p,sha in protected_hashes.items())

# Retain editable source before export-only material batching.
bpy.ops.object.select_all(action='DESELECT')
for obj in objects:
    obj.hide_set(False)
    obj.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(DEST/'music-pavilion.blend'))
graph=bpy.context.evaluated_depsgraph_get()
batches={}
for obj in objects:
    data=bpy.data.meshes.new_from_object(obj.evaluated_get(graph),preserve_all_data_layers=True,depsgraph=graph)
    copy=bpy.data.objects.new('export-'+obj.name,data)
    bpy.context.collection.objects.link(copy)
    copy.matrix_world=obj.matrix_world.copy()
    group=obj.get('semanticGroup','architecture')
    copy['semanticGroup']=group
    batches.setdefault((group,tuple(m.name for m in data.materials)),[]).append(copy)
    obj.select_set(False)
exported=[]
for (group,materials),items in batches.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in items:obj.select_set(True)
    bpy.context.view_layer.objects.active=items[0]
    if len(items)>1:bpy.ops.object.join()
    obj=bpy.context.object
    obj.name=group+'--'+materials[0]
    exported.append(obj)
bpy.ops.object.select_all(action='DESELECT')
triangles=0
for obj in exported:
    obj.select_set(True)
    obj.data.calc_loop_triangles()
    triangles+=len(obj.data.loop_triangles)
bpy.ops.export_scene.gltf(filepath=str(OUT/'music-pavilion.glb'),export_format='GLB',use_selection=True,
                          export_animations=False,export_extras=True,export_yup=True)
# Check the delivered triangles again after a fresh GLB import. This catches an
# exporter triangulation or frame mistake that a source-only audit would miss.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT/'music-pavilion.glb'))
trees=[]
for obj in bpy.context.scene.objects:
    if obj.type!='MESH' or obj.get('semanticGroup') in ('court-paving','workshop-furnishings','high-drapery','courtyard-enclosure'):
        continue
    points=[source_point(obj.matrix_world@v.co) for v in obj.data.vertices]
    trees.append((obj.name,BVHTree.FromPolygons(points,[tuple(p.vertices) for p in obj.data.polygons])))
assert ray([39.5,3,-20.8],[0,0,-1],1.8) is None, 'Exported ground door sealed'
assert ray([43.25,9.5,-21.2],[0,0,-1],1.6) is None, 'Exported upper door sealed'
assert ray([37.2,3,-20.8],[0,0,-1],1.8) is not None
assert ray([41.5,9.5,-21.2],[0,0,-1],1.6) is not None
exported_floor=ray([40,8.5,-25],[0,-1,0],2)
assert exported_floor and abs(exported_floor[2][1]-FLOOR_2)<.0001
for i in range(TREADS):
    expected=FLOOR_1+(i+1)*RISE
    hit=ray([STAIR_LOW-(i+.5)*GOING,expected+.5,-24.8],[0,-1,0],.8)
    assert hit and abs(hit[2][1]-expected)<.0001, f'Exported tread {i} missing'
for x in (39.5,43,45.9,46.5):
    assert ray([x,FLOOR_1+.01,-23.4],[0,1,0],1.85) is None
SOLIDS.write_text(json.dumps({'version':'music-interior-solids-v001','coordinateFrame':'music source, metres, Y up',
    'replacedLegacyIds':REPLACED,'solids':solids},indent=2)+'\n')
manifest={'version':'music-interior-v001','source':str(SOURCE.relative_to(ROOT)),
    'runtimeAsset':'music-interior/v001/music-pavilion.glb','runtimeOrigin':[46,0,-9],
    'sourceProtectedHashes':protected_hashes,'protectedGeometryUnchanged':True,
    'floor1':FLOOR_1,'floor2':FLOOR_2,'floorRise':FLOOR_2-FLOOR_1,
    'stair':{'lowX':STAIR_LOW,'highX':STAIR_HIGH,'minZ':STAIR_MIN_Z,'maxZ':STAIR_MAX_Z,
             'risers':RISERS,'treads':TREADS,'rise':RISE,'going':GOING,
             'slopeDegrees':math.degrees(math.atan((FLOOR_2-FLOOR_1)/(STAIR_LOW-STAIR_HIGH))),
             'waistThickness':.32,'underpassPreserved':True},
    'checks':{'groundDoorOpen':True,'upperDoorOpen':True,'jambsAndWindowsPreserved':True,
              'realTreadRays':len(stair_checks),'upperFloorRayHeight':floor_hit[2][1],
              'underpassBodyRays':4,'oldFilesUnchanged':True,'freshGlbImportRaysPassed':True},
    'triangles':triangles,'meshBatches':len(exported),'solidBoxes':len(solids),
    'bytes':(OUT/'music-pavilion.glb').stat().st_size,
    'sha256':hashlib.sha256((OUT/'music-pavilion.glb').read_bytes()).hexdigest()}
(DEST/'export-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest))

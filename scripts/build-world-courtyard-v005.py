"""Incremental courtyard wall finish and pigment rack, preserving v004 geometry.

blender -b --python scripts/build-world-courtyard-v005.py [-- --skip-render]
New perimeter finishes use expanded source-world coordinates and neutral IDs;
the existing runtime still widens the retained old wall bodies and paving.
"""
import argparse
import ast
import hashlib
import json
import math
import shutil
import struct
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source/world/models/courtyard/v005'
OUTPUT = ROOT / 'public/assets/world/courtyard/v005'
WORK = ROOT / 'work/world'
LAYOUT = ROOT / 'src/content/world/courtyard-hall-v005.json'
RACK = ROOT / 'public/assets/world/pigment-rack/v001/pigment-rack.glb'
parser = argparse.ArgumentParser()
parser.add_argument('--skip-render', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
for folder in (SOURCE, OUTPUT, WORK): folder.mkdir(parents=True, exist_ok=True)
for filename in ('hall-lotus-wide.jpg', 'hall-banner.jpg', 'hall-floral-border.jpg', 'display-board-art.jpg'):
    if not (OUTPUT / filename).exists(): shutil.copyfile(ROOT / 'public/assets/world/courtyard/v004' / filename, OUTPUT / filename)
old_files = [ROOT / f'{base}/courtyard/v{version}/courtyard.{extension}' for version in ('002', '003', '004') for base, extension in [('art-source/world/models', 'blend'), ('public/assets/world', 'glb')]]
old_files += [ROOT / 'src/content/world/courtyard-props.json', ROOT / 'src/content/world/courtyard-hall-v004.json', RACK]
old_hashes = {str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest() for path in old_files}
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'art-source/world/models/courtyard/v004/courtyard.blend'))

# Reuse pure primitives/material helpers without executing either old build.
for filename, names in [('build-world-courtyard.py', {'point', 'box', 'mesh'}),
                        ('build-world-courtyard-v004.py', {'bounds', 'texture_material', 'stone_material', 'panel'})]:
    tree = ast.parse((ROOT / 'scripts' / filename).read_text())
    exec(compile(ast.Module(body=[node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in names], type_ignores=[]), '<courtyard-pure-helpers>', 'exec'))
M = {'stone': bpy.data.materials['warm-limestone'], 'cream': bpy.data.materials['linen'], 'teal': bpy.data.materials['mineral-teal']}
CURRENT_BATCH = None
ROLE, PLAYER = 'solid', False
new_objects = []

def assign(obj, name, material):
    obj.name = name
    obj.data.materials.append(M[material] if isinstance(material, str) else material)
    obj['semanticGroup'] = CURRENT_BATCH or name
    obj['cameraRole'] = ROLE
    obj['playerRole'] = 'solid' if PLAYER else 'none'
    new_objects.append(obj)
    return obj

# Only the two cloth meshes change colour; every vertex and the pillars remain.
cloth_material = stone_material('courtyard-v005-pale-mineral-blue-cloth', '87b4c0')
changed_curtains = []
for obj in bpy.context.scene.objects:
    group = str(obj.get('semanticGroup', obj.name))
    if group in ('hall-v003-left-curtain-0', 'hall-v003-left-curtain-1'):
        obj.data.materials.clear(); obj.data.materials.append(cloth_material)
        changed_curtains.append(group)
if len(changed_curtains) != 2: raise RuntimeError('Expected exactly two accepted left curtains')

# Replace mismatched independent corner finishes, not the accepted wall bodies.
# Original side plinth/coping and front bases/coping had different heights and
# depths, producing a 3.5 cm cap step and intersecting, visibly offset edges.
retired_nodes, retired_camera_ids = [], []
trim_prefixes = ('courtyard-wall-plinth', 'courtyard-wall-coping', 'entrance-stone-base', 'entrance-wing-coping')
for obj in list(bpy.context.scene.objects):
    if obj.type != 'MESH': continue
    group = str(obj.get('semanticGroup', obj.name))
    if group.startswith(trim_prefixes) or group.startswith('entrance-outer-art'):
        retired_nodes.append(group)
        if group.startswith(trim_prefixes): retired_camera_ids.append(group)
        bpy.data.objects.remove(obj, do_unlink=True)


def prism(name, polygon, low, high, material):
    """Closed, source-Y-up extrusion. Miter polygons meet only on their boundary."""
    signed = sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(polygon, polygon[1:] + polygon[:1]))
    if signed > 0: polygon = list(reversed(polygon))
    n = len(polygon)
    vertices = [(x, y, z) for y in (low, high) for x, z in polygon]
    faces = [tuple(reversed(range(n))), tuple(range(n, n * 2))]
    faces += [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    return mesh(name, vertices, faces, material)

repair_sections = []
for side in ('west', 'east'):
    mirror = (lambda x: x) if side == 'west' else (lambda x: -24 - x)
    for finish, half, low, high, front_end, material in [
        ('plinth', .32, 0, .50, -15, 'stone'),
        ('coping', .40, 2.635, 2.805, -14.9, 'cream'),
    ]:
        outer, inner = -24 - half, -24 + half
        side_polygon = [(outer, -24), (inner, -24), (inner, 2 - half), (outer, 2 + half)]
        front_polygon = [(outer, 2 + half), (inner, 2 - half), (front_end, 2 - half), (front_end, 2 + half)]
        for part, polygon in [('side', side_polygon), ('wing', front_polygon)]:
            polygon = [(mirror(x), z) for x, z in polygon]
            name = f'courtyard-v005-{part}-{finish}-{side}'
            prism(name, polygon, low, high, material)
            repair_sections.append({'id': name, 'polygon': polygon, 'minY': low, 'maxY': high})
    # The original side band already reaches the corner. The new inner front
    # band meets its inner X face exactly, with no coincident top faces.
    xa, xb = (-23.67, -15) if side == 'west' else (-9, -.33)
    box(f'courtyard-v005-inner-wing-green-{side}', (xa + xb) / 2, 2.42, 1.68, xb - xa, .17, .04, 'teal')

# Complete original-ratio image within the exposed strips, allowing for the
# gate pillars' 20 cm occlusion at the inner end of each old border.
entrance_material = texture_material('courtyard-v005-entrance-lotus-wide', 'entrance-lotus-wide.jpg')
entrance_width = 8.2
entrance_image = next(node.image for node in entrance_material.node_tree.nodes if node.type == 'TEX_IMAGE')
entrance_height = entrance_width * entrance_image.size[1] / entrance_image.size[0]
entrance_murals = []
for side, x in [('west', -19.6), ('east', -4.4)]:
    name = f'courtyard-v005-entrance-mural-art-{side}'
    panel(name, x, 1.475, 2.345, entrance_width, entrance_height, entrance_material)
    entrance_murals.append({'id': name, 'center': [x, 1.475, 2.345], 'width': entrance_width, 'height': entrance_height,
                            'image': 'entrance-lotus-wide.jpg', 'imagePixels': list(entrance_image.size), 'uv': [0, 0, 1, 1],
                            'wallClearance': .045})

# Preserve the normalization root when importing. Bake each full world matrix
# before grouping so neither the 1.5 m normalization nor child transforms drop.
rack_x, rack_z = -.90, -4.55
before = set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=str(RACK))
imported = [obj for obj in bpy.context.scene.objects if obj not in before]
bpy.context.view_layer.update()
rack_meshes = [obj for obj in imported if obj.type == 'MESH']
transform = Matrix.Translation(Vector(point(rack_x, 0, rack_z))) @ Matrix.Rotation(-math.pi / 2, 4, 'Z')
world_matrices = {obj: transform @ obj.matrix_world.copy() for obj in rack_meshes}
for i, obj in enumerate(rack_meshes):
    obj.parent = None
    obj.matrix_world = world_matrices[obj]
    obj.name = f'hall-v003-pigment-rack-part-{i:03d}'
    obj['semanticGroup'] = 'hall-v003-pigment-rack'
    obj['cameraRole'] = 'solid'
    obj['playerRole'] = 'solid'
# Empty imported hierarchy is not selected/exported and owns no geometry.
bpy.context.view_layer.update()
# Rotated brush/rack submeshes have empty corners in their local AABBs. Measure
# their actual transformed vertices, rather than inflating the authored height.
rack_points = [obj.matrix_world @ vertex.co for obj in rack_meshes for vertex in obj.data.vertices]
rack_points = [(p.x - 12, p.z, 2 - p.y) for p in rack_points]
rack_bounds = {'min': [round(min(p[i] for p in rack_points), 6) for i in range(3)],
               'max': [round(max(p[i] for p in rack_points), 6) for i in range(3)]}
if abs(rack_bounds['max'][1] - rack_bounds['min'][1] - 1.5) > 1e-5: raise RuntimeError('Pigment rack normalization changed during import')
if abs(rack_bounds['min'][1]) > 1e-5: raise RuntimeError('Pigment rack feet not on the courtyard floor')

layout = json.loads((ROOT / 'src/content/world/courtyard-hall-v004.json').read_text())
layout['version'] = 'v005'
layout['retiredCameraIds'] = sorted(set(retired_camera_ids))
layout['entranceMurals'] = entrance_murals
layout['perimeterRepair'] = {'sections': repair_sections, 'footTop': .50, 'capBottom': 2.635, 'capTop': 2.805, 'sourceCoordinatesAlreadyExpanded': True}
layout['leftCurtains'] = {'ids': changed_curtains, 'colorSRGB': '#87b4c0'}
layout['pigmentRack'] = {'id': 'hall-v003-pigment-rack', 'x': rack_x, 'z': rack_z, 'height': 1.5,
                         'bounds': rack_bounds, 'facing': '-x', 'sourceAsset': 'pigment-rack/v001/pigment-rack.glb',
                         'sourceSha256': hashlib.sha256(RACK.read_bytes()).hexdigest()}
for obj in new_objects:
    if obj.get('cameraRole') == 'solid': layout['cameraBoxes'].append(dict(id=obj['semanticGroup'], **bounds([obj])))
layout['cameraBoxes'].append(dict(id='hall-v003-pigment-rack', **rack_bounds))
layout['collisionBoxes'].append(dict(id='hall-v003-pigment-rack', **rack_bounds))
layout['playerSolids'].append({'id': 'hall-v003-pigment-rack', 'minX': rack_bounds['min'][0], 'maxX': rack_bounds['max'][0],
                              'minZ': rack_bounds['min'][2], 'maxZ': rack_bounds['max'][2], 'height': rack_bounds['max'][1]})
LAYOUT.write_text(json.dumps(layout, ensure_ascii=False, indent=2) + '\n')

# All rack submeshes retain their actual materials/UVs, but form one semantic
# assembly with a single measured external proxy and one resource owner.
bpy.ops.object.select_all(action='DESELECT')
for obj in rack_meshes: obj.select_set(True)
bpy.context.view_layer.objects.active = rack_meshes[0]
bpy.ops.object.join()
rack = bpy.context.object
rack.name = 'hall-v003-pigment-rack'
bpy.context.scene.cursor.location = (0, 0, 0)
bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
for image in bpy.data.images:
    if image.source == 'FILE' and not image.packed_file:
        try: image.pack()
        except RuntimeError: pass
scene = bpy.context.scene
bpy.ops.object.select_all(action='DESELECT')
for obj in scene.objects:
    if obj.type == 'MESH': obj.select_set(True)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / 'courtyard.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUTPUT / 'courtyard.glb'), export_format='GLB', use_selection=True, export_yup=True,
                          export_apply=True, export_animations=False, export_extras=True, export_image_format='JPEG', export_jpeg_quality=92)
raw = (OUTPUT / 'courtyard.glb').read_bytes()
size = struct.unpack_from('<I', raw, 12)[0]
gltf = json.loads(raw[20:20 + size])
manifest = {'version': 'v005', 'status': 'measured export; awaiting in-game visual acceptance', 'model': 'courtyard.glb',
            'worldOrigin': [-12, 0, 2], 'units': 'metres', 'upAxis': 'Y', 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
            'triangles': sum(gltf['accessors'][p['indices']]['count'] // 3 for m in gltf['meshes'] for p in m['primitives']),
            'meshCount': len(gltf['meshes']), 'materials': len(gltf['materials']), 'unchangedHall': 'v004 geometry retained, except two cloth materials',
            'entranceMurals': entrance_murals, 'pigmentRack': layout['pigmentRack'], 'leftCurtains': layout['leftCurtains'],
            'perimeterRepair': layout['perimeterRepair'], 'retiredNodes': sorted(retired_nodes), 'retiredCameraIds': layout['retiredCameraIds'],
            'geometryLayout': str(LAYOUT.relative_to(ROOT)), 'cameraBoxCount': len(layout['cameraBoxes']), 'playerSolidCount': len(layout['playerSolids']),
            'textures': {filename: hashlib.sha256((OUTPUT / filename).read_bytes()).hexdigest() for filename in ['hall-lotus-wide.jpg', 'hall-banner.jpg', 'hall-floral-border.jpg', 'display-board-art.jpg', 'entrance-lotus-wide.jpg']},
            'oldSourceHashes': old_hashes, 'runtimeExpansion': layout['runtimeExpansion']}
(SOURCE / 'export-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
for path in old_files:
    if hashlib.sha256(path.read_bytes()).hexdigest() != old_hashes[str(path.relative_to(ROOT))]: raise RuntimeError('Original asset unexpectedly changed')
print('COURTYARD_V005_EXPORT', json.dumps({key: manifest[key] for key in ['bytes', 'triangles', 'meshCount', 'cameraBoxCount', 'playerSolidCount']}, ensure_ascii=False), flush=True)
if args.skip_render: sys.exit(0)

# Preview-only runtime widening of the retained old walls, paving and props.
# New neutral-ID finishes are already in the expanded coordinate frame.
for obj in scene.objects:
    if obj.type != 'MESH': continue
    name = str(obj.get('semanticGroup', obj.name))
    b = bounds([obj]); center = (b['min'][0] + b['max'][0]) / 2
    side = -1 if center < -12 else 1
    sx, offset = 1, 0
    if name.startswith(('courtyard-side-wall', 'courtyard-side-art', 'courtyard-wall-')): offset = side * 2
    elif name == 'courtyard-ground': sx = 23.7 / 19.7
    elif name.startswith('entrance-wing-coping'): sx = 9.2 / 7.2; offset = (side * 2.9) * (1 - sx)
    elif name.startswith(('entrance-wing', 'entrance-stone-base')): sx = 9 / 7; offset = (side * 3) * (1 - sx)
    elif name.startswith('wall-painted-border'): sx = 8.5 / 6.5; offset = (side * 3.25) * (1 - sx)
    elif name.startswith(('entrance-inner-art', 'entrance-outer-art')): offset = (center - (-15 if side < 0 else -9)) * 2 / 7
    elif name in ['pot-west-front', 'pot-west-workshop']: offset = -2
    elif name == 'pot-east-hall': offset = 2
    if sx != 1 or offset:
        obj.scale.x *= sx; obj.location.x = obj.location.x * sx + offset
    if name.startswith(('tree-', 'shrub-', 'road-grass', 'caisson-')): obj.hide_render = True
M['ground'] = bpy.data.materials['paving-sand']
box('preview-only-ground', -12, -.12, -10, 120, .12, 120, 'ground')
scene.render.engine = 'CYCLES'; scene.cycles.samples = 16; scene.cycles.use_denoising = True
scene.render.resolution_x = 1120; scene.render.resolution_y = 760; scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'; scene.view_settings.view_transform = 'AgX'
cam = scene.camera
shots = [('exterior', (-12, 3.0, 15), (-12, 1.5, 1.9), 27),
         ('inner-corner', (-18.0, 2.6, -5.5), (-23.1, 1.8, 1.0), 25),
         ('look-out', (-12, 2.25, -18), (-12, 2.4, -1), 23),
         ('left-curtains', (-10.6, 2.25, -12.3), (-21, 3.7, -15), 22),
         ('pigment-rack', (-4.8, 1.7, -2.8), (-1.0, .75, -3.9), 43)]
for name, eye, target, lens in shots:
    cam.location = point(*eye); cam.rotation_euler = (Vector(point(*target)) - cam.location).to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = lens
    scene.render.filepath = str(WORK / f'courtyard-v005-{name}.png')
    bpy.ops.render.render(write_still=True)
    print('COURTYARD_V005_RENDER', name, flush=True)

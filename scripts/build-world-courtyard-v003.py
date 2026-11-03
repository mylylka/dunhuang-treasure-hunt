"""Extend the accepted courtyard into a 17 x 17 m hall without editing v002.

blender -b --python scripts/build-world-courtyard-v003.py [-- --skip-render]
All source-space coordinates are metres, Y up; export origin stays (-12,0,2).
"""
import argparse
import ast
import hashlib
import json
import math
from pathlib import Path
import struct
import sys

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source/world/models/courtyard/v003'
OUTPUT = ROOT / 'public/assets/world/courtyard/v003'
WORK = ROOT / 'work/world'
LAYOUT = ROOT / 'src/content/world/courtyard-hall-v003.json'
parser = argparse.ArgumentParser()
parser.add_argument('--skip-render', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
for folder in (SOURCE, OUTPUT, WORK): folder.mkdir(parents=True, exist_ok=True)
old_files = [ROOT / 'art-source/world/models/courtyard/v002/courtyard.blend', ROOT / 'public/assets/world/courtyard/v002/courtyard.glb', ROOT / 'src/content/world/courtyard-props.json']
old_hashes = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in old_files}
bpy.ops.wm.open_mainfile(filepath=str(old_files[0]))

# Reuse only pure geometry helper definitions; never execute the v002 builder,
# which intentionally writes its own shared layout during a full v002 build.
legacy = ast.parse((ROOT / 'scripts/build-world-courtyard.py').read_text())
helper_names = {'point', 'box', 'cylinder', 'mesh', 'tube', 'roof'}
exec(compile(ast.Module(body=[node for node in legacy.body if isinstance(node, ast.FunctionDef) and node.name in helper_names], type_ignores=[]), '<courtyard-geometry-helpers>', 'exec'))
material_names = {
    'plaster': 'warm-sand-plaster', 'plaster-light': 'sunwashed-plaster', 'stone': 'warm-limestone',
    'paving-a': 'paving-cream', 'paving-b': 'paving-sand', 'paving-c': 'paving-light',
    'vermilion': 'aged-vermilion', 'wood': 'warm-carved-wood', 'wood-light': 'sunlit-wood',
    'tile': 'blue-grey-ceramic', 'tile-light': 'tile-edge', 'teal': 'mineral-teal',
    'gold': 'ochre-decoration', 'cream': 'linen', 'ink': 'dark-window-interior',
}
M = {key: bpy.data.materials[name] for key, name in material_names.items()}
CURRENT_BATCH = None
ROLE = 'solid'
PLAYER = False
new_objects = []

def assign(obj, name, material):
    obj.name = name
    obj.data.materials.append(M[material] if isinstance(material, str) else material)
    obj['semanticGroup'] = CURRENT_BATCH or name
    obj['cameraRole'] = ROLE
    obj['playerRole'] = 'solid' if PLAYER else 'none'
    new_objects.append(obj)
    return obj

def make_box(name, x, y, z, w, h, d, material='plaster-light', player=False, role='solid', bevel=0):
    global ROLE, PLAYER
    old_role, old_player = ROLE, PLAYER
    ROLE, PLAYER = role, player
    obj = box(name, x, y, z, w, h, d, material, bevel)
    ROLE, PLAYER = old_role, old_player
    return obj

def bounds(objects):
    pts = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    pts = [(p.x - 12, p.z, 2 - p.y) for p in pts]
    return {'min': [round(min(p[i] for p in pts), 6) for i in range(3)], 'max': [round(max(p[i] for p in pts), 6) for i in range(3)]}

# The source file is read-only. Remove old architecture from this new in-memory
# scene, retaining the entire existing caisson, courtyard, gate and props.
retired = []
for obj in list(bpy.context.scene.objects):
    if obj.type == 'MESH' and (obj.name.startswith(('hall-', 'upper-', 'crossbeam-teal-inlay')) or obj.name in ('window-decoration', 'courtyard-rear-wall')):
        retired.append(obj.name)
        bpy.data.objects.remove(obj, do_unlink=True)

# Existing workshop group moves as a whole; no separate floating bowls/brushes.
workbench = []
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH' and (obj.name.startswith('workbench-') or obj.name == 'workshop-decoration'):
        obj.location += Vector((-1, -4.7, 0))
        obj['semanticGroup'] = 'hall-v003-workbench'
        obj['cameraRole'] = 'solid'
        obj['playerRole'] = 'solid'
        obj.name = 'hall-v003-' + obj.name
        workbench.append(obj)

def texture_material(key, filename):
    path = OUTPUT / filename
    if not path.exists(): raise RuntimeError('Required reviewed texture missing: ' + str(path))
    material = bpy.data.materials.new(key)
    material.use_nodes = True
    # Node display names are localized in this Blender installation. Build one
    # unambiguous active output rather than selecting nodes by an English name.
    material.node_tree.nodes.clear()
    node = material.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    output = material.node_tree.nodes.new('ShaderNodeOutputMaterial')
    output.is_active_output = True
    material.node_tree.links.new(node.outputs['BSDF'], output.inputs['Surface'])
    node.inputs['Roughness'].default_value = .92
    image = bpy.data.images.load(str(path), check_existing=True)
    image.colorspace_settings.name = 'sRGB'
    image.pack()
    tex = material.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = image
    tex.extension = 'REPEAT'
    material.node_tree.links.new(tex.outputs['Color'], node.inputs['Base Color'])
    material.use_backface_culling = False
    return material

ART = {
    'mural': texture_material('hall-v003-lotus-mural', 'hall-lotus-mural.jpg'),
    'banner': texture_material('hall-v003-banner-low-resolution', 'hall-banner.jpg'),
    'border': texture_material('hall-v003-floral-border', 'hall-floral-border.jpg'),
}

def stone_material(name, color):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.node_tree.nodes.clear()
    node = material.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    output = material.node_tree.nodes.new('ShaderNodeOutputMaterial')
    output.is_active_output = True
    material.node_tree.links.new(node.outputs['BSDF'], output.inputs['Surface'])
    values = [int(color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    rgba = tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in values) + (1,)
    node.inputs['Base Color'].default_value = rgba
    node.inputs['Roughness'].default_value = .96
    material.diffuse_color = rgba
    return material

STONES = [stone_material('hall-v003-warm-grey-stone-' + str(i), color) for i, color in enumerate(['b9ab92', 'c4b69d', 'bdb19b'])]

def panel(name, x, y, z, w, h, material, face='z+', repeat_u=1):
    global ROLE, PLAYER
    right = {'z+': (1, 0, 0), 'z-': (-1, 0, 0), 'x+': (0, 0, -1), 'x-': (0, 0, 1)}[face]
    verts = [(x + right[0] * u * w, y + v * h, z + right[2] * u * w) for u, v in ((-.5, -.5), (.5, -.5), (.5, .5), (-.5, .5))]
    old = ROLE, PLAYER
    ROLE, PLAYER = 'decoration', False
    obj = mesh(name, verts, [(0, 1, 2, 3)], material)
    uv = obj.data.uv_layers.new(name='UVMap')
    for i, pair in enumerate([(0, 0), (repeat_u, 0), (repeat_u, 1), (0, 1)]): uv.data[i].uv = pair
    ROLE, PLAYER = old
    return obj

def strip(name, x, y, z, width, face='z+'):
    height = .22
    return panel(name, x, y, z, width, height, ART['border'], face, width / (height * 1013 / 97))

def brace(name, a, b):
    av, bv = Vector(point(*a)), Vector(point(*b))
    bpy.ops.mesh.primitive_cube_add(size=1, location=(av + bv) / 2)
    obj = bpy.context.object
    obj.dimensions = (.24, .24, (bv - av).length)
    obj.rotation_euler = (bv - av).to_track_quat('Z', 'Y').to_euler()
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return assign(obj, name, 'wood-light')

# Floor, two shallow risers and actual sloping side aprons. Their geometry is
# support only; the runtime reads the matching floor/ramp configuration below.
make_box('hall-v003-platform', -12, .14, -15, 17, .28, 17, 'paving-a', role='floor', bevel=.012)
# Large accepted paving stones, shallow joints and only three material batches.
# Their top is 5 mm above the support surface; the .28 m floor proxy is unchanged.
pitch = 17 / 13
for row in range(13):
    for column in range(13):
        material = ['paving-a', 'paving-b', 'paving-c'][(row * 7 + column * 11) % 3]
        CURRENT_BATCH = 'hall-v003-paving-' + material[-1]
        make_box('hall-v003-paving-stone', -20.5 + (column + .5) * pitch, .2805, -23.5 + (row + .5) * pitch,
                 pitch - .026, .009, pitch - .026, material, role='floor', bevel=.003)
CURRENT_BATCH = None
make_box('hall-v003-front-step', -12, .07, -5.65, 17, .14, 1.7, 'stone', role='floor', bevel=.012)
ROLE = 'floor'
for side, outer, inner in [('left', -21.5, -20.5), ('right', -2.5, -3.5)]:
    verts = [(outer, 0, -23.5), (outer, 0, -6.5), (inner, .28, -6.5), (inner, .28, -23.5)]
    obj = mesh('hall-v003-' + side + '-apron', verts, [(0, 1, 2, 3)], 'stone')
    obj.data.materials[0].use_backface_culling = False
ROLE = 'solid'

# Four square posts on each side; the front has only its two corner posts.
column_z = [-23.5 + i * 17 / 3 for i in range(4)]
for side, x in [('left', -20.5), ('right', -3.5)]:
    for i, z in enumerate(column_z):
        prefix = f'hall-v003-column-{side}-{i}'
        make_box(prefix + '-base', x, .23, z, 1.15, .46, 1.15, 'stone', player=True, bevel=.035)
        make_box(prefix + '-foot-cap', x, .53, z, .98, .14, .98, 'stone', player=True, bevel=.025)
        make_box(prefix + '-shaft', x, 2.765, z, .78, 4.33, .78, 'vermilion', player=True, bevel=.025)
        make_box(prefix + '-neck', x, 4.91, z, 1.0, .20, 1.0, 'gold', bevel=.018)
        make_box(prefix + '-bracket-low', x, 5.05, z, 1.26, .20, .72, 'wood-light', bevel=.025)
        make_box(prefix + '-bracket-top', x, 5.22, z, .86, .20, 1.52, 'wood-light', bevel=.025)
        for direction in [-1, 1]:
            if (i == 0 and direction < 0) or (i == 3 and direction > 0): continue
            brace(prefix + f'-brace-{direction}', (x, 4.18, z + direction * .36), (x, 4.97, z + direction * 1.22))

for side, x in [('left', -20.5), ('right', -3.5)]:
    make_box('hall-v003-' + side + '-long-beam', x, 5.17, -15, .68, .62, 17.5, 'vermilion')
    make_box('hall-v003-' + side + '-beam-crown', x, 5.49, -15, .88, .13, 17.5, 'teal')
    strip('hall-v003-' + side + '-beam-floral', x + (.35 if side == 'left' else -.35), 5.18, -15, 16.9, 'x+' if side == 'left' else 'x-')
for side, z in [('rear', -23.5), ('front', -6.5)]:
    make_box('hall-v003-' + side + '-crossbeam', -12, 5.17, z, 17.5, .62, .68, 'vermilion')
    make_box('hall-v003-' + side + '-beam-crown', -12, 5.49, z, 17.5, .13, .88, 'teal')
    strip('hall-v003-' + side + '-beam-floral', -12, 5.18, z + .35, 16.9)
# The hall is one continuous tall interior. There is no low ceiling or floor
# across the lower beam frame; the plain roof lining is added near y=8.05 below.

# Hall rear wall and courtyard rear wall share the same two true openings.
# Their overlapping .6 m walls make a continuous 1.1 m deep passage.
windows = [-18, -6]
window_low, window_high, window_width = 1.25, 4.35, 1.1

def pierced_rear(prefix, x_min, x_max, z, depth, height):
    intervals = [(x_min, windows[0] - .55), (windows[0] + .55, windows[1] - .55), (windows[1] + .55, x_max)]
    for i, (left, right) in enumerate(intervals):
        make_box(f'{prefix}-pier-{i}', (left + right) / 2, height / 2, z, right - left, height, depth, player=True)
    for i, x in enumerate(windows):
        make_box(f'{prefix}-window-{i}-sill-wall', x, window_low / 2, z, window_width, window_low, depth, player=True)
        make_box(f'{prefix}-window-{i}-head-wall', x, (window_high + height) / 2, z, window_width, height - window_high, depth)

pierced_rear('hall-v003-rear', -20.5, -3.5, -23.5, .6, 5.4)
pierced_rear('courtyard-square-rear', -24, 0, -24, .6, 4.5)
for row in range(2):
    left, block = -20.5 - (0 if row == 0 else 17 / 18), 0
    while left < -3.5:
        start, end = max(-20.5, left), min(-3.5, left + 17 / 9)
        make_box(f'hall-v003-rear-stone-{row}-{block}', (start + end) / 2, .43 + row * .30, -23.165,
                 end - start - .025, .282, .09, STONES[(row + block) % 3], bevel=.012)
        left += 17 / 9
        block += 1
for i, x in enumerate(windows):
    for sign in [-1, 1]:
        make_box(f'hall-v003-window-{i}-jamb-{sign}', x + sign * .605, 2.8, -23.74, .11, 3.32, 1.16, 'wood-light')
    for name, y in [('bottom', 1.195), ('top', 4.405)]:
        make_box(f'hall-v003-window-{i}-{name}', x, y, -23.74, 1.32, .11, 1.16, 'wood-light')
    for k in range(1, 4):
        make_box(f'hall-v003-window-{i}-lattice-v-{k}', x - .55 + k * 1.1 / 4, 2.8, -23.11, .038, 3.1, .09, 'wood')
    for k in range(1, 8):
        make_box(f'hall-v003-window-{i}-lattice-h-{k}', x, 1.25 + k * 3.1 / 8, -23.10, 1.1, .038, .09, 'wood')

# Full native-aspect mural; no crop, stretch or synthetic new flowers.
mural_h = 7 * 941 / 1672
panel('hall-v003-lotus-mural', -12, .93 + mural_h / 2, -23.145, 7, mural_h, ART['mural'])
for x in [-15.59, -8.41]: make_box('hall-v003-mural-jamb-' + str(x), x, .93 + mural_h / 2, -23.12, .16, mural_h + .30, .14, 'wood-light')
for y in [.85, .93 + mural_h + .08]: make_box('hall-v003-mural-border-' + str(round(y, 3)), -12, y, -23.12, 7.34, .16, .14, 'gold')

# The right side alternates real open bays, low infill and individual timber
# lattices. Left bays receive no wall, rail or lattice at all.
def side_screen(name, z_min, z_max, low_top=1.25, top=4.48):
    length = z_max - z_min
    make_box(name + '-low-wall', -3.5, (.28 + low_top) / 2, (z_min + z_max) / 2, .36, low_top - .28, length, 'plaster-light', player=True)
    make_box(name + '-stone-foot', -3.5, .46, (z_min + z_max) / 2, .42, .36, length, 'stone', player=True)
    for i, z in enumerate([z_min, z_max]): make_box(name + f'-upright-{i}', -3.5, (low_top + top) / 2, z, .16, top - low_top, .13, 'wood')
    for i, y in enumerate([low_top, top]): make_box(name + f'-rail-{i}', -3.5, y, (z_min + z_max) / 2, .16, .13, length, 'wood')
    count = max(2, round(length / .42))
    for i in range(1, count): make_box(name + f'-lattice-v-{i}', -3.5, (low_top + top) / 2, z_min + length * i / count, .10, top - low_top, .045, 'wood')
    for i in range(1, 7): make_box(name + f'-lattice-h-{i}', -3.5, low_top + (top - low_top) * i / 7, (z_min + z_max) / 2, .10, .045, length, 'wood')

side_screen('hall-v003-right-rear-screen', -22.85, -18.48)
make_box('hall-v003-right-middle-infill', -3.5, 1.99, -16.56, .40, 3.42, 1.36, 'plaster-light', player=True)
make_box('hall-v003-right-middle-dado', -3.5, .58, -16.56, .46, .60, 1.36, 'stone', player=True)
side_screen('hall-v003-right-front-screen', -11.5, -9.85, 1.12, 4.48)

def cloth(name, x, top, z, width, height, material, face='x+', folds=.055):
    global ROLE
    ROLE = 'decoration'
    right = {'x+': (0, 0, -1), 'x-': (0, 0, 1)}[face]
    verts, faces, nu, nv = [], [], 12, 8
    for row in range(nv + 1):
        v = row / nv
        for col in range(nu + 1):
            u = col / nu
            wave = folds * math.sin(u * math.pi * 6) * (.35 + .65 * v)
            hem = .022 * math.sin(u * math.pi * 3 + .4) * v ** 5
            verts.append((x + wave, top - height * v + hem, z + right[2] * (u - .5) * width))
    for row in range(nv):
        for col in range(nu):
            a = row * (nu + 1) + col
            faces.append((a, a + 1, a + nu + 2, a + nu + 1))
    obj = mesh(name, verts, faces, material)
    uv = obj.data.uv_layers.new(name='UVMap')
    for polygon in obj.data.polygons:
        for li in polygon.loop_indices:
            vertex = obj.data.loops[li].vertex_index
            uv.data[li].uv = (vertex % (nu + 1) / nu, 1 - vertex // (nu + 1) / nv)
    modifier = obj.modifiers.new('fabric-thickness', 'SOLIDIFY')
    modifier.thickness = .01
    modifier.offset = 0
    modifier.use_even_offset = True
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    ROLE = 'solid'
    return obj

for i, z in enumerate([-17.14, -11.47]):
    cloth(f'hall-v003-left-curtain-{i}', -20.17, 4.86, z, .86, 2.52, M['cream'])
    make_box(f'hall-v003-left-curtain-rod-{i}', -20.17, 4.92, z, .09, .09, 1.02, 'wood')
cloth('hall-v003-right-banner', -3.94, 4.86, -14.88, .9, .9 * 234 / 82, ART['banner'], 'x-', .035)
make_box('hall-v003-right-banner-rod', -3.94, 4.92, -14.88, .10, .10, 1.10, 'wood')
ROLE = 'decoration'
for i in range(7):
    z = -14.88 - .39 + i * .13
    tube(f'hall-v003-right-banner-fringe-{i}', [(-3.94, 2.29, z), (-3.94, 2.14, z)], .012, 'gold', 4)
ROLE = 'solid'

# The two-storey exterior encloses a single open interior. Four thin upper
# walls replace the former solid block; no inter-storey slab spans the hall.
for side, x in [('left', -20), ('right', -4)]:
    make_box('hall-v003-upper-wall-' + side, x, 6.805, -15, .32, 2.49, 16.32, 'plaster-light')
for side, z in [('rear', -23), ('front', -7)]:
    make_box('hall-v003-upper-wall-' + side, -12, 6.805, z, 16, 2.49, .32, 'plaster-light')
make_box('hall-v003-high-roof-lining', -12, 8.13, -15, 16, .16, 16, 'wood-light')
for i, x in enumerate([-19.6, -16, -12, -8, -4.4]): make_box(f'hall-v003-upper-post-{i}', x, 6.71, -6.92, .30, 2.45, .32, 'vermilion')
for i, x in enumerate([-17.8, -14, -10, -6.2]):
    make_box(f'hall-v003-upper-window-{i}-recess', x, 6.77, -6.975, 2.35, 1.5, .07, 'ink')
    for sign in [-1, 1]: make_box(f'hall-v003-upper-window-{i}-jamb-{sign}', x + sign * 1.18, 6.77, -6.90, .13, 1.68, .15, 'wood-light')
    for k, y in enumerate([6, 7.53]): make_box(f'hall-v003-upper-window-{i}-rail-{k}', x, y, -6.90, 2.5, .12, .15, 'wood-light')
    for k in range(1, 8): make_box(f'hall-v003-upper-window-{i}-v-{k}', x - 1.175 + k * 2.35 / 8, 6.77, -6.80, .045, 1.48, .06, 'wood-light')
    for k in range(1, 5): make_box(f'hall-v003-upper-window-{i}-h-{k}', x, 6 + k * 1.53 / 5, -6.79, 2.35, .045, .06, 'wood-light')
make_box('hall-v003-upper-painted-beam', -12, 7.85, -6.85, 16.5, .35, .35, 'teal')
strip('hall-v003-upper-beam-floral', -12, 7.85, -6.665, 16.3)
roof('hall-v003-lower-roof-source', -12, -15, 18.2, 18.2, 5.65, .92)

def clip_polygon(poly, axis, value, keep_greater):
    result = []
    for i, current in enumerate(poly):
        previous = poly[i - 1]
        current_in = current[axis] >= value - 1e-8 if keep_greater else current[axis] <= value + 1e-8
        previous_in = previous[axis] >= value - 1e-8 if keep_greater else previous[axis] <= value + 1e-8
        if current_in != previous_in:
            fraction = (value - previous[axis]) / (current[axis] - previous[axis])
            result.append(tuple(previous[k] + (current[k] - previous[k]) * fraction for k in range(3)))
        if current_in: result.append(current)
    return result

# Cut the lower roof into four non-overlapping peripheral strips. Partitioning
# source triangles preserves the curved tile language and leaves a real 16 m
# central opening. Each strip has its own camera bounds, never a roof-wide box.
bpy.context.view_layer.update()
lower_source = [obj for obj in bpy.context.scene.objects if obj.get('semanticGroup') == 'hall-v003-lower-roof-source']
bands = [
    ('left', [(0, -20, False)]),
    ('right', [(0, -4, True)]),
    ('rear', [(0, -20, True), (0, -4, False), (2, -23, False)]),
    ('front', [(0, -20, True), (0, -4, False), (2, -7, True)]),
]
for original in lower_source:
    source_vertices = [original.matrix_world @ vertex.co for vertex in original.data.vertices]
    source_vertices = [(v.x - 12, v.z, 2 - v.y) for v in source_vertices]
    for side, planes in bands:
        verts, faces = [], []
        for polygon in original.data.polygons:
            clipped = [source_vertices[i] for i in polygon.vertices]
            for axis, value, keep_greater in planes:
                if not clipped: break
                clipped = clip_polygon(clipped, axis, value, keep_greater)
            if len(clipped) < 3: continue
            area = sum((Vector(clipped[i]) - Vector(clipped[0])).cross(Vector(clipped[i + 1]) - Vector(clipped[0])).length for i in range(1, len(clipped) - 1))
            if area < 1e-9: continue
            start = len(verts)
            verts.extend(clipped)
            faces.append(tuple(range(start, start + len(clipped))))
        if faces:
            CURRENT_BATCH = 'hall-v003-lower-eave-' + side
            mesh(CURRENT_BATCH + '-part', verts, faces, original.data.materials[0])
    bpy.data.objects.remove(original, do_unlink=True)
CURRENT_BATCH = None
roof('hall-v003-upper-roof', -12, -15, 18.5, 18.5, 8.08, 1.7)

# Collect precise source-space boxes before semantic batching. A lattice has
# individual bars, not a single opaque camera box across its holes.
bpy.context.view_layer.update()
camera_groups, player_groups = {}, {}
for obj in bpy.context.scene.objects:
    if obj.type != 'MESH': continue
    if not (obj.name.startswith(('hall-v003-', 'courtyard-square-rear-')) or obj.get('semanticGroup', '').startswith('hall-v003-')): continue
    group = obj.get('semanticGroup', obj.name)
    if obj.get('cameraRole') == 'solid': camera_groups.setdefault(group, []).append(obj)
    if obj.get('playerRole') == 'solid': player_groups.setdefault(group, []).append(obj)
camera_boxes = [dict(id=key, **bounds(group)) for key, group in camera_groups.items()]
collision_boxes = [dict(id=key, **bounds(group)) for key, group in player_groups.items()]
layout = {
    'version': 'v003', 'status': 'measured-export', 'worldOrigin': [-12, 0, 2],
    'hall': {'minX': -20.5, 'maxX': -3.5, 'minZ': -23.5, 'maxZ': -6.5},
    'floor': {'minX': -20.5, 'maxX': -3.5, 'minZ': -23.5, 'maxZ': -6.5, 'height': .28},
    'ramps': [
        {'id': 'hall-v003-front-ramp', 'minX': -20.5, 'maxX': -3.5, 'minZ': -6.5, 'maxZ': -4.8, 'axis': 'z', 'heightAtMin': .28, 'heightAtMax': 0},
        {'id': 'hall-v003-left-ramp', 'minX': -21.5, 'maxX': -20.5, 'minZ': -23.5, 'maxZ': -6.5, 'axis': 'x', 'heightAtMin': 0, 'heightAtMax': .28},
        {'id': 'hall-v003-right-ramp', 'minX': -3.5, 'maxX': -2.5, 'minZ': -23.5, 'maxZ': -6.5, 'axis': 'x', 'heightAtMin': .28, 'heightAtMax': 0},
    ],
    'windows': [{'x': x, 'minX': x - .55, 'maxX': x + .55, 'minY': 1.25, 'maxY': 4.35, 'minZ': -24.3, 'maxZ': -23.2} for x in windows],
    'verticalVoid': {'minX': -19.5, 'maxX': -4.5, 'minZ': -22.5, 'maxZ': -7.5, 'floorHeight': .28, 'ceilingBottom': 8.05, 'netHeight': 7.77},
    'playerSolids': [{'id': b['id'], 'minX': b['min'][0], 'maxX': b['max'][0], 'minZ': b['min'][2], 'maxZ': b['max'][2], 'height': b['max'][1]} for b in collision_boxes],
    'cameraBoxes': camera_boxes, 'collisionBoxes': collision_boxes,
    'workbench': {'id': 'hall-v003-workbench', 'original': {'x': -18, 'z': -7.5}, 'target': {'x': -19, 'z': -2.8}},
    'runtimeExpansion': {'unchangedCourtyardNeedsExpansion': True, 'rearWallAlreadyExpanded': True},
}
LAYOUT.write_text(json.dumps(layout, ensure_ascii=False, indent=2) + '\n')

# Each new structure is independently addressable; only composite roofs and
# the moved workbench are joined to the same semantic assembly.
groups = {}
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH' and obj.get('semanticGroup', '').startswith(('hall-v003-', 'courtyard-square-rear-')):
        groups.setdefault(obj['semanticGroup'], []).append(obj)
for name, group in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in group: obj.select_set(True)
    bpy.context.view_layer.objects.active = group[0]
    bpy.ops.object.convert(target='MESH')
    if len(group) > 1: bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = name
    obj['semanticGroup'] = name
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

scene = bpy.context.scene
bpy.ops.object.select_all(action='DESELECT')
for obj in scene.objects:
    if obj.type == 'MESH': obj.select_set(True)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / 'courtyard.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUTPUT / 'courtyard.glb'), export_format='GLB', use_selection=True, export_yup=True, export_apply=True, export_animations=False, export_extras=True, export_image_format='JPEG', export_jpeg_quality=92)
raw = (OUTPUT / 'courtyard.glb').read_bytes()
size = struct.unpack_from('<I', raw, 12)[0]
gltf = json.loads(raw[20:20 + size])
manifest = {
    'version': 'v003', 'status': 'square hall implementation; awaiting visual acceptance', 'worldOrigin': [-12, 0, 2], 'units': 'metres', 'upAxis': 'Y',
    'model': 'courtyard.glb', 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
    'triangles': sum(gltf['accessors'][p['indices']]['count'] // 3 for m in gltf['meshes'] for p in m['primitives']),
    'meshCount': len(gltf['meshes']), 'materials': len(gltf['materials']), 'hallAxes': layout['hall'],
    'caisson': 'Existing v002 objects retained in place without edits; terrain preview hides caisson-* while the tall interior is reviewed.',
    'interior': {'kind': 'single open volume', 'noIntermediateFloor': True, 'ceilingBottom': 8.05, 'netHeight': 7.77, 'lowerEaveOpening': [-20, -4, -23, -7]},
    'textures': {name: {'file': filename, 'sha256': hashlib.sha256((OUTPUT / filename).read_bytes()).hexdigest()} for name, filename in [('mural', 'hall-lotus-mural.jpg'), ('banner', 'hall-banner.jpg'), ('border', 'hall-floral-border.jpg')]},
    'muralSize': [7, mural_h], 'bannerSize': [.9, .9 * 234 / 82], 'bannerStatus': '82x234 native low-resolution perspective extraction; replacement pending',
    'fabricThickness': .01, 'platformPaving': {'stones': 169, 'materialBatches': 3, 'pitch': pitch, 'grout': .026, 'top': .285},
    'geometryLayout': 'src/content/world/courtyard-hall-v003.json', 'cameraBoxCount': len(camera_boxes), 'playerSolidCount': len(collision_boxes),
    'retiredNodes': sorted(retired), 'oldSourceHashes': old_hashes,
    'runtimeExpansion': layout['runtimeExpansion'],
}
(SOURCE / 'export-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
for path in old_files:
    if hashlib.sha256(path.read_bytes()).hexdigest() != old_hashes[str(path.relative_to(ROOT))]: raise RuntimeError('Original asset unexpectedly changed')
print('COURTYARD_V003_EXPORT', json.dumps({k: manifest[k] for k in ['bytes', 'triangles', 'meshCount', 'cameraBoxCount', 'playerSolidCount']}, ensure_ascii=False), flush=True)
if args.skip_render: sys.exit(0)

# Render-only equivalent of the runtime's exterior widening. Never save/export
# these temporary placements; browser expansion remains the one owner.
for obj in scene.objects:
    if obj.type != 'MESH': continue
    name = obj.get('semanticGroup', obj.name)
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
        obj.scale.x *= sx
        obj.location.x = obj.location.x * sx + offset
    if name.startswith(('tree-', 'shrub-', 'road-grass', 'caisson-')): obj.hide_render = True

make_box('preview-only-ground', -12, -.12, -10, 120, .12, 120, 'paving-b', role='floor')
scene.render.engine = 'CYCLES'
scene.cycles.samples = 16
scene.cycles.use_denoising = True
scene.render.resolution_x = 1120
scene.render.resolution_y = 760
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'AgX'
cam = scene.camera
shots = [
    ('entrance', (-12, 2.35, -1.5), (-12, 3.8, -18), 23),
    ('left', (-10.6, 2.25, -12.3), (-21.0, 3.7, -15), 22),
    ('right', (-13.4, 2.25, -13.2), (-3.6, 3.7, -15), 22),
    ('look-out', (-12, 2.25, -18), (-12, 2.7, -4), 23),
    ('overall', (8, 21, 14), (-12, 3.2, -13), 37),
    ('tall-interior', (-12, 1.9, -10), (-12, 5.65, -17.8), 20),
]
for name, eye, target, lens in shots:
    cam.location = point(*eye)
    cam.rotation_euler = (Vector(point(*target)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = lens
    scene.render.filepath = str(WORK / f'courtyard-square-v003-{name}.png')
    bpy.ops.render.render(write_still=True)
    print('COURTYARD_V003_RENDER', name, flush=True)

"""Independent dune study: three authored curved crests on one continuous surface.

Run: blender -b --python scripts/build-world-environment-dunes.py
No procedural noise, old ridge profile, external dependency, or main-map edits.
"""
import bpy
import hashlib
import json
import math
import struct
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source/world/models/environment-sample/v001'
OUTPUT = ROOT / 'public/assets/world/environment-sample/v001'
WORK = ROOT / 'work/world'
for directory in (SOURCE, OUTPUT, WORK):
    directory.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1

# Hand-authored plan and elevation control points. The three lines are broad
# crescents with different curvature; none has a repeated zigzag peak pattern.
CRESTS = [
    {'id': 'far-crest', 'x': [-47, -34, -18, 0, 18, 35, 48],
     'z': [-12, -12.8, -10.5, -8.3, -9.0, -11, -12],
     'height': [0, 3.2, 7.4, 8.7, 7.5, 3.8, 0], 'frontWidth': 12, 'backWidth': 7.5},
    {'id': 'middle-crest', 'x': [-16, -7, 5, 17, 32, 45],
     'z': [1.5, .5, -1, -.2, 2.5, 3],
     'height': [0, 3.4, 6.2, 6.8, 3.5, 0], 'frontWidth': 12, 'backWidth': 7},
    {'id': 'near-crest', 'x': [-45, -32, -20, -9, 4, 18],
     'z': [7, 8.5, 10, 9, 6, 5],
     'height': [0, 3.5, 4.6, 3.9, 1.8, 0], 'frontWidth': 8.5, 'backWidth': 6.9},
]

def monotone_curve(x, xs, controls):
    """Shape-preserving Hermite interpolation; authored extrema never overshoot."""
    slopes = [(controls[i+1] - controls[i]) / (xs[i+1] - xs[i]) for i in range(len(xs)-1)]
    tangents = [slopes[0]]
    for i in range(1, len(xs)-1):
        a, b = slopes[i-1], slopes[i]
        tangents.append(0 if a*b <= 0 else 2*a*b/(a+b))
    tangents.append(slopes[-1])
    index = next((i for i in range(len(xs)-1) if x <= xs[i+1]), len(xs)-2)
    width = xs[index+1] - xs[index]
    t = min(1, max(0, (x-xs[index])/width))
    return ((2*t**3 - 3*t*t + 1)*controls[index]
            + (t**3 - 2*t*t + t)*width*tangents[index]
            + (-2*t**3 + 3*t*t)*controls[index+1]
            + (t**3 - t*t)*width*tangents[index+1])

def surface_height(x, z):
    contributions = []
    for crest in CRESTS:
        if x <= crest['x'][0] or x >= crest['x'][-1]:
            continue
        center_z = monotone_curve(x, crest['x'], crest['z'])
        amplitude = monotone_curve(x, crest['x'], crest['height'])
        distance = z-center_z
        if distance >= 0:
            width = min(crest['frontWidth'], 17.5-center_z-1)
            t = distance/width
            profile = (1-t)**2*(1+.75*t) if t < 1 else 0
        else:
            width = min(crest['backWidth'], center_z+17.5-1)
            t = -distance/width
            profile = (1-t)**1.22 if t < 1 else 0
        contributions.append(max(0, amplitude*profile))
    # Smooth envelope of the broad authored dunes. Distinct domains make a
    # foreground crest end naturally while the adjacent dune continues past it.
    # This does not displace vertices independently or generate cellular basins.
    return sum(h**4 for h in contributions)**.25-.15

NX = 64
SUBDIVISIONS = 5
NZ = 6 * SUBDIVISIONS + 1
vertices = []
colors = []
faces = []

def linear(v):
    return v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4

for ix in range(NX+1):
    x = -50 + ix*100/NX
    centers = [monotone_curve(x, crest['x'], crest['z']) for crest in CRESTS]
    z_lines = [-17.5, centers[0], centers[0]*.44+centers[1]*.56, centers[1], centers[1]*.42+centers[2]*.58, centers[2], 17.5]
    for row in range(NZ):
        band = min(5, row//SUBDIVISIONS)
        t = (row-band*SUBDIVISIONS)/SUBDIVISIONS
        z = z_lines[band]+(z_lines[band+1]-z_lines[band])*t
        h = surface_height(x, z)
        vertices.append((x, -z, h))
        warmth = max(0, min(1, h/8.7))
        rgb = (.92 + warmth*.025, .708 + warmth*.028, .452 + warmth*.032)
        colors.append(tuple(linear(c) for c in rgb) + (1,))

for ix in range(NX):
    for row in range(NZ-1):
        a = ix*NZ+row
        b = (ix+1)*NZ+row
        if (ix+row)%2:
            faces.extend([(a, b, a+1), (a+1, b, b+1)])
        else:
            faces.extend([(a, b, b+1), (a, b+1, a+1)])

# Close the base as part of the same manifold mesh, slightly below the ground.
boundary = ([i*NZ for i in range(NX+1)]
            + [NX*NZ+j for j in range(1, NZ)]
            + [i*NZ+NZ-1 for i in range(NX-1, -1, -1)]
            + [j for j in range(NZ-2, 0, -1)])
bottom = []
for index in boundary:
    x, y, _ = vertices[index]
    bottom.append(len(vertices))
    vertices.append((x, y, -.35))
    colors.append(tuple(linear(c) for c in (.92, .708, .452))+(1,))
center = len(vertices)
vertices.append((0, 0, -.35))
colors.append(tuple(linear(c) for c in (.92, .708, .452))+(1,))
for i, top in enumerate(boundary):
    j = (i+1)%len(boundary)
    faces.extend([(top, bottom[i], bottom[j]), (top, bottom[j], boundary[j]),
                  (center, bottom[j], bottom[i])])

mesh = bpy.data.meshes.new('dune-landscape-mesh')
mesh.from_pydata(vertices, [], faces)
mesh.update()
model = bpy.data.objects.new('dune-landscape', mesh)
scene.collection.objects.link(model)
bpy.context.view_layer.objects.active = model
model.select_set(True)
# Recalculate orientation for a watertight surface, independent of authored order.
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode='OBJECT')
for polygon in mesh.polygons:
    polygon.use_smooth = False

attribute = mesh.color_attributes.new(name='sand-color', type='FLOAT_COLOR', domain='CORNER')
for loop in mesh.loops:
    attribute.data[loop.index].color = colors[loop.vertex_index]

material = bpy.data.materials.new('matte-sand')
material.use_nodes = True
principled = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
principled.inputs['Roughness'].default_value = 1
principled.inputs['Specular IOR Level'].default_value = .10
vertex_color = material.node_tree.nodes.new('ShaderNodeVertexColor')
vertex_color.layer_name = 'sand-color'
material.node_tree.links.new(vertex_color.outputs['Color'], principled.inputs['Base Color'])
mesh.materials.append(material)
model['assetRole'] = 'independent-dune-study'
model['placementOrigin'] = 'ground rectangle center'
model['frontAxis'] = '+Z in glTF; lower fore-slope'

mesh.calc_loop_triangles()
edge_counts = {}
for polygon in mesh.polygons:
    for edge in polygon.edge_keys:
        edge_counts[edge] = edge_counts.get(edge, 0)+1
if any(count != 2 for count in edge_counts.values()):
    raise RuntimeError('Dune mesh must be a closed connected sheet with a buried base')
triangles = len(mesh.loop_triangles)
if triangles > 8000:
    raise RuntimeError('Independent dune triangle budget exceeded')

# Save source without the preview stage. Export uses metres and glTF Y-up.
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'dunes.blend'))
glb = OUTPUT/'dunes.glb'
bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', use_selection=True,
                         export_yup=True, export_apply=True, export_animations=False,
                         export_extras=True, export_materials='EXPORT')
raw = glb.read_bytes()
json_length = struct.unpack_from('<I', raw, 12)[0]
gltf = json.loads(raw[20:20+json_length])
bounds = {'min': [-50, -.35, -17.5], 'max': [50, max(v[2] for v in vertices), 17.5]}
# Inspect the exported source mesh itself, including interpolation between its
# vertices. Samples are measured with downward rays, not rounded control heights.
bpy.context.view_layer.update()
def mesh_surface(x, z):
    hit, location, normal, face = model.ray_cast(Vector((x, -z, 30)), Vector((0, 0, -1)))
    if not hit: raise RuntimeError('Missing dune surface during section inspection')
    return location.z
section_checks = []
for sample_x in (-20, 0, 17):
    center_zs = [monotone_curve(sample_x, c['x'], c['z']) for c in CRESTS]
    crest_points = [{'id': c['id'], 'z': round(z, 4), 'height': round(mesh_surface(sample_x, z), 4)}
                    for c, z in zip(CRESTS, center_zs)]
    valleys = []
    for i, (a, b) in enumerate(zip(center_zs, center_zs[1:])):
        probes = [(a+(b-a)*j/100, mesh_surface(sample_x, a+(b-a)*j/100)) for j in range(101)]
        valley_z, valley_height = min(probes, key=lambda v: v[1])
        valleys.append({'between': [CRESTS[i]['id'], CRESTS[i+1]['id']],
                        'z': round(valley_z, 4), 'height': round(valley_height, 4),
                        'dropFromLowerCrest': round(min(crest_points[i]['height'], crest_points[i+1]['height'])-valley_height, 4)})
    section_checks.append({'x': sample_x, 'crests': crest_points, 'valleys': valleys})
manifest = {
    'asset': 'independent-dunes', 'version': 'v001', 'status': 'visual study awaiting user approval',
    'source': 'art-source/world/models/environment-sample/v001/dunes.blend',
    'generator': 'scripts/build-world-environment-dunes.py',
    'runtime': 'public/assets/world/environment-sample/v001/dunes.glb',
    'references': ['W01 最新沙漠世界高空总览图.png', 'W02 原始小旅人出生点第三人称开场图.png'],
    'referenceArchive': 'art-source/world/art-sample/v001/',
    'origin': 'ground rectangle center', 'units': 'metres', 'upAxis': 'Y', 'frontAxis': '+Z',
    'bounds': bounds, 'triangles': triangles, 'vertices': len(mesh.vertices),
    'meshCount': len(gltf.get('meshes', [])), 'materialCount': len(gltf.get('materials', [])),
    'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
    'topology': 'one closed connected surface with buried skirt and bottom; shared ridge and valley vertices',
    'shape': 'three offset curved crests with distinct lengths; smooth continuous height envelope and asymmetric cross-slopes; no noise',
    'crestControls': CRESTS,
    'lastShapeAdjustment': 'Far crest frontWidth 18.5m to 12m only; crest elevations, footprint and other crest controls retained',
    'crossSectionsFromActualMesh': section_checks,
    'knownLimits': ['Standalone art study, not installed in the production world',
                    'Three authored crest regions share one surface; no distant mountain or cliff model',
                    'No terrain walk surface or collision proxy is supplied'],
}
(SOURCE/'dunes-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')

# Readable model views with no fog, depth of field, or background disguise.
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.render.resolution_x = 1280
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'AgX'
scene.view_settings.exposure = .3
scene.world = bpy.data.worlds.new('preview-world')
scene.world.use_nodes = True
background = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
background.inputs['Color'].default_value = (.42, .59, .78, 1)
background.inputs['Strength'].default_value = .6
bpy.ops.object.light_add(type='SUN', location=(-50, -40, 60))
sun = bpy.context.object
sun.name = 'preview-sun'
sun.data.energy = 3.8
sun.data.color = (1, .91, .80)
sun.data.angle = math.radians(6)
sun.rotation_euler = (Vector((0, 0, 0))-sun.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=700, location=(0, 0, 0))
floor = bpy.context.object
floor.name = 'preview-ground'
floor_material = bpy.data.materials.new('preview-ground-sand')
floor_material.use_nodes = True
p = next(n for n in floor_material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
p.inputs['Base Color'].default_value = tuple(linear(c) for c in (.92, .708, .452))+(1,)
p.inputs['Roughness'].default_value = 1
floor.data.materials.append(floor_material)
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.name = 'preview-camera'
scene.camera = camera
views = [
    ('overall', (68, -80, 66), (0, 0, 2.5), 'ORTHO', 112),
    ('low', (60, -18, 4.5), (0, 3, 2.5), 'PERSP', 30),
    ('side', (110, -18, 19), (0, 0, 3.0), 'ORTHO', 48),
]
for name, position, target, projection, size in views:
    camera.location = position
    camera.rotation_euler = (Vector(target)-camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.type = projection
    if projection == 'ORTHO': camera.data.ortho_scale = size
    else: camera.data.lens = size
    scene.render.filepath = str(WORK/f'environment-sample-v001-dunes-{name}.png')
    bpy.ops.render.render(write_still=True)
print(json.dumps(manifest, ensure_ascii=False))

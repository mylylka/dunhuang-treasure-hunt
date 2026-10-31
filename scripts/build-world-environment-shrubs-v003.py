"""Build separately authored low shrub B/C variants using accepted cloud forms.

Run: blender -b --python scripts/build-world-environment-shrubs-v003.py
The source keeps six editable boughs per shrub; exports join copies only.
"""
import bpy, bmesh, hashlib, importlib.util, json, math, struct, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source/world/models/environment-sample/v003'
OUTPUT = ROOT / 'public/assets/world/environment-sample/v003'
WORK = ROOT / 'work/world'
for path in (SOURCE, OUTPUT, WORK):
    path.mkdir(parents=True, exist_ok=True)

protected = [ROOT / p for p in (
    'art-source/world/models/environment-sample/v002/vegetation.blend',
    'art-source/world/models/environment-sample/v002/dunes.blend',
    'public/assets/world/environment-sample/v002/tree-a.glb',
    'public/assets/world/environment-sample/v002/shrub-a.glb',
    'public/assets/world/environment-sample/v002/dunes.glb',
    'scripts/environment-cloud-forms.py',
)]
baseline = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in protected}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('environment_cloud_forms', ROOT / 'scripts/environment-cloud-forms.py')
cloud = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cloud)
cloud.FOLIAGE = cloud.material('olive-sage-cloud-foliage', '859368', vertex_color=True)

# Name, Blender center, half-width/depth/height, yaw, authored contour variation.
# B has a heavier left shoulder and a long, descending right-hand wing. Its
# front and rear rows alternate, avoiding the central dome of the accepted A.
BOUGHS_B = [
    ('left-back-shoulder', (-.47, .16, .26), (.49, .37, .23), -.16, 0),
    ('left-front-low', (-.48, -.24, .16), (.46, .31, .15), .24, 1),
    ('rear-middle-step', (.05, .23, .21), (.39, .31, .20), -.40, 2),
    ('right-middle-wing', (.45, .00, .18), (.44, .33, .17), .35, 1),
    ('right-low-tip', (.75, -.20, .10), (.28, .26, .10), -.24, 2),
    ('front-middle-low', (.02, -.29, .11), (.33, .25, .12), .16, 0),
]
# C has two distinct rear shoulders, an intermediate front-center step and two
# low foreground boughs. No exposed stem or support spike is present.
BOUGHS_C = [
    ('left-high-shoulder', (-.28, .16, .49), (.33, .33, .33), -.20, 1),
    ('right-high-shoulder', (.32, .25, .43), (.34, .31, .30), .30, 0),
    ('front-left-low', (-.31, -.24, .20), (.34, .33, .22), -.28, 2),
    ('front-right-low', (.27, -.32, .18), (.32, .34, .20), .21, 1),
    ('front-middle-step', (.02, -.08, .32), (.28, .30, .24), -.09, 0),
    ('rear-low-bridge', (-.02, .35, .16), (.44, .40, .18), .37, 2),
]
DESIGNS = {
    'shrub-b': {'boughs': BOUGHS_B, 'dimensions': (1.9, 1.1, .5), 'shade': 1.0,
                'description': 'low asymmetric spread; heavier left shoulder and descending right wing'},
    'shrub-c': {'boughs': BOUGHS_C, 'dimensions': (1.3, 1.2, .85), 'shade': .985,
                'description': 'compact double shoulder; rear high boughs and stepped lower foreground'},
}

def fit_authored_group(group, dimensions):
    points = [v.co for o in group for v in o.data.vertices]
    lo = [min(v[i] for v in points) for i in range(3)]
    hi = [max(v[i] for v in points) for i in range(3)]
    origin = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]]
    factors = [dimensions[i] / (hi[i] - lo[i]) for i in range(3)]
    for o in group:
        for v in o.data.vertices:
            for i in range(3):
                v.co[i] = (v.co[i] - origin[i]) * factors[i]
        center = o['branch_support_center']
        o['branch_support_center'] = [(center[i] - origin[i]) * factors[i] for i in range(3)]
        o['role'] = 'closed-shrub-foliage-bough'
        o.data.update()

groups = {}
for asset, design in DESIGNS.items():
    collection = bpy.data.collections.new(asset + '-editable-boughs')
    scene.collection.children.link(collection)
    group = [cloud.sculpt_cloud(asset + '-' + name, center, scale, yaw, design['shade'], variant)
             for name, center, scale, yaw, variant in design['boughs']]
    fit_authored_group(group, design['dimensions'])
    for o in group:
        for old_collection in list(o.users_collection):
            old_collection.objects.unlink(o)
        collection.objects.link(o)
    groups[asset] = group

# The saved source displays both editable groups side by side. Export copies are
# reset to local ground-centered origins; no display offset enters either GLB.
for asset, group in groups.items():
    for o in group:
        o.location.x = -1.25 if asset == 'shrub-b' else 1.25
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / 'shrubs.blend'))

entries = []
for asset, group in groups.items():
    topology = {'boughs': len(group), 'boundaryEdges': 0, 'nonManifoldEdges': 0}
    triangles = 0
    for o in group:
        bm = bmesh.new(); bm.from_mesh(o.data)
        topology['boundaryEdges'] += sum(e.is_boundary for e in bm.edges)
        topology['nonManifoldEdges'] += sum(not e.is_manifold for e in bm.edges)
        bm.free(); o.data.calc_loop_triangles(); triangles += len(o.data.loop_triangles)
    assert topology['boundaryEdges'] == 0 and topology['nonManifoldEdges'] == 0
    assert triangles <= 8000
    bpy.ops.object.select_all(action='DESELECT')
    copies = []
    for original in group:
        duplicate = original.copy(); duplicate.data = original.data.copy()
        scene.collection.objects.link(duplicate); duplicate.location = (0, 0, 0)
        duplicate.select_set(True); copies.append(duplicate)
    bpy.context.view_layer.objects.active = copies[0]
    bpy.ops.object.join()
    joined = bpy.context.object; joined.name = asset; joined.data.name = asset + '-foliage'
    joined['assetRole'] = 'independent-ground-shrub-variant'
    joined['placementOrigin'] = 'ground center; Y-up metres'
    joined['variant'] = asset[-1].upper()
    joined['editableSourceBoughs'] = len(group)
    path = OUTPUT / (asset + '.glb')
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True,
                              export_yup=True, export_apply=True, export_animations=False, export_extras=True)
    raw = path.read_bytes(); size = struct.unpack_from('<I', raw, 12)[0]
    gltf = json.loads(raw[20:20 + size])
    assert len(gltf['meshes']) == 1 and len(gltf['meshes'][0]['primitives']) == 1
    assert len(gltf['materials']) == 1
    positions = [v.co for v in joined.data.vertices]
    bounds = {'min': [min(v.x for v in positions), min(v.z for v in positions), -max(v.y for v in positions)],
              'max': [max(v.x for v in positions), max(v.z for v in positions), -min(v.y for v in positions)]}
    entries.append({'asset': asset, 'node': asset, 'shape': DESIGNS[asset]['description'],
                    'boundsYUp': bounds, 'dimensionsWidthDepthHeight': DESIGNS[asset]['dimensions'],
                    'triangles': triangles, 'topology': topology, 'meshes': 1, 'primitives': 1,
                    'materials': 1, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})
    joined.hide_render = True; joined.hide_set(True)
    for o in group:
        o.location = (0, 0, 0)

manifest = {
    'version': 'v003', 'status': 'candidate awaiting real-web and user visual review',
    'generator': 'scripts/build-world-environment-shrubs-v003.py',
    'source': 'art-source/world/models/environment-sample/v003/shrubs.blend',
    'sharedFormHelper': 'scripts/environment-cloud-forms.py',
    'referenceArchive': 'art-source/world/art-sample/v001/',
    'styleBaseline': 'docs/environment-sample-v002-acceptance.md',
    'method': 'Separately authored B/C arrangements of six closed cloud boughs each; no random placement and no imported or globally transformed shrub A. Export joins copies sharing one material without decimation; editable source boughs remain separate.',
    'sourceDisplayOffsetsX': {'shrub-b': -1.25, 'shrub-c': 1.25},
    'runtimeOrigin': 'ground center', 'runtimeUpAxis': 'Y', 'units': 'metres',
    'palette': 'accepted olive-sage vertex-color ramp, equal tone within each group; C uniformly 1.5% darker',
    'assets': entries, 'protectedSourceHashes': baseline,
    'limitations': ['Static stylized leaf-cluster volumes; individual leaves and animation are not supplied.',
                    'B/C are new variants awaiting visual review; approval of A does not automatically approve these variants.',
                    'Closed overlapping boughs preserve visible layering; export joining does not boolean-union their volumes.'],
}
(SOURCE / 'shrubs-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

# Match the accepted vegetation Blender review lighting, with identical settings
# for both candidates. The independent webpage remains the final visual check.
ground_mat = cloud.material('preview-sand', 'e6d6b6')
cloud.object_mesh('preview-ground', [(-12,-12,-.012),(12,-12,-.012),(12,12,-.012),(-12,12,-.012)], [(0,1,2,3)], ground_mat)
scene.world = bpy.data.worlds.new('preview-daylight'); scene.world.use_nodes = True
background = scene.world.node_tree.nodes.get('Background')
background.inputs['Color'].default_value = (.64, .71, .77, 1)
background.inputs['Strength'].default_value = .5
bpy.ops.object.light_add(type='AREA', location=(-4,-5,9)); key = bpy.context.object
key.name = 'preview-key'; key.data.energy = 1000; key.data.size = 5
key.rotation_euler = (Vector((0,0,2)) - key.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='SUN', location=(0,0,7)); sun = bpy.context.object
sun.name = 'preview-sun'; sun.data.energy = 1.5; sun.rotation_euler = (.4,-.5,-.45); sun.data.angle = .12
bpy.ops.object.camera_add(); camera = bpy.context.object; camera.name = 'preview-camera'
scene.camera = camera; camera.data.type = 'ORTHO'
scene.render.engine = 'CYCLES'; scene.cycles.samples = 32
scene.render.resolution_x = 1100; scene.render.resolution_y = 1100
scene.render.resolution_percentage = 100; scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'AgX'
for asset, group in groups.items():
    for other_group in groups.values():
        for o in other_group:
            o.hide_render = o not in group
    width, depth, height = DESIGNS[asset]['dimensions']
    target = Vector((0,0,height*.48))
    views = [('front', (0,-3.5,.35), width/.80),
             ('side', (3.5,0,.35), max(depth,height)/.76),
             ('oblique', (2.45,-3.5,.98), (width*.82+depth*.57)/.84)]
    for view, delta, ortho in views:
        camera.location = target + Vector(delta)
        camera.rotation_euler = (target-camera.location).to_track_quat('-Z','Y').to_euler()
        camera.data.ortho_scale = ortho
        scene.render.filepath = str(WORK / f'environment-sample-v003-{asset}-{view}.png')
        bpy.ops.render.render(write_still=True)
for p in protected:
    assert hashlib.sha256(p.read_bytes()).hexdigest() == baseline[str(p.relative_to(ROOT))]
print('SHRUBS_V003', json.dumps(manifest, ensure_ascii=False))

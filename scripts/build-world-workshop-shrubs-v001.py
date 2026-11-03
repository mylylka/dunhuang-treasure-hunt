"""Normalize the supplied shrub group without rewriting its geometry, UVs or materials.

Run: /Applications/Blender.app/Contents/MacOS/Blender -b --python scripts/build-world-workshop-shrubs-v001.py
Only a GLTF root transform is added; the complete original BIN chunk is reused.
"""
import argparse
import copy
import hashlib
import json
import math
from pathlib import Path
import struct
import sys

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'art-source/world/models/workshop-shrubs/v001'
OUTPUT = ROOT / 'public/assets/world/workshop-shrubs/v001'
WORK = ROOT / 'work/world'
SOURCE = Path('/Users/liujing/Downloads/l统一团团三个小灌木.glb')
parser = argparse.ArgumentParser()
parser.add_argument('--skip-render', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
for folder in [ARCHIVE, OUTPUT, WORK]: folder.mkdir(parents=True, exist_ok=True)


def sha(data): return hashlib.sha256(data).hexdigest()


def preserve(path, data):
    if path.exists():
        if path.read_bytes() != data: raise RuntimeError('Refusing to overwrite a different archived original: ' + str(path))
    else: path.write_bytes(data)


def read_glb(data):
    if data[:4] != b'glTF': raise RuntimeError('Input is not GLB')
    chunks, offset = [], 12
    while offset < len(data):
        length, kind = struct.unpack_from('<II', data, offset)
        chunks.append((kind, data[offset + 8:offset + 8 + length]))
        offset += 8 + length
    document = json.loads(next(payload for kind, payload in chunks if kind == 0x4e4f534a))
    return document, chunks


def gltf_bounds():
    points = [obj.matrix_world @ vertex.co for obj in bpy.context.scene.objects if obj.type == 'MESH' for vertex in obj.data.vertices]
    # Blender's +Z up/-Y front corresponds to glTF's +Y up/+Z front.
    coordinates = [(p.x, p.z, -p.y) for p in points]
    lo = [min(p[i] for p in coordinates) for i in range(3)]
    hi = [max(p[i] for p in coordinates) for i in range(3)]
    return {'min': lo, 'max': hi, 'size': [hi[i] - lo[i] for i in range(3)], 'center': [(hi[i] + lo[i]) / 2 for i in range(3)]}


archived = ARCHIVE / 'l统一团团三个小灌木.glb'
if not SOURCE.exists() and archived.exists(): SOURCE = archived
source_bytes = SOURCE.read_bytes()
preserve(archived, source_bytes)
original, chunks = read_glb(source_bytes)
if len(original['scenes']) != 1 or original.get('animations'): raise RuntimeError('Unexpected scenes/animations; normalization needs a separate review')
binary = next(payload for kind, payload in chunks if kind == 0x004e4942)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(archived))
bpy.context.view_layer.update()
source_bounds = gltf_bounds()
scale = .85 / source_bounds['size'][1]
anchor = [source_bounds['center'][0], source_bounds['min'][1], source_bounds['center'][2]]
translation = [-value * scale for value in anchor]
document = copy.deepcopy(original)
scene_index = document.get('scene', 0)
original_roots = document['scenes'][scene_index]['nodes']
root_index = len(document['nodes'])
document['nodes'].append({'name': 'workshop-shrubs-root', 'children': original_roots,
                          'translation': translation, 'scale': [scale, scale, scale],
                          'extras': {'assetId': 'workshop-shrubs-v001', 'units': 'metres', 'up': '+Y', 'front': '+Z', 'targetHeight': .85}})
document['scenes'][scene_index]['nodes'] = [root_index]
json_bytes = json.dumps(document, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
json_bytes += b' ' * ((-len(json_bytes)) % 4)
output_chunks = [(0x4e4f534a, json_bytes)] + [(kind, payload) for kind, payload in chunks if kind != 0x4e4f534a]
length = 12 + sum(8 + len(payload) for _, payload in output_chunks)
runtime_bytes = struct.pack('<4sII', b'glTF', 2, length) + b''.join(struct.pack('<II', len(payload), kind) + payload for kind, payload in output_chunks)
runtime_path = OUTPUT / 'workshop-shrubs.glb'
runtime_path.write_bytes(runtime_bytes)

# Read back the normalized runtime, so the .blend and measured bounds match the delivered GLB.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(runtime_path))
bpy.context.view_layer.update()
normalized_bounds = gltf_bounds()
assert abs(normalized_bounds['min'][1]) < 0.00001
assert abs(normalized_bounds['max'][1] - .85) < 0.00001
assert abs(normalized_bounds['center'][0]) < 0.00001
assert abs(normalized_bounds['center'][2]) < 0.00001
loaded_doc, loaded_chunks = read_glb(runtime_bytes)
for key in ['meshes', 'accessors', 'bufferViews', 'buffers', 'materials', 'textures', 'images', 'samplers']:
    assert loaded_doc.get(key) == original.get(key), key + ' changed'
assert loaded_doc['nodes'][:-1] == original['nodes']
assert next(payload for kind, payload in loaded_chunks if kind == 0x004e4942) == binary

scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1
scene['asset_id'] = 'workshop-shrubs-v001'
scene['gltf_front'] = '+Z (Blender -Y)'
scene['processing'] = 'Uniform root transform only; original geometry, UVs, materials and image bytes preserved.'
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ARCHIVE / 'workshop-shrubs.blend'))

images = []
for image in original.get('images', []):
    view = original['bufferViews'][image['bufferView']]
    payload = binary[view.get('byteOffset', 0):view.get('byteOffset', 0) + view['byteLength']]
    pixels = list(struct.unpack_from('>II', payload, 16)) if payload.startswith(b'\x89PNG\r\n\x1a\n') else list(bpy.data.images.get(image.get('name', '')).size) if bpy.data.images.get(image.get('name', '')) else None
    images.append({'name': image.get('name'), 'mimeType': image.get('mimeType'), 'pixels': pixels, 'bytes': len(payload), 'sha256': sha(payload), 'preservedByteForByte': True})
triangle_count = sum(original['accessors'][p['indices']]['count'] // 3 for m in original['meshes'] for p in m['primitives'])
manifest = {
    'version': 'v001', 'date': '2026-11-02', 'assetId': 'workshop-shrubs-v001',
    'source': {'originalPath': str(SOURCE), 'archive': str(archived.relative_to(ROOT)), 'bytes': len(source_bytes), 'sha256': sha(source_bytes), 'byteIdentical': archived.read_bytes() == source_bytes},
    'runtime': {'path': str(runtime_path.relative_to(ROOT)), 'bytes': len(runtime_bytes), 'sha256': sha(runtime_bytes), 'bounds': normalized_bounds, 'units': 'metres', 'up': '+Y', 'front': '+Z', 'groundY': 0},
    'blend': str((ARCHIVE / 'workshop-shrubs.blend').relative_to(ROOT)),
    'normalization': {'method': 'One new root with uniform scale and translation; all original nodes and resource arrays unchanged.', 'uniformScale': scale, 'sourceAnchor': anchor, 'translation': translation, 'yawDegrees': 0, 'sourceBounds': source_bounds,
                      'frontEvidence': 'Organic three-shrub group has no built architectural front. Original yaw is retained; +Z is the presentation convention, checked with one offline preview.'},
    'geometry': {'originalMeshNodes': len([n for n in original['nodes'] if 'mesh' in n]), 'meshes': len(original['meshes']), 'triangles': triangle_count, 'materials': len(original.get('materials', [])), 'images': len(images), 'animations': len(original.get('animations', []))},
    'images': images,
    'materialPolicy': 'All original PBR and KHR_materials_specular JSON is preserved exactly, including original double-sided flags. No recoloring, texture resampling, repainting or material simplification.',
    'validation': {'sourceArchiveBytesIdentical': True, 'originalNodesUnchanged': True, 'geometryUVBufferBytesIdentical': True, 'materialsTexturesImagesUnchanged': True, 'runtimeHeightWithin0_01mm': True, 'runtimeGroundWithin0_01mm': True, 'binarySha256': sha(binary)},
    'integration': {'note': 'Import this GLB and preserve the root transform/children. Orient the entire asset at its parent. +Z is its front; use Y-axis -90deg to face source -X.', 'boundingBoxSize': normalized_bounds['size'], 'floorAnchor': [0, 0, 0], 'suggestedCollider': 'One original mesh contains the complete group. Retain its new root transform; place the whole group, do not independently reposition individual shrubs. Use the actual group bounds only if a static collision proxy is required.'},
    'previews': []
}

if not args.skip_render:
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 800
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.exposure = 0
    scene.world = bpy.data.worlds.new('preview-world')
    scene.world.use_nodes = True
    background = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
    background.inputs['Color'].default_value = (.42, .46, .50, 1)
    background.inputs['Strength'].default_value = .65
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.005))
    floor = bpy.context.object
    floor.name = 'preview-only-floor'
    material = bpy.data.materials.new('preview-only-matte-sand')
    material.diffuse_color = (.65, .55, .42, 1)
    floor.data.materials.append(material)
    for name, location, power, size in [('key', (-3, -4, 5), 550, 4), ('fill', (4, -1, 3), 350, 3), ('rim', (0, 3, 4), 450, 3)]:
        bpy.ops.object.light_add(type='AREA', location=location)
        light = bpy.context.object
        light.name = 'preview-only-' + name
        light.data.energy = power
        light.data.shape = 'DISK'
        light.data.size = size
        light.rotation_euler = (Vector((0, 0, .7)) - light.location).to_track_quat('-Z', 'Y').to_euler()
    for name, location in [('front', (2.5, -4, 2.2))]:
        bpy.ops.object.camera_add(location=location)
        camera = bpy.context.object
        camera.name = 'preview-only-' + name
        camera.data.type = 'ORTHO'
        camera.data.ortho_scale = max(normalized_bounds['size']) * 1.4
        camera.rotation_euler = (Vector((0, 0, .425)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
        scene.camera = camera
        preview = WORK / f'workshop-shrubs-v001-{name}.png'
        scene.render.filepath = str(preview)
        bpy.ops.render.render(write_still=True)
        manifest['previews'].append(str(preview.relative_to(ROOT)))

(ARCHIVE / 'export-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print('WORKSHOP_SHRUBS_NORMALIZED ' + json.dumps({'runtime': manifest['runtime'], 'geometry': manifest['geometry'], 'scale': scale, 'sourceBounds': source_bounds, 'previews': manifest['previews']}, ensure_ascii=False))

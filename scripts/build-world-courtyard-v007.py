"""Derive the first-gallery workshop from v006 with measured proxy bounds.

python3 scripts/prepare-courtyard-workshop-v007.py
blender -b --python scripts/build-world-courtyard-v007.py
"""
import hashlib
import json
import math
from pathlib import Path
import struct

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source/world/models/courtyard/v007'
OUTPUT = ROOT / 'public/assets/world/courtyard/v007'
CONTENT = ROOT / 'src/content/world'
PREVIOUS = ROOT / 'art-source/world/models/courtyard/v006/courtyard.blend'
LAYOUT = CONTENT / 'courtyard-hall-v007.json'
TABLE = 'hall-v003-workbench'
DISPLAY = 'hall-v003-pattern-display'
RACK = 'hall-v003-pigment-rack'
PAPER = 'hall-v003-workshop-paper-art'
DISPLAY_ART = 'hall-v003-pattern-display-art'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def blender_point(x, z):
    return Vector((x + 12, 2 - z, 0))


def source_point(point):
    return point.x - 12, point.z, 2 - point.y


def bounds(objects):
    points = [source_point(obj.matrix_world @ vertex.co) for obj in objects for vertex in obj.data.vertices]
    return {'min': [round(min(p[i] for p in points), 6) for i in range(3)],
            'max': [round(max(p[i] for p in points), 6) for i in range(3)]}


def center(box):
    return {axis: round((lower + upper) / 2, 6)
            for axis, lower, upper in zip('xyz', box['min'], box['max'])}


def mesh_in(group):
    matches = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and obj.get('semanticGroup') == group]
    if len(matches) != 1:
        raise ValueError(f'Expected one v006 mesh for {group}, found {len(matches)}.')
    return matches[0]


def place(objects, before, after, yaw=0, scale=1):
    transform = (Matrix.Translation(blender_point(*after)) @ Matrix.Rotation(yaw, 4, 'Z')
                 @ Matrix.Scale(scale, 4) @ Matrix.Translation(-blender_point(*before)))
    for obj in objects:
        obj.matrix_world = transform @ obj.matrix_world


def footprint(x, z, half_width, half_depth, yaw=0):
    c, s = math.cos(yaw), math.sin(yaw)
    return [[round(x + c * u + s * v, 6), round(z - s * u + c * v, 6)]
            for u, v in [(-half_width, -half_depth), (half_width, -half_depth),
                         (half_width, half_depth), (-half_width, half_depth)]]


def texture(material, path, name):
    nodes = [node for node in material.node_tree.nodes if node.type == 'TEX_IMAGE']
    if len(nodes) != 1:
        raise ValueError(f'Expected one base color texture on {material.name}.')
    image = bpy.data.images.load(str(path))
    image.name = name
    image.pack()
    nodes[0].image = image


def save_layout(layout, solids, artwork, tabletop):
    layout.update(version='v007', status='measured-export')
    polygons = {
        TABLE: footprint(-19, -3.45, 1.65, .7),
        DISPLAY: footprint(-20.7, .50, .4, 1.05, math.radians(210)),
        RACK: footprint(-23.05, -1.85, .257106 * 1.5, .72457 * 1.5),
    }
    for key in ('cameraBoxes', 'collisionBoxes'):
        for box in layout[key]:
            if box['id'] in solids:
                box.update(solids[box['id']])
    for solid in layout['playerSolids']:
        identifier = solid['id']
        if identifier in solids:
            a, b = solids[identifier]['min'], solids[identifier]['max']
            solid.update(minX=a[0], maxX=b[0], minZ=a[2], maxZ=b[2], height=b[1], polygon=polygons[identifier])
    layout['workbench'].update(yaw=0, bounds=solids[TABLE])
    layout['display'].update(z=.50, height=solids[DISPLAY]['max'][1], width=2.10, depth=.80,
                             bounds=solids[DISPLAY], artWidth=1.68, artHeight=layout['display']['artHeight'] * 2,
                             artBounds=artwork, artCenter=center(artwork), imagePixels=[494, 426])
    layout['pigmentRack'].update(height=solids[RACK]['max'][1], bounds=solids[RACK], scaleMultiplier=1.5)
    layout['workshop'].update(takeColorPoint={'x': -21.65, 'z': -1.85},
                              takeColorPath=[{'x': x, 'z': z} for x, z in
                                             [(-18.9, -1.3), (-18.9, -1.7), (-21.65, -1.7), (-21.65, -1.85)]])
    layout['workshop']['paper'].update(bounds=tabletop, center=center(tabletop), imagePixels=[494, 426])
    LAYOUT.write_text(json.dumps(layout, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main():
    previous_layout = CONTENT / 'courtyard-hall-v006.json'
    previous_glb = ROOT / 'public/assets/world/courtyard/v006/courtyard.glb'
    prior = {str(path.relative_to(ROOT)): digest(path) for path in (PREVIOUS, previous_layout, previous_glb)}
    textures = json.loads((SOURCE / 'workshop-textures.json').read_text(encoding='utf-8'))
    bpy.ops.wm.open_mainfile(filepath=str(PREVIOUS))
    table, display, rack, paper, art = [mesh_in(group) for group in (TABLE, DISPLAY, RACK, PAPER, DISPLAY_ART)]
    place((table, paper), (-19, -3.45), (-19, -3.45), yaw=math.radians(-10))
    place((display, art), (-20.7, .35), (-20.7, .50), scale=2)
    place((rack,), (-23.05, -1.85), (-23.05, -1.85), scale=1.5)
    texture(art.data.materials[0], OUTPUT / textures['board']['file'], 'courtyard-v007-display-board')
    for index, material in enumerate(rack.data.materials):
        if material.name not in textures['cabinet']['materials']:
            continue
        key = material.name
        pale = material.copy()
        pale.name = 'courtyard-v007-pigment-' + key.replace('_', '-')
        texture(pale, SOURCE / textures['cabinet']['materials'][key]['file'], pale.name)
        rack.data.materials[index] = pale

    bpy.context.view_layer.update()
    solids = {identifier: bounds((obj,)) for identifier, obj in [(TABLE, table), (DISPLAY, display), (RACK, rack)]}
    if any(abs(box['min'][1]) > 1e-5 for box in solids.values()):
        raise ValueError('Furniture must keep its original floor contact.')
    save_layout(json.loads(previous_layout.read_text(encoding='utf-8')), solids, bounds((art,)), bounds((paper,)))

    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            obj.select_set(True)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / 'courtyard.blend'))
    output = OUTPUT / 'courtyard.glb'
    bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', use_selection=True,
                              export_yup=True, export_apply=True, export_animations=False,
                              export_extras=True, export_image_format='JPEG', export_jpeg_quality=92)
    raw = output.read_bytes()
    length = struct.unpack_from('<I', raw, 12)[0]
    gltf = json.loads(raw[20:20 + length])
    manifest = {'version': 'v007', 'geometryLayout': str(LAYOUT.relative_to(ROOT)), 'workshopTextures': 'workshop-textures.json',
                'runtime': {'path': str(output.relative_to(ROOT)), 'sha256': digest(output), 'bytes': len(raw),
                            'meshes': len(gltf['meshes']), 'materials': len(gltf['materials'])},
                'priorAssets': prior, 'furnitureBounds': solids, 'tabletopArt': bounds((paper,)), 'uprightArt': bounds((art,))}
    (SOURCE / 'export-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    if any(digest(ROOT / path) != sha for path, sha in prior.items()):
        raise ValueError('v006 inputs were modified.')
    print('COURTYARD_V007_EXPORT', json.dumps(manifest, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()

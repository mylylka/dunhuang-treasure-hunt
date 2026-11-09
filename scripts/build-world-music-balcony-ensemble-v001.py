"""Assemble the supplied rigid musicians without editing their meshes.

Blender -b --python-exit-code 1 --python scripts/build-world-music-balcony-ensemble-v001.py
"""

import hashlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art-source/world/models/music-balcony-ensemble/v001"
ASSET = "music-balcony-ensemble/v001/ensemble.glb"
OUTPUT = ROOT / "public/assets/world" / ASSET
PLACEMENT = ROOT / "src/content/world/music-balcony-ensemble-v001.json"
FLOOR = 7.915375
MAT_TOP = .014
STAGE = (34.4725, 44.7801, -21.95, -18.16)

# Anchors refer to the body or seat, excluding the side stool and instrument.
# Source coordinates use glTF Y-up, facing the audience along positive Z.
# id, target height, source x/z, hall x/z, yaw toward audience
PLAYERS = (
    ("pipa", 1.89, (.064, -.106), (36.72, -19.26), 0),
    ("flute", 2.16, (-.018, 0), (38.19, -19.5408), 0),
    ("zheng", 1.88, (0, -.207), (40.40, -19.3356), 0),
    ("waist-drum", 2.02, (-.015, -.045), (42.70, -19.4328), 0),
)


def source_to_blender(x, y, z):
    return Vector((x, -z, y))


def point_bounds(points):
    return (
        [min(point[i] for point in points) for i in range(3)],
        [max(point[i] for point in points) for i in range(3)],
    )


def bounds_in_blender(mesh):
    return point_bounds([mesh.matrix_world @ vertex.co for vertex in mesh.data.vertices])


def xyz_bounds(mesh):
    coordinates = [mesh.matrix_world @ vertex.co for vertex in mesh.data.vertices]
    return point_bounds([(p.x, p.z, -p.y) for p in coordinates])


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
root = bpy.data.objects.new("music-balcony-ensemble", None)
bpy.context.collection.objects.link(root)
selected = [root]
placements = []
originals = {}
for name, height, anchor, station, angle in PLAYERS:
    path = SOURCE / f"{name}.glb"
    originals[path.name] = digest(path)
    existing = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    imported = [obj for obj in bpy.context.scene.objects if obj not in existing]
    (mesh,) = [obj for obj in imported if obj.type == "MESH"]
    original_matrix = mesh.matrix_world.copy()
    lo, hi = bounds_in_blender(mesh)
    factor = height / (hi[2] - lo[2])
    group = bpy.data.objects.new(f"ensemble-{name}", None)
    group["playerId"] = name
    bpy.context.collection.objects.link(group)
    group.parent = root
    group.matrix_basis = (
        Matrix.Translation(source_to_blender(station[0], MAT_TOP, station[1]))
        @ Matrix.Rotation(math.radians(angle), 4, "Z")
        @ Matrix.Scale(factor, 4)
        @ Matrix.Translation(-source_to_blender(anchor[0], lo[2], anchor[1]))
    )
    mesh.parent = group
    mesh.matrix_parent_inverse = Matrix.Identity(4)
    mesh.matrix_basis = original_matrix
    mesh.name = f"ensemble-{name}-mesh"
    bpy.context.view_layer.update()
    minimum, maximum = xyz_bounds(mesh)
    assert abs(minimum[1] - MAT_TOP) < 2e-5, name
    placements.append({
        "id": name, "anchor": [station[0], FLOOR + MAT_TOP, station[1]],
        "height": height, "scale": factor, "yawDegrees": angle,
        "min": [round(minimum[0], 6), round(minimum[1] + FLOOR, 6), round(minimum[2], 6)],
        "max": [round(maximum[0], 6), round(maximum[1] + FLOOR, 6), round(maximum[2], 6)],
    })
    selected.extend((group, mesh))
    for obj in imported:
        if obj != mesh:
            bpy.data.objects.remove(obj, do_unlink=True)

left = min(p["min"][0] for p in placements) - .16
right = max(p["max"][0] for p in placements) + .16
back = min(p["min"][2] for p in placements) - .13
front = max(p["max"][2] for p in placements) + .13
assert STAGE[0] < left < right < STAGE[1] and STAGE[2] < back < front < STAGE[3], (left, right, back, front)
assert back - STAGE[2] > 1.35, "Keep the rear walkway open."
for a, b in zip(placements, placements[1:]):
    assert a["max"][0] + .04 < b["min"][0], (a["id"], b["id"])

vertices, faces, material_indices = [], [], []


def panel(x0, x1, z0, z1, y, material):
    first = len(vertices)
    vertices.extend(source_to_blender(x, y, z) for x, z in [(x0, z0), (x0, z1), (x1, z1), (x1, z0)])
    faces.append(tuple(range(first, first + 4)))
    material_indices.append(material)


def border(lo, hi, far, near, width, material):
    panel(lo, hi, far, far + width, MAT_TOP, material)
    panel(lo, hi, near - width, near, MAT_TOP, material)
    panel(lo, lo + width, far + width, near - width, MAT_TOP, material)
    panel(hi - width, hi, far + width, near - width, MAT_TOP, material)


# One woven mat with a warm selvedge and a narrow ochre band.
border(left, right, back, front, .055, 0)
border(left + .055, right - .055, back + .055, front - .055, .018, 1)
panel(left + .073, right - .073, back + .073, front - .073, MAT_TOP, 2)
for x0, z0, x1, z1 in [
    (left, back, left, front), (left, front, right, front),
    (right, front, right, back), (right, back, left, back),
]:
    i = len(vertices)
    vertices.extend((source_to_blender(x0, 0, z0), source_to_blender(x0, MAT_TOP, z0),
                     source_to_blender(x1, MAT_TOP, z1), source_to_blender(x1, 0, z1)))
    faces.append((i, i + 3, i + 2, i + 1))
    material_indices.append(0)

fabric = bpy.data.meshes.new("woven-mat")
fabric.from_pydata(vertices, [], faces)
fabric.update()
for name, color in (
    ("mat-russet-selvedge", (.29, .111, .057, 1)),
    ("mat-ochre-thread", (.56, .34, .115, 1)),
    ("mat-muted-teal-wool", (.105, .216, .178, 1)),
):
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Roughness"].default_value = .94
    fabric.materials.append(material)
for polygon, index in zip(fabric.polygons, material_indices):
    polygon.material_index = index
mat = bpy.data.objects.new("ensemble-woven-mat", fabric)
mat.parent = root
bpy.context.collection.objects.link(mat)
selected.append(mat)

bpy.ops.object.select_all(action="DESELECT")
for obj in selected:
    obj.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / "ensemble.blend"))
bpy.ops.export_scene.gltf(filepath=str(OUTPUT), export_format="GLB", use_selection=True,
                          export_extras=True, export_animations=False)
assert all(digest(SOURCE / name) == value for name, value in originals.items())

data = {
    "asset": ASSET,
    "floor": {"interior": FLOOR, "exterior": FLOOR},
    "mat": {"min": [left, FLOOR, back], "max": [right, FLOOR + MAT_TOP, front]},
    "players": placements,
}
PLACEMENT.write_text(json.dumps(data, indent=2) + "\n")
(SOURCE / "asset-manifest.json").write_text(json.dumps({
    "originalSha256": originals, "ensembleSha256": digest(OUTPUT), "bytes": OUTPUT.stat().st_size,
    "placement": str(PLACEMENT.relative_to(ROOT)),
}, indent=2) + "\n")

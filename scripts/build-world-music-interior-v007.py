"""Add the missing gallery edge rail to the editable v006 model.

Blender -b --python-exit-code 1 --python scripts/build-world-music-interior-v007.py
"""

import bpy
import hashlib
import json
import math
from pathlib import Path

from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / "art-source/world/models/music-interior"
RUNTIME = ROOT / "public/assets/world"
SOURCE = MODELS / "v006/music-pavilion.blend"
LAYOUT = ROOT / "src/content/world/music-interior-v005.json"
SOLIDS = ROOT / "src/content/world/music-interior-solids-v005.json"
layout = json.loads(LAYOUT.read_text())
runtime_asset = layout["assets"]["building"]
destination = MODELS / "v007"
output = RUNTIME / runtime_asset
rail_id = "music-gallery-east-guardrail"
rail = next(item for item in layout["guardrails"] if item["id"] == rail_id)
solid = next(item for item in json.loads(SOLIDS.read_text())["solids"] if item["id"] == rail_id)
assert solid == {key: rail[key] for key in ("id", "min", "max")}
min_x, floor_y, start_z = rail["min"]
max_x, top_y, end_z = rail["max"]
center_x = (min_x + max_x) / 2
half_depth = (max_x - min_x) / 2
start_post = start_z + half_depth
end_post = end_z - half_depth


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_position(point):
    return (point.x + 46, point.z, -point.y - 9)


def blender_position(point):
    x, y, z = point
    return Vector((x - 46, -z - 9, y))


def vertex_bounds(obj):
    points = [source_position(obj.matrix_world @ vert.co) for vert in obj.data.vertices]
    return tuple(min(p[i] for p in points) for i in range(3)), tuple(max(p[i] for p in points) for i in range(3))


originals = {path: sha(path) for path in (SOURCE, RUNTIME / "music-interior/v006/music-pavilion.glb")}
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
bpy.context.preferences.filepaths.save_version = 0
objects = [
    obj for obj in bpy.context.scene.objects
    if obj.type == "MESH" and len(obj.data.vertices)
    and not any(obj.get(key) for key in ("excludeV4", "excludeV5", "excludeV004", "excludeV005", "excludeV006"))
]
front = "music-upper-guardrail-front"
post_template = bpy.data.objects[front + "-post"]
template_start = sum(limit[0] for limit in vertex_bounds(post_template)) / 2
template_end = sum(limit[0] for limit in vertex_bounds(bpy.data.objects[front + "-post.001"])) / 2
template_plane = sum(limit[2] for limit in vertex_bounds(post_template)) / 2
bay_templates = [
    obj for obj in objects
    if obj.name.startswith(front + "-diamond") and vertex_bounds(obj)[1][0] < template_end
]
assert len(bay_templates) == 6
new = []


def copy_piece(template, name, map_position):
    data = template.data.copy()
    for vert in data.vertices:
        vert.co = blender_position(map_position(*source_position(template.matrix_world @ vert.co)))
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj["semanticGroup"] = template["semanticGroup"]
    new.append(obj)


# Rotate the original timber and diamond joinery to face along the marked
# gallery edge. Adjacent top and bottom beams meet the existing short rail.
post_count = math.ceil((end_post - start_post) / (template_end - template_start) - 1e-3) + 1
posts = [start_post + (end_post - start_post) * i / (post_count - 1) for i in range(post_count)]
for z_center in posts:
    copy_piece(post_template, rail_id + "-post",
               lambda x, y, z: (center_x - (z - template_plane), y, z_center + x - template_start))

for start, end in zip(posts, posts[1:]):
    scale = (end - start) / (template_end - template_start)
    for template in bay_templates:
        copy_piece(template, rail_id + "-diamond",
                   lambda x, y, z: (center_x - (z - template_plane), y, start + (x - template_start) * scale))

for suffix in ("-rail", "-rail.001"):
    template = bpy.data.objects[front + suffix]
    lo, hi = vertex_bounds(template)
    scale = (end_z - start_z) / (hi[0] - lo[0])
    copy_piece(template, rail_id + "-beam",
               lambda x, y, z: (center_x - (z - template_plane), y, start_z + (x - lo[0]) * scale))

for obj in new:
    lo, hi = vertex_bounds(obj)
    assert all(rail["min"][i] - 1e-5 <= lo[i] <= hi[i] <= rail["max"][i] + 1e-5 for i in range(3)), obj.name
assert abs(top_y - floor_y - 1.05) < 1e-6
objects.extend(new)
destination.mkdir(parents=True, exist_ok=True)
output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
for obj in objects:
    obj.hide_set(False)
    obj.hide_render = False
    obj.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(destination / "music-pavilion.blend"))

graph = bpy.context.evaluated_depsgraph_get()
batches = {}
for obj in objects:
    data = bpy.data.meshes.new_from_object(obj.evaluated_get(graph), preserve_all_data_layers=True, depsgraph=graph)
    copy = bpy.data.objects.new("export-" + obj.name, data)
    bpy.context.collection.objects.link(copy)
    copy.matrix_world = obj.matrix_world.copy()
    group = obj.get("semanticGroup", "architecture")
    copy["semanticGroup"] = group
    copy["decorationOnly"] = bool(obj.get("decorationOnly", False))
    batches.setdefault((group, tuple(mat.name for mat in data.materials)), []).append(copy)

exported = []
for (group, materials), batch in batches.items():
    bpy.ops.object.select_all(action="DESELECT")
    for obj in batch:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = batch[0]
    if len(batch) > 1:
        bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = group + "--" + materials[0]
    exported.append(obj)

bpy.ops.object.select_all(action="DESELECT")
for obj in exported:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", use_selection=True,
                          export_animations=False, export_extras=True, export_yup=True)
assert all(sha(path) == original for path, original in originals.items())
manifest = {
    "version": "music-interior-v007",
    "source": str(SOURCE.relative_to(ROOT)),
    "runtimeAsset": runtime_asset,
    "runtimeOrigin": [46, 0, -9],
    "rail": rail,
    "postCentersZ": posts,
    "addedObjects": len(new),
    "meshBatches": len(exported),
    "bytes": output.stat().st_size,
    "sha256": sha(output),
    "protectedOriginals": {str(path.relative_to(ROOT)): digest for path, digest in originals.items()},
}
(destination / "export-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
print("V007_EXPORTED", manifest["bytes"], manifest["sha256"], "posts", len(posts))

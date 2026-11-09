"""Remove the upper middle pillar from both current pavilion variants.

Blender -b --python-exit-code 1 --python scripts/build-world-music-balcony-open-v001.py
"""

import hashlib
import json
from pathlib import Path

import bmesh
import bpy


ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / "art-source/world/models"
PUBLIC = ROOT / "public/assets/world"
VARIANTS = (("music-pavilion", "v005", "v006"), ("music-interior", "v007", "v008"))
EXCLUSIONS = ("excludeV4", "excludeV5", "excludeV004", "excludeV005", "excludeV006")

# Each porch material batch also contains geometry from the end pillars and
# the continuous eaves or railing. Select only the measured connected pieces.
PIECES = {
    "porch--stone": [("base", (39.1705, 7.8755, -18.16), (40.2145, 8.2815, -17.44))],
    "porch--wood": [("shaft", (39.3735, 8.2815, -18.02), (40.0115, 12.7765, -17.58))],
    "porch--ochre": [("capital", (39.22125, 12.675, -18.11), (40.16375, 12.936, -17.49))],
    "porch--teal": [
        ("left-green-bracket", (38.953, 12.82725, -18.025), (39.678, 13.07375, -17.575)),
        ("right-green-bracket", (39.707, 12.82725, -18.025), (40.432, 13.07375, -17.575)),
    ],
    "porch--wood-light": [
        ("left-wood-bracket", (38.61225, 13.023, -18.065), (39.55475, 13.255, -17.535)),
        ("right-wood-bracket", (39.83025, 13.023, -18.065), (40.77275, 13.255, -17.535)),
    ],
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_position(obj, vertex):
    point = obj.matrix_world @ vertex.co
    return (point.x + 46, point.z, -point.y - 9)


def find_components(mesh):
    edges = [[] for _ in mesh.vertices]
    for a, b in (edge.vertices for edge in mesh.edges):
        edges[a].append(b)
        edges[b].append(a)
    remaining = set(range(len(edges)))
    while remaining:
        seed = remaining.pop()
        component = [seed]
        for index in component:
            for neighbor in edges[index]:
                if neighbor in remaining:
                    remaining.remove(neighbor)
                    component.append(neighbor)
        yield component


def match_bounds(points, lower, upper):
    return all(
        abs(min(point[i] for point in points) - lower[i]) < .0001
        and abs(max(point[i] for point in points) - upper[i]) < .0001
        for i in range(3)
    )


def remove_pillar():
    removed = []
    for object_name, pieces in PIECES.items():
        obj = bpy.data.objects[object_name]
        matches = {}
        for indices in find_components(obj.data):
            points = [source_position(obj, obj.data.vertices[i]) for i in indices]
            for label, lower, upper in pieces:
                if match_bounds(points, lower, upper):
                    assert label not in matches, (obj.name, label)
                    matches[label] = indices
        assert len(matches) == len(pieces), (obj.name, matches.keys())
        mesh = bmesh.new()
        mesh.from_mesh(obj.data)
        mesh.verts.ensure_lookup_table()
        vertices = [mesh.verts[index] for indices in matches.values() for index in indices]
        bmesh.ops.delete(mesh, geom=vertices, context="VERTS")
        mesh.to_mesh(obj.data)
        mesh.free()
        obj.data.update()
        removed.extend(matches)
    return removed


def export_batches(objects, output):
    graph = bpy.context.evaluated_depsgraph_get()
    batches = {}
    for obj in objects:
        data = bpy.data.meshes.new_from_object(obj.evaluated_get(graph), preserve_all_data_layers=True, depsgraph=graph)
        copy = bpy.data.objects.new("export-" + obj.name, data)
        bpy.context.collection.objects.link(copy)
        copy.matrix_world = obj.matrix_world.copy()
        group = obj.get("semanticGroup", "architecture")
        copy["semanticGroup"] = group
        if "decorationOnly" in obj:
            copy["decorationOnly"] = obj["decorationOnly"]
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
    return len(exported)


for region, old, new in VARIANTS:
    source = MODELS / region / old / "music-pavilion.blend"
    previous = PUBLIC / region / old / "music-pavilion.glb"
    destination = MODELS / region / new
    output = PUBLIC / region / new / "music-pavilion.glb"
    originals = {path: sha(path) for path in (source, previous)}
    bpy.ops.wm.open_mainfile(filepath=str(source))
    bpy.context.preferences.filepaths.save_version = 0
    bpy.context.view_layer.update()
    removed = remove_pillar()
    assert len(removed) == 7
    objects = [
        obj for obj in bpy.context.scene.objects
        if obj.type == "MESH" and len(obj.data.vertices) and not any(obj.get(key) for key in EXCLUSIONS)
    ]
    destination.mkdir(parents=True, exist_ok=True)
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.hide_set(False)
        obj.hide_render = False
        obj.select_set(True)
    bpy.ops.wm.save_as_mainfile(filepath=str(destination / "music-pavilion.blend"))
    batch_count = export_batches(objects, output)
    assert all(sha(path) == digest for path, digest in originals.items())
    manifest = {
        "version": new, "runtimeOrigin": [46, 0, -9],
        "removedUpperMiddlePillarPieces": removed, "meshBatches": batch_count,
        "runtimeAsset": str(output.relative_to(PUBLIC)),
        "sha256": sha(output), "bytes": output.stat().st_size,
        "protectedOriginals": {str(path.relative_to(ROOT)): digest for path, digest in originals.items()},
    }
    (destination / "export-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print("BALCONY_OPEN", manifest["runtimeAsset"], batch_count, manifest["bytes"])

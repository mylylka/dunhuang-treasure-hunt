"""Build the connected-world distant mountain with Blender's background runner."""

import hashlib
import json
import statistics
from pathlib import Path

import bpy
from mathutils.bvhtree import BVHTree


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/assets/world/mogao-upper/v003/mountain.glb"
OUTPUT = SOURCE.with_name("mountain-distant-v001.glb")
MANIFEST = ROOT / "art-source/world/models/mogao-upper/v003/mountain-distant-v001-manifest.json"
REVISION = "horizontal-eroded-strata-v001"
RATIO = .04


def sha(path):
    with path.open("rb") as file:
        return hashlib.file_digest(file, "sha256").hexdigest()


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
mountain, = [obj for obj in bpy.context.scene.objects if obj.get("geometryRevision") == REVISION]
mountain.data.calc_loop_triangles()
original_triangles = len(mountain.data.loop_triangles)
original_bounds = tuple(tuple(corner) for corner in mountain.bound_box)
sample_step = max(1, len(mountain.data.vertices) // 6000)
samples = [mountain.data.vertices[i].co.copy() for i in range(0, len(mountain.data.vertices), sample_step)]
original_matrix = mountain.matrix_world.copy()

bpy.ops.object.select_all(action="DESELECT")
mountain.select_set(True)
bpy.context.view_layer.objects.active = mountain
decimate = mountain.modifiers.new("Distant silhouette", "DECIMATE")
decimate.ratio = RATIO
decimate.use_collapse_triangulate = True
bpy.ops.object.modifier_apply(modifier=decimate.name)
mountain.data.calc_loop_triangles()
assert mountain.matrix_world == original_matrix
bounds_delta = max(abs(a - b) for before, after in zip(original_bounds, mountain.bound_box) for a, b in zip(before, after))
assert bounds_delta < .25, bounds_delta
tree = BVHTree.FromObject(mountain, bpy.context.evaluated_depsgraph_get())
distances = [tree.find_nearest(point)[3] for point in samples]
assert max(distances) < .6, max(distances)
for material in mountain.data.materials:
    # Distant colour uses the same runtime sandstone shader. The original
    # tangent-space maps are kept in the close-up asset.
    for node in list(material.node_tree.nodes):
        if node.type in {"TEX_IMAGE", "NORMAL_MAP"}:
            material.node_tree.nodes.remove(node)

bpy.ops.export_scene.gltf(filepath=str(OUTPUT), export_format="GLB", use_selection=True, export_extras=True,
    export_texcoords=False, export_tangents=False)
assert OUTPUT.stat().st_size < 1_000_000
MANIFEST.write_text(json.dumps({
    "source": {"path": str(SOURCE.relative_to(ROOT)), "sha256": sha(SOURCE), "bytes": SOURCE.stat().st_size,
        "triangles": original_triangles},
    "derived": {"path": str(OUTPUT.relative_to(ROOT)), "sha256": sha(OUTPUT), "bytes": OUTPUT.stat().st_size,
        "triangles": len(mountain.data.loop_triangles)},
    "geometryRevision": REVISION,
    "generator": {"path": str(Path(__file__).relative_to(ROOT)), "blender": bpy.app.version_string, "collapseRatio": RATIO},
    "measurement": {"maxBoundsDeltaMeters": bounds_delta, "surfaceSampleCount": len(samples),
        "medianSurfaceDeltaMeters": statistics.median(distances), "maxSurfaceDeltaMeters": max(distances)},
    "usage": "Connected-world scenery at a distance. Only the original mesh is used on the cliff approach.",
}, indent=2) + "\n")

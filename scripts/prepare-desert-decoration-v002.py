#!/usr/bin/env python3
"""Derive mobile distance tiers from the registered desert models."""

from __future__ import annotations

import argparse
import gzip
from itertools import combinations
import json
from math import ceil, sqrt
from pathlib import Path
import runpy
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory


TOOLS = runpy.run_path(str(Path(__file__).with_name("prepare-desert-decoration-v001.py")))
ROOT = TOOLS["ROOT"]
ART = ROOT / "art-source/world/desert-decoration"
PUBLIC = ROOT / "public/assets/world/desert-decoration"
MANIFEST = ART / "v002/manifest.json"
BOUNDS = ROOT / "src/content/world/desert-decoration-bounds-v002.json"
JOBS = {
    "w01b-lod": ("w01b", 414),
    "shrub-2-lod": ("shrub-2", 454),
    "t01-lod": ("t01", 940),
    "t02-lod": ("t02", 1500),
    "s02-lod": ("s02", 280),
    "t03": ("t03", 3480),
    "t03-lod": ("t03", 940),
}
GEOMETRY_RECIPES = {
    "w01b-lod": "Allocate 45% of the triangle budget to folded leaves, 34% to stems and 21% to seed heads",
    "shrub-2-lod": "Keep the original runtime origin and the leaf coverage with up to 454 triangles",
}


def prepare(source_dir, blender):
    from asset_intake import AssetIntake, VAULT_PREFIX, digest, publish_file, read_json, staged_path, write_json

    intake = AssetIntake(ROOT)
    with intake.transaction():
        if read_json(MANIFEST):
            verify()
            return
        previous = read_json(ART / "v001/manifest.json")
        t03_source_name = next(row["sourceFile"] for row in previous["catalogEntries"] if row["number"] == 26)
        source_file = source_dir / t03_source_name
        sources = {asset["id"]: asset["sourceVault"] for asset in previous["assets"]}
        t03_sha = digest(source_file)
        sources["t03"] = intake.original(
            VAULT_PREFIX + t03_sha, local=source_file, validate=TOOLS["read_glb"],
        ).reference
        with TemporaryDirectory(prefix="dunhuang-desert-tiers-") as directory:
            stage = Path(directory)
            worker_jobs = []
            for asset_id, (base, triangles) in JOBS.items():
                textured = base == "shrub-2"
                source = stage / f"{asset_id}.source.glb"
                source.symlink_to(
                    PUBLIC / "v001/shrub-2.glb" if textured else intake.resolve_reference(sources[base])
                )
                worker_jobs.append({
                    "id": asset_id, "base": base, "source": str(source), "triangles": triangles,
                    "textured": textured,
                })
            spec = stage / "tiers.json"
            spec.write_text(json.dumps(worker_jobs))
            subprocess.run([
                str(blender), "--background", "--factory-startup", "--python-exit-code", "1",
                "--python", str(Path(__file__).resolve()), "--", "--blender-jobs", str(spec),
            ], check=True)
            assets = []
            for asset_id, (base, max_triangles) in JOBS.items():
                model = stage / f"{asset_id}.glb"
                destination = PUBLIC / "v002" / model.name
                description = TOOLS["describe_glb"](model)
                if (description["primitiveCount"] != 1 or description["extensionsRequired"]
                        or description["triangles"] > max_triangles
                        or description["alphaModes"] != ["OPAQUE"]):
                    raise ValueError(f"Model exceeds the tier budget: {asset_id}, {description}")
                sha = digest(model)
                assets.append({
                    "id": asset_id, "baseId": base,
                    "url": destination.relative_to(ROOT / "public").as_posix(),
                    "originalPath": sources[base], "sourceSha256": sources[base].removeprefix(VAULT_PREFIX),
                    "bytes": model.stat().st_size, "sha256": sha,
                    "gzipBytesEstimate": len(gzip.compress(model.read_bytes(), mtime=0)),
                    **description, **TOOLS["runtime_geometry"](model),
                    "textureBytesEstimate": sum(
                        ceil(texture["width"] * texture["height"] * 4 * 4 / 3)
                        for texture in description["textures"]
                    ),
                })
                if asset_id in GEOMETRY_RECIPES:
                    assets[-1]["geometryRecipe"] = GEOMETRY_RECIPES[asset_id]
            if sum(a["bytes"] for a in assets + previous["assets"]) > 6 * 1024 * 1024:
                raise ValueError("The desert props and distance tiers exceed 6 MiB.")
            for asset in assets:
                destination = ROOT / "public" / asset["url"]
                with staged_path(destination.parent) as adjacent:
                    shutil.copyfile(stage / destination.name, adjacent)
                    publish_file(adjacent, destination, asset["sha256"])
            write_json(BOUNDS, TOOLS["runtime_bounds"]([a for a in assets if a["id"] == "t03"]))
            write_json(MANIFEST, {"version": 2, "assets": assets})
    verify()


def verify():
    from asset_intake import digest, read_json

    version = read_json(MANIFEST)
    if not version:
        raise ValueError("No distance tiers have been registered.")
    for asset in version["assets"]:
        path = ROOT / "public" / asset["url"]
        if digest(path) != asset["sha256"]:
            raise ValueError(f"Registered model bytes changed: {path}")
        print(f'{asset["id"]:14} {asset["triangles"]:4} tris {asset["bytes"]:7} bytes')
    print(f'New distance tiers and broad poplar: {sum(a["bytes"] for a in version["assets"])} bytes.')


def weld_mesh(obj):
    import bmesh

    editable = bmesh.new()
    editable.from_mesh(obj.data)
    bmesh.ops.remove_doubles(editable, verts=list(editable.verts), dist=0.0000001)
    return editable


def rebuild_foliage(obj, count):
    """Retain outer leaves and select the remaining leaves evenly through the crown."""
    mesh = weld_mesh(obj)
    leaves = []
    for center in mesh.verts:
        if (len(center.link_faces) != 4 or len(center.link_edges) != 4
                or any(edge.is_boundary for edge in center.link_edges)):
            continue
        corners = [edge.other_vert(center).co.copy() for edge in center.link_edges]
        material = center.link_faces[0].material_index
        leaves.append((center.co.copy(), corners, material))
    if len(leaves) * 4 != len(mesh.faces):
        raise ValueError(f"Unexpected leaf topology: {obj.name}")
    mesh.free()

    positions = [leaf[0] for leaf in leaves]
    # Select extreme leaves first so the silhouette keeps its breadth.
    outstanding = dict.fromkeys(
        boundary(range(len(leaves)), key=lambda index: positions[index][axis])
        for axis in range(3) for boundary in (min, max)
    )
    selections = []
    nearest = [float("inf")] * len(leaves)
    groups = [0] * len(leaves)
    for _ in range(min(count, len(leaves))):
        if outstanding:
            selected = next(iter(outstanding))
            del outstanding[selected]
        else:
            selected = max(range(len(leaves)), key=nearest.__getitem__)
        selections.append(selected)
        center = positions[selected]
        for i, old in enumerate(nearest):
            distance = (positions[i] - center).length_squared
            if distance < old:
                nearest[i] = distance
                groups[i] = selected

    representation = dict.fromkeys(selections, 0)
    for selected in groups:
        representation[selected] += 1
    points, faces = [], []
    for selected in selections:
        center, corners, _material = leaves[selected]
        triangle = max(
            combinations(corners, 3),
            key=lambda pts: (pts[1] - pts[0]).cross(pts[2] - pts[0]).length_squared,
        )
        scale = min(3.0, sqrt(representation[selected]) * 1.14)
        index = len(points)
        points.extend(center + (corner - center) * scale for corner in triangle)
        faces.append((index, index + 1, index + 2))
    obj.data.clear_geometry()
    obj.data.from_pydata(points, [], faces)
    for face, selected in zip(obj.data.polygons, selections):
        face.material_index = leaves[selected][2]


def export_models(spec):
    import bpy
    from mathutils import Vector

    for job in json.loads(spec.read_text()):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=job["source"], import_pack_images=True)
        objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
        for obj in objects:
            transform = obj.matrix_world.copy()
            obj.parent = None
            obj.matrix_world = transform
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        minimum, maximum = TOOLS["bounds_for_vertices"](objects)
        origin = Vector(((minimum.x + maximum.x) / 2, (minimum.y + maximum.y) / 2, minimum.z))
        if job["textured"]:
            # This source is already in the original runtime origin.
            origin.zero()

        target = job["triangles"]
        leaves = next((obj for obj in objects if "Foliage" in obj.name), None)
        branches = [obj for obj in objects if obj != leaves]
        for obj in branches:
            editable = weld_mesh(obj)
            editable.to_mesh(obj.data)
            editable.free()
        if leaves is not None:
            rebuild_foliage(leaves, round(target * .62))
        used = len(leaves.data.polygons) if leaves is not None else 0
        if job["base"] == "w01b":
            simplify_reeds(branches, target)
        else:
            TOOLS["decimate"](branches, target - used)
        if job["textured"]:
            for image in bpy.data.images:
                if max(image.size) > 128:
                    factor = 128 / max(image.size)
                    image.scale(*(max(1, round(size * factor)) for size in image.size))
                    image.update()
        else:
            TOOLS["bake_material_colors"](objects)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects) > 1:
            bpy.ops.object.join()
        obj = bpy.context.view_layer.objects.active
        obj.name = obj.data.name = job["id"]
        obj.data.validate()
        use_vertices = {loop.vertex_index for loop in obj.data.loops}
        for vertex in obj.data.vertices:
            vertex.co -= origin
        # Match the base footprint with separate scales around the fixed origin.
        # This preserves root alignment even if simplification changed an extremum.
        low, high = tuple(
            Vector(tuple(select(obj.data.vertices[index].co[axis] for index in use_vertices) for axis in range(3)))
            for select in (min, max)
        )
        center = minimum.z - origin.z
        for vertex in obj.data.vertices:
            point = vertex.co
            for axis in (0, 1):
                if point[axis] < 0 and low[axis] < 0:
                    point[axis] *= (minimum[axis] - origin[axis]) / low[axis]
                elif point[axis] > 0 and high[axis] > 0:
                    point[axis] *= (maximum[axis] - origin[axis]) / high[axis]
            point.z = center + (point.z - low.z) * (maximum.z - minimum.z) / (high.z - low.z)
        obj.data.update()
        bpy.ops.export_scene.gltf(
            filepath=str(spec.parent / f'{job["id"]}.glb'),
            export_format="GLB", use_selection=True,
            export_image_format="JPEG" if job["textured"] else "NONE",
            export_jpeg_quality=78, export_texcoords=job["textured"],
            export_vertex_color="NONE" if job["textured"] else "ACTIVE",
            export_all_vertex_colors=False,
        )


def simplify_reeds(objects, target):
    # Keep the bent leaf ribbons and tall stems readable across dense banks.
    groups = (("Folded_Leaves", .45), ("Curved_Stems", .34), ("Open_Branched_Panicle", .21))
    for name, fraction in groups:
        TOOLS["decimate"]([obj for obj in objects if name in obj.name], round(target * fraction))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path)
    parser.add_argument("--blender", type=Path, default=TOOLS["BLENDER"])
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    if args.verify:
        verify()
    elif args.source_dir:
        prepare(args.source_dir, args.blender)
    else:
        parser.error("Provide --source-dir or --verify.")


if __name__ == "__main__":
    if "--blender-jobs" in sys.argv:
        export_models(Path(sys.argv[sys.argv.index("--blender-jobs") + 1]))
    else:
        main()

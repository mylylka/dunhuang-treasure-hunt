#!/usr/bin/env python3
"""Register desert props and derive the runtime GLBs using local Blender."""

from __future__ import annotations

import argparse
import gzip
import io
import json
import math
import re
import shutil
import struct
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MATERIAL_ROOT = Path("art-source/world/desert-decoration/v001")
RUNTIME_ROOT = Path("public/assets/world/desert-decoration/v001")
RUNTIME_BOUNDS = ROOT / "src/content/world/desert-decoration-bounds-v001.json"
BLENDER = Path("/Applications/Blender.app/Contents/MacOS/Blender")
CURVED_POPLAR_RECIPE = "Preserve four outline vertices of each leaf, simplify branch tubes"
ASSETS = {
    2: ("c01b", "A", None),
    3: ("c02", "D", None),
    6: ("c03b", "A", None),
    7: ("c04", "A", None),
    9: ("g02", "A", None),
    10: ("r01", "A", None),
    11: ("r02", "D", None),
    12: ("r03", "D", None),
    13: ("r04", "D", None),
    21: ("s02", "B", None),
    22: ("s04b", "A", None),
    24: ("t01", "B", None),
    25: ("t02", "B", 8900),
    29: ("w01b", "B", None),
    50: ("rock-shrub-3", "C", 4300),
    56: ("shrub-2", "C", 3600),
}


def read_glb(path):
    raw = path.read_bytes()
    magic, version, total, json_size, json_type = struct.unpack_from("<4sIIII", raw)
    binary_size, binary_type = struct.unpack_from("<II", raw, 20 + json_size)
    if (
        (magic, version, total, json_type, binary_type)
        != (b"glTF", 2, len(raw), 0x4E4F534A, 0x004E4942)
        or 28 + json_size + binary_size != total
    ):
        raise ValueError(f"Invalid binary glTF: {path}")
    document = json.loads(raw[20 : 20 + json_size])
    if len(document.get("buffers", [])) != 1 or any(
        "uri" in item for category in ("buffers", "images")
        for item in document.get(category, [])
    ):
        raise ValueError(f"Expected a self-contained GLB: {path}")
    return document, raw[28 + json_size :]


def describe_glb(path):
    from PIL import Image

    document, binary = read_glb(path)
    accessors = document["accessors"]
    primitives = [
        primitive for mesh in document["meshes"] for primitive in mesh["primitives"]
    ]
    textures = []
    for image in document.get("images", []):
        view = document["bufferViews"][image["bufferView"]]
        start = view.get("byteOffset", 0)
        with Image.open(io.BytesIO(binary[start : start + view["byteLength"]])) as picture:
            textures.append({"width": picture.width, "height": picture.height,
                             "format": picture.format, "bytes": view["byteLength"]})
    return {
        "triangles": sum(
            accessors[p["indices"] if "indices" in p else p["attributes"]["POSITION"]]["count"] // 3
            for p in primitives if p.get("mode", 4) == 4
        ),
        "meshCount": len(document["meshes"]),
        "primitiveCount": len(primitives),
        "materialCount": len(document.get("materials", [])),
        "alphaModes": sorted({
            material.get("alphaMode", "OPAQUE") for material in document.get("materials", [])
        }),
        "textures": textures,
        "extensionsRequired": document.get("extensionsRequired", []),
    }


def runtime_geometry(path):
    document, _binary = read_glb(path)
    primitive = document["meshes"][0]["primitives"][0]
    positions = document["accessors"][primitive["attributes"]["POSITION"]]
    lower, upper = positions["min"], positions["max"]
    return {
        **dict(zip(("width", "height", "depth"), (hi - lo for lo, hi in zip(lower, upper)))),
        "bounds": {"min": lower, "max": upper},
    }


def catalog_names(pdf):
    text = subprocess.check_output(["pdftotext", "-layout", str(pdf), "-"], text=True)
    entries = {}
    previews = []
    for line in text.splitlines():
        if line.strip().endswith(".png"):
            previews = re.split(r"\s{2,}", line.strip())
        if numbers := re.findall(r"#(\d+)", line):
            if len(numbers) != len(previews):
                raise ValueError(f"The PDF layout does not match {numbers}.")
            entries.update(zip(map(int, numbers), previews))
            previews = []
    if set(entries) != set(range(1, 59)):
        raise ValueError("The catalog must contain the original 58 numbered previews.")
    return entries


def disposition(number):
    if number in ASSETS:
        return "adopt", None
    if number in (15, 16, 18, 19, 20):
        return "hold", "S01 硬切面组首版暂缓"
    if number == 17:
        return "duplicate", "与第18项的GLB字节相同"
    if number == 30:
        return "hold", "沿用现有远景驼队"
    if number == 48:
        return "hold", "模型网格带有大面积矩形底板"
    if number == 41:
        return "reuse", "与现行乐舞坊主树 GLB 字节一致"
    if number in (40, 43):
        return "hold", "庭院先复用现行主树并补低景"
    return "hold", "同类备选"


def prepare(blender, source_dir, catalog):
    from asset_intake import (
        AssetIntake, VAULT_PREFIX, digest, publish_file, read_json, staged_path, write_json,
    )

    entries = catalog_names(catalog)
    intake = AssetIntake(ROOT)
    manifest_path = ROOT / MATERIAL_ROOT / "manifest.json"
    with intake.transaction():
        if manifest := read_json(manifest_path):
            verify(manifest)
            return
        rows = []
        for number, preview in sorted(entries.items()):
            filename = preview.removesuffix(".png").replace("_预览", "") + ".glb"
            path = source_dir / filename
            status, reason = disposition(number)
            if not path.is_file():
                if status == "adopt":
                    raise FileNotFoundError(path)
                rows.append({"number": number, "preview": preview, "sourceFile": filename,
                             "status": "missing"})
                continue
            row = {
                "number": number, "preview": preview, "sourceFile": filename,
                "status": status, "sourceSha256": digest(path), "sourceBytes": path.stat().st_size,
                "sourceModel": describe_glb(path),
            }
            if reason:
                row["reason"] = reason
            if status == "reuse":
                row.update(zone="C", runtimePath="music-courtyard-tree/v001/music-courtyard-tree.glb")
            rows.append(row)

        catalog_sha = digest(catalog)
        catalog_original = intake.original(
            VAULT_PREFIX + catalog_sha, local=catalog, validate=validate_pdf,
        )
        with tempfile.TemporaryDirectory(prefix="dunhuang-desert-props-") as stage:
            stage = Path(stage)
            jobs = []
            for row in rows:
                if row["status"] != "adopt":
                    continue
                asset_id, zone, target = ASSETS[row["number"]]
                original = intake.original(
                    VAULT_PREFIX + row["sourceSha256"], local=source_dir / row["sourceFile"],
                    validate=read_glb,
                )
                # Keep the file extension Blender expects while still reading the verified bytes.
                source = stage / f"{asset_id}.source.glb"
                source.symlink_to(original.path)
                row.update(assetId=asset_id, zone=zone, originalPath=original.reference,
                           originalSha256=original.sha256)
                jobs.append({
                    "id": asset_id, "source": str(source),
                    "plainColors": not row["sourceModel"]["textures"], "target": target,
                })
            specs = stage / "jobs.json"
            specs.write_text(json.dumps(jobs))
            subprocess.run([
                str(blender), "--background", "--factory-startup", "--python-exit-code", "1",
                "--python", str(Path(__file__).resolve()), "--", "--blender-jobs", str(specs),
            ], check=True)

            geometry = json.loads((stage / "geometry.json").read_text())
            assets = []
            for row in rows:
                if row["status"] != "adopt":
                    continue
                asset_id = row["assetId"]
                staged = stage / f"{asset_id}.glb"
                description = describe_glb(staged)
                if (description["primitiveCount"] != 1 or description["alphaModes"] != ["OPAQUE"]
                        or description["extensionsRequired"]
                        or any(max(t["width"], t["height"]) > 512 for t in description["textures"])):
                    raise ValueError(f"Unexpected runtime mesh, material or textures: {asset_id}")
                byte_count = staged.stat().st_size
                staged_hash = digest(staged)
                url = (RUNTIME_ROOT.relative_to("public") / staged.name).as_posix()
                row["url"] = url
                assets.append({
                    "id": asset_id, "zone": row["zone"], "url": url,
                    "sourceVault": row["originalPath"],
                    "sha256": staged_hash, "bytes": byte_count,
                    "gzipBytesEstimate": len(gzip.compress(staged.read_bytes(), mtime=0)),
                    **description, **runtime_geometry(staged), **geometry["assets"][asset_id],
                    "textureBytesEstimate": sum(
                        math.ceil(texture["width"] * texture["height"] * 4 * 4 / 3)
                        for texture in description["textures"]
                    ),
                })
                if asset_id == "t02":
                    assets[-1]["geometryRecipe"] = CURVED_POPLAR_RECIPE

            byte_total = sum(asset["bytes"] for asset in assets)
            if byte_total > 6 * 1024 * 1024:
                raise ValueError(f"Runtime GLBs exceed the 6 MiB asset budget: {byte_total} bytes.")
            for asset in assets:
                destination = ROOT / "public" / asset["url"]
                destination.parent.mkdir(parents=True, exist_ok=True)
                # stage and the workspace can be on different filesystems.
                with staged_path(destination.parent) as adjacent:
                    shutil.copyfile(stage / f"{asset['id']}.glb", adjacent)
                    publish_file(adjacent, destination, asset["sha256"])
            manifest = {
                "version": 1, "catalog": {"file": catalog.name,
                    "originalPath": catalog_original.reference, "originalSha256": catalog_sha},
                "blender": geometry["blender"],
                "totalBytes": byte_total,
                "totalGzipBytesEstimate": sum(a["gzipBytesEstimate"] for a in assets),
                "assets": assets, "catalogEntries": rows,
                "reuse": ["现行乐舞坊主树", "现行远景驼队"],
            }
            write_json(RUNTIME_BOUNDS, runtime_bounds(assets))
            write_json(manifest_path, manifest)
            verify(manifest)


def validate_pdf(path):
    with path.open("rb") as source:
        if source.read(5) != b"%PDF-":
            raise ValueError(f"Invalid PDF: {path}")


def runtime_bounds(assets):
    return {
        asset["id"]: {axis: round(asset[axis], 6) for axis in ("width", "height", "depth")}
        for asset in assets
    }


def verify(manifest):
    from asset_intake import digest, read_json

    if not manifest:
        raise ValueError("No desert asset manifest has been generated.")
    if read_json(RUNTIME_BOUNDS) != runtime_bounds(manifest["assets"]):
        raise ValueError("Runtime placement bounds differ from the registered derivatives.")
    for asset in manifest["assets"]:
        path = ROOT / "public" / asset["url"]
        if path.stat().st_size != asset["bytes"] or digest(path) != asset["sha256"]:
            raise ValueError(f"Runtime GLB differs from the registered derivative: {path}")
        if any(asset[key] != value for key, value in runtime_geometry(path).items()):
            raise ValueError(f"Runtime GLB bounds differ from the registered derivative: {path}")
        print(
            f'{asset["id"]:14} {asset["bytes"]:7} bytes, {asset["triangles"]:5} triangles, '
            f'{asset["width"]:.5f} × {asset["height"]:.5f} × {asset["depth"]:.5f} m'
        )
    print(f'{len(manifest["assets"])} GLBs, {manifest["totalBytes"]} raw bytes, '
          f'{manifest["totalGzipBytesEstimate"]} gzip estimate.')


def blender_jobs(spec):
    import bpy
    from mathutils import Vector

    assets = {}
    for job in json.loads(spec.read_text()):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=job["source"], import_pack_images=True)
        meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
        if not meshes:
            raise ValueError(f"No mesh in {job['source']}")
        for obj in meshes:
            transform = obj.matrix_world.copy()
            obj.parent = None
            obj.matrix_world = transform
        bpy.ops.object.select_all(action="DESELECT")
        for obj in meshes:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = meshes[0]
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        original_bounds = bounds_for_vertices(meshes)

        if job["target"]:
            if job["id"] == "t02":
                simplify_poplar(meshes, job["target"])
            else:
                decimate(meshes, job["target"])

        if job["plainColors"]:
            bake_material_colors(meshes)
        else:
            for image in bpy.data.images:
                width, height = image.size
                if max(width, height) > 512:
                    factor = 512 / max(width, height)
                    image.scale(max(1, round(width * factor)), max(1, round(height * factor)))
                    image.update()

        bpy.context.view_layer.objects.active = meshes[0]
        if len(meshes) > 1:
            bpy.ops.object.join()
        obj = bpy.context.view_layer.objects.active
        obj.name = job["id"]
        mesh = obj.data
        mesh.name = job["id"]
        if job["id"] == "t02":
            # Collapsed branch tubes can leave coincident end faces.
            mesh.validate()
        # Normalize the contact point and preserve the supplied dimensions after simplification.
        low, high = bounds_for_vertices([obj])
        middle = Vector(((high[0] + low[0]) / 2, (high[1] + low[1]) / 2, low[2]))
        extent = original_bounds[1] - original_bounds[0]
        scale = [extent[i] / (high[i] - low[i]) for i in range(3)]
        for vertex in mesh.vertices:
            vertex.co = Vector(tuple((vertex.co[i] - middle[i]) * scale[i] for i in range(3)))
        mesh.update()
        # Blender Z-up becomes glTF +Y-up, with inverted old Y.
        assets[job["id"]] = {"sourceDimensions": [extent.x, extent.z, extent.y]}
        bpy.ops.export_scene.gltf(
            filepath=str(spec.parent / f'{job["id"]}.glb'),
            export_format="GLB", use_selection=True,
            export_image_format="NONE" if job["plainColors"] else "JPEG",
            export_jpeg_quality=80, export_texcoords=not job["plainColors"],
            export_vertex_color="ACTIVE" if job["plainColors"] else "NONE",
            export_all_vertex_colors=False,
        )
    output = {"blender": bpy.app.version_string, "assets": assets}
    (spec.parent / "geometry.json").write_text(json.dumps(output))


def decimate(objects, target):
    import bpy

    source_count = sum(len(obj.data.polygons) for obj in objects)
    ratio = min(1, target / source_count)
    for obj in objects:
        bpy.context.view_layer.objects.active = obj
        modifier = obj.modifiers.new("Reduce triangles", "DECIMATE")
        modifier.ratio = ratio
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)


def simplify_poplar(objects, target):
    import bmesh

    foliage, branches = sorted(objects, key=lambda obj: obj.name)
    if "Foliage_Clusters" not in foliage.name or "Angular_Branches" not in branches.name:
        raise ValueError("The curved poplar must contain the audited leaf and branch meshes.")

    for obj in (foliage, branches):
        mesh = bmesh.new()
        mesh.from_mesh(obj.data)
        # Imported flat-shaded faces can have separate vertices along the same edge.
        bmesh.ops.remove_doubles(mesh, verts=list(mesh.verts), dist=0.0000001)
        if obj == foliage:
            # Each leaf is a four-triangle fan. Preserve its four outline vertices.
            centers = [
                vertex for vertex in mesh.verts
                if len(vertex.link_faces) == 4 and len(vertex.link_edges) == 4
                and all(not edge.is_boundary for edge in vertex.link_edges)
            ]
            if len(centers) * 4 != len(mesh.faces):
                raise ValueError("The curved poplar no longer has the audited four-face leaf topology.")
            bmesh.ops.dissolve_verts(mesh, verts=centers)
            bmesh.ops.triangulate(mesh, faces=list(mesh.faces))
        mesh.to_mesh(obj.data)
        mesh.free()

    decimate([branches], target - len(foliage.data.polygons))


def bounds_for_vertices(objects):
    from mathutils import Vector

    vertices = [vertex.co for obj in objects for vertex in obj.data.vertices]
    return (
        Vector(tuple(min(point[axis] for point in vertices) for axis in range(3))),
        Vector(tuple(max(point[axis] for point in vertices) for axis in range(3))),
    )


def bake_material_colors(objects):
    import bpy

    material = bpy.data.materials.new("Desert ground props")
    material.use_nodes = True
    shared = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    shared.inputs["Base Color"].default_value = (1, 1, 1, 1)
    shared.inputs["Roughness"].default_value = 0.88
    material.use_backface_culling = all(
        slot.material.use_backface_culling for obj in objects for slot in obj.material_slots
    )
    for obj in objects:
        mesh = obj.data
        colors = []
        for slot in obj.material_slots:
            source = slot.material
            color = source.diffuse_color
            if source.use_nodes:
                shader = next(node for node in source.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
                color = shader.inputs["Base Color"].default_value
            colors.append((*color[:3], 1))
        attribute = mesh.color_attributes.new(name="Sand tones", type="BYTE_COLOR", domain="CORNER")
        for face in mesh.polygons:
            color = colors[face.material_index]
            for loop_index in face.loop_indices:
                attribute.data[loop_index].color = color
            face.material_index = 0
        mesh.color_attributes.active_color = attribute
        mesh.materials.clear()
        mesh.materials.append(material)


def main():
    from asset_intake import read_json

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path)
    parser.add_argument("--catalog", type=Path)
    parser.add_argument("--blender", type=Path, default=BLENDER)
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    if args.verify:
        verify(read_json(ROOT / MATERIAL_ROOT / "manifest.json"))
    elif args.source_dir and args.catalog:
        prepare(args.blender, args.source_dir, args.catalog)
    else:
        parser.error("--source-dir and --catalog are required unless using --verify.")


if __name__ == "__main__":
    if "--blender-jobs" in sys.argv:
        blender_jobs(Path(sys.argv[sys.argv.index("--blender-jobs") + 1]))
    else:
        main()

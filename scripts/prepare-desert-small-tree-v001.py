#!/usr/bin/env python3
"""Prepare the original small tree for close and distant 3D views."""

from __future__ import annotations

import argparse
import base64
import gzip
import hashlib
import json
import math
from pathlib import Path
import runpy
import struct
import subprocess
import sys
from tempfile import TemporaryDirectory


ROOT = Path(__file__).resolve().parents[1]
RUNTIME_PATH = Path("public/assets/world/desert-decoration/v004/small-tree-2.glb")
FALLBACK_PATH = Path("src/content/world/desert-decoration-small-tree-v004.ts")
BOUNDS_PATH = Path("src/content/world/desert-decoration-bounds-v004.json")
MANIFEST_PATH = Path("art-source/world/desert-decoration/v004/manifest.json")
SMALL_TREE_ID = "small-tree-2"
BLENDER = Path("/Applications/Blender.app/Contents/MacOS/Blender")
NEAR_TARGET = 4650
FAR_TARGET = 1320
NEAR_GZIP_LIMIT = 140 * 1024


def blender_worker(spec):
    import bmesh
    import bpy

    for job in json.loads(spec.read_text()):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=job["source"], import_pack_images=True, merge_vertices=True)
        obj, = [item for item in bpy.context.scene.objects if item.type == "MESH"]
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        mesh = obj.data
        original_min = [min(vertex.co[axis] for vertex in mesh.vertices) for axis in range(3)]
        original_max = [max(vertex.co[axis] for vertex in mesh.vertices) for axis in range(3)]
        editable = bmesh.new()
        editable.from_mesh(mesh)
        bmesh.ops.remove_doubles(editable, verts=list(editable.verts), dist=.000003)
        editable.to_mesh(mesh)
        editable.free()
        modifier = obj.modifiers.new("Reduce distant surface detail", "DECIMATE")
        modifier.ratio = job["target"] / len(mesh.polygons)
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        mesh.validate()
        active = {loop.vertex_index for loop in mesh.loops}
        low = [min(mesh.vertices[i].co[axis] for i in active) for axis in range(3)]
        high = [max(mesh.vertices[i].co[axis] for i in active) for axis in range(3)]
        center = [(original_min[i] + original_max[i]) / 2 for i in range(3)]
        center[2] = original_min[2]
        for vertex in mesh.vertices:
            for axis in range(3):
                scale = (original_max[axis] - original_min[axis]) / (high[axis] - low[axis])
                fitted = (vertex.co[axis] - low[axis]) * scale + original_min[axis]
                vertex.co[axis] = fitted - center[axis]
        mesh.update()
        for image in bpy.data.images:
            if max(image.size) > job["texture"]:
                factor = job["texture"] / max(image.size)
                image.scale(*(max(1, round(size * factor)) for size in image.size))
                image.update()
        bpy.ops.export_scene.gltf(
            filepath=job["destination"], export_format="GLB", use_selection=True,
            export_image_format="JPEG", export_jpeg_quality=78,
            export_texcoords=True, export_vertex_color="NONE",
        )


def get_surface(path, tools):
    document, binary = tools["TOOLS"]["read_glb"](path)
    primitive = document["meshes"][0]["primitives"][0]
    return document, binary, primitive


def near_glb(source, tools, *, asset_id=SMALL_TREE_ID, generator="Dunhuang small tree derivative"):
    import numpy as np

    document, binary, primitive = get_surface(source, tools)
    image = document["images"][0]
    image_view = document["bufferViews"][image["bufferView"]]
    start = image_view.get("byteOffset", 0)
    texture = binary[start:start + image_view["byteLength"]]
    accessors = []
    views = []
    output = bytearray()

    def append(raw, target=None, stride=None):
        if len(output) % 4:
            output.extend(bytes(-len(output) % 4))
        view = {"buffer": 0, "byteOffset": len(output), "byteLength": len(raw)}
        if target is not None:
            view["target"] = target
        if stride is not None:
            view["byteStride"] = stride
        views.append(view)
        output.extend(raw)
        return len(views) - 1

    attributes = {}
    for name, precision, dtype, component, stride in (
        ("POSITION", 32767, "<i2", 5122, 8),
        ("NORMAL", 127, "i1", 5120, 4),
        ("TEXCOORD_0", 65535, "<u2", 5123, 4),
    ):
        coords = tools["accessor"](document, binary, primitive["attributes"][name])
        if np.abs(coords).max() > (1 + 1e-5) or name == "TEXCOORD_0" and coords.min() < -1e-5:
            raise ValueError(f"{name} cannot be encoded into the normalized {asset_id} mesh.")
        components = coords.shape[1]
        array = np.zeros((len(coords), stride // np.dtype(dtype).itemsize), dtype=dtype)
        array[:, :components] = np.rint(np.clip(coords, -1, 1) * precision)
        attribute = {
            "bufferView": append(array.tobytes(), 34962, stride),
            "componentType": component, "count": len(coords),
            "type": f"VEC{components}", "normalized": True,
        }
        if name == "POSITION":
            attribute["min"] = array[:, :3].min(axis=0).tolist()
            attribute["max"] = array[:, :3].max(axis=0).tolist()
        attributes[name] = len(accessors)
        accessors.append(attribute)

    indices = tools["accessor"](document, binary, primitive["indices"]).reshape(-1)
    if indices.max() >= 65536:
        raise ValueError(f"{asset_id} does not fit 16-bit triangle indices.")
    index_slot = len(accessors)
    accessors.append({
        "bufferView": append(indices.astype("<u2").tobytes(), 34963),
        "componentType": 5123, "count": len(indices), "type": "SCALAR",
    })
    gltf = {
        "asset": {"version": "2.0", "generator": generator},
        "extensionsUsed": ["KHR_mesh_quantization"], "extensionsRequired": ["KHR_mesh_quantization"],
        "scene": 0, "scenes": [{"nodes": [0]}], "nodes": [{"name": asset_id, "mesh": 0}],
        "meshes": [{"name": asset_id, "primitives": [
            {"attributes": attributes, "indices": index_slot, "material": 0},
        ]}],
        "materials": document["materials"], "textures": [{"source": 0}],
        "images": [{"bufferView": append(texture), "mimeType": "image/jpeg"}],
        "bufferViews": views, "accessors": accessors, "buffers": [{"byteLength": len(output)}],
    }
    raw = json.dumps(gltf, separators=(",", ":")).encode()
    raw += b" " * (-len(raw) % 4)
    output.extend(bytes(-len(output) % 4))
    return (struct.pack("<4sIIII", b"glTF", 2, 28 + len(raw) + len(output), len(raw), 0x4E4F534A)
            + raw + struct.pack("<II", len(output), 0x004E4942) + output)


def fallback_text(path, tools, *, fit_bounds=None, **source_options):
    import numpy as np

    document, binary, primitive = get_surface(path, tools)
    attrs = primitive["attributes"]
    positions = tools["accessor"](document, binary, attrs["POSITION"])
    if fit_bounds is not None:
        minimum, maximum = (np.asarray(edge) for edge in fit_bounds)
        positions = minimum + (positions - positions.min(axis=0)) / np.ptp(positions, axis=0) * (maximum - minimum)
    uvs = tools["accessor"](document, binary, attrs["TEXCOORD_0"])
    colors = tools["sample_texture"](document, binary, 0, uvs, {})
    # The scene lights remain responsible for shading the fallback itself.
    indices = tools["accessor"](document, binary, primitive["indices"]).reshape(-1)
    keys = np.round(positions, 5)
    points, assignment, counts = np.unique(keys, axis=0, return_inverse=True, return_counts=True)
    linear = np.stack([
        np.bincount(assignment, weights=colors[:, axis]) / counts for axis in range(3)
    ], axis=1)
    return fallback_source(points, linear, assignment[indices], **source_options), len(indices) // 3


def fallback_source(positions, colors, indices, *, export_name="SMALL_TREE_2_OVERLOOK",
                    description="original small-tree GLB", generator="prepare-desert-small-tree-v001.py"):
    import numpy as np

    coords = np.asarray(positions).astype(np.float64).round(5).reshape(-1)
    shades = np.asarray(colors).astype(np.float64).round(3).reshape(-1)
    triangles = np.asarray(indices).reshape(-1)
    quantized = np.rint(coords * 65535).astype("<i4").astype("<u2")
    rgb = np.rint(shades * 255).astype("u1")
    # Group the high and low index bytes so HTTP compression can reuse runs.
    index_bytes = triangles.astype("<u2").view("u1").reshape(-1, 2).T.tobytes()
    encoded = base64.b64encode(quantized.tobytes() + rgb.tobytes() + index_bytes).decode("ascii")
    return f"""// Generated from the {description} by {generator}.
// XYZ shorts, linear RGB bytes, and two planes of triangle index bytes.
const bytes = Uint8Array.from(atob("{encoded}"), char => char.charCodeAt(0));
const view = new DataView(bytes.buffer);
const coordinateCount = {len(coords)};
const colorOffset = coordinateCount * 2;
const indexOffset = colorOffset + coordinateCount;
const indexCount = {len(triangles)};

export const {export_name} = {{
  positions: Array.from({{ length: coordinateCount }}, (_, i) => {{
    const offset = i * 2;
    const value = i % 3 === 1 ? view.getUint16(offset, true) : view.getInt16(offset, true);
    return value / 65535;
  }}),
  colors: Array.from({{ length: coordinateCount }}, (_, i) => bytes[colorOffset + i] / 255),
  indices: Array.from({{ length: indexCount }}, (_, i) =>
    bytes[indexOffset + i] | (bytes[indexOffset + indexCount + i] << 8),
  ),
}};
"""


def silhouette_scores(source, candidates, tools):
    import numpy as np
    from PIL import Image, ImageChops, ImageDraw

    meshes = []
    for path in [source, *candidates]:
        document, binary, primitive = get_surface(path, tools)
        points = tools["accessor"](document, binary, primitive["attributes"]["POSITION"])
        faces = tools["accessor"](document, binary, primitive["indices"]).reshape(-1, 3)
        meshes.append((points, faces))

    def render(points, faces, yaw):
        direction = np.asarray([math.sin(yaw), 0, math.cos(yaw)])
        right = np.asarray([math.cos(yaw), 0, -math.sin(yaw)])
        up = np.asarray([0, .991445, 0]) - direction * .130526
        projection = list(zip(100 + 148 * (points @ right), 174 - 148 * (points @ up)))
        image = Image.new("1", (200, 200))
        draw = ImageDraw.Draw(image)
        for face in faces:
            draw.polygon([projection[index] for index in face], fill=1)
        return image

    scores = [[], []]
    for direction in range(8):
        original, *reduced = [render(*mesh, direction * math.pi / 4) for mesh in meshes]
        for result, candidate in zip(scores, reduced):
            same = ImageChops.logical_and(original, candidate).convert("L").histogram()[255]
            extent = ImageChops.logical_or(original, candidate).convert("L").histogram()[255]
            result.append(round(same / extent, 4))
    return {"near": scores[0], "fallback": scores[1]}


def verify():
    from asset_intake import digest, read_json

    manifest = read_json(ROOT / MANIFEST_PATH)
    if not manifest:
        raise ValueError("No prepared small tree has been registered.")
    for name in ("near", "fallback", "bounds"):
        asset = manifest[name]
        path = ROOT / asset["path"]
        if digest(path) != asset["sha256"] or path.stat().st_size != asset["bytes"]:
            raise ValueError(f"Registered tree derivative changed: {path}")
    print(json.dumps({name: manifest[name] for name in ("near", "fallback", "silhouette")}, indent=2))


def prepare(source, blender):
    from asset_intake import AssetIntake, VAULT_PREFIX, digest, publish_file, read_json, staged_path, write_json

    tools = runpy.run_path(str(Path(__file__).with_name("prepare-desert-tree-impostors-v001.py")))
    intake = AssetIntake(ROOT)
    with intake.transaction():
        if read_json(ROOT / MANIFEST_PATH):
            verify()
            return
        sha = digest(source)
        original = intake.original(VAULT_PREFIX + sha, local=source, validate=tools["TOOLS"]["read_glb"])
        document, _binary, primitive = get_surface(original.path, tools)
        accessor = document["accessors"][primitive["attributes"]["POSITION"]]
        bounds = dict(zip(("width", "height", "depth"), (
            hi - lo for lo, hi in zip(accessor["min"], accessor["max"])
        )))
        with TemporaryDirectory(prefix="dunhuang-small-tree-") as directory:
            stage = Path(directory)
            model = stage / "original.glb"
            model.symlink_to(original.path)
            near, far = stage / "near.glb", stage / "fallback.glb"
            spec = stage / "jobs.json"
            spec.write_text(json.dumps([
                {"source": str(model), "destination": str(path), "target": limit, "texture": texture}
                for path, limit, texture in ((near, NEAR_TARGET, 512), (far, FAR_TARGET, 256))
            ]))
            subprocess.run([
                str(blender), "--background", "--factory-startup", "--python-exit-code", "1",
                "--python", str(Path(__file__).resolve()), "--", "--blender-jobs", str(spec),
            ], check=True)
            near_data = near_glb(near, tools)
            far_code, far_triangles = fallback_text(far, tools)
            gzip_size = len(gzip.compress(near_data, compresslevel=3, mtime=0))
            near_doc, _bin, geometry = get_surface(near, tools)
            near_triangles = near_doc["accessors"][geometry["indices"]]["count"] // 3
            if gzip_size > NEAR_GZIP_LIMIT or near_triangles > 5000 or far_triangles > 1500:
                raise ValueError(f"Tree budget exceeded: {gzip_size} gzip bytes, {near_triangles}/{far_triangles} tris")
            bounds_content = (json.dumps({SMALL_TREE_ID: bounds}, indent=2) + "\n").encode()
            files = {
                "near": (RUNTIME_PATH, near_data),
                "fallback": (FALLBACK_PATH, far_code.encode()),
                "bounds": (BOUNDS_PATH, bounds_content),
            }
            record = {"version": 4, "id": SMALL_TREE_ID, "sourceName": source.name,
                      "originalPath": original.reference, "sourceSha256": original.sha256,
                      "sourceBytes": original.path.stat().st_size,
                      "sourceTriangles": document["accessors"][primitive["indices"]]["count"] // 3,
                      "silhouette": silhouette_scores(original.path, [near, far], tools)}
            for key, (relative, data) in files.items():
                key_hash = hashlib.sha256(data).hexdigest()
                record[key] = {"path": str(relative), "bytes": len(data), "sha256": key_hash}
                path = ROOT / relative
                with staged_path(path.parent) as adjacent:
                    adjacent.write_bytes(data)
                    publish_file(adjacent, path, key_hash)
            record["near"].update(gzip3Bytes=gzip_size, triangles=near_triangles, maxTexture=512)
            record["fallback"].update(
                triangles=far_triangles, gzipBytes=len(gzip.compress(far_code.encode(), mtime=0)),
            )
            write_json(ROOT / MANIFEST_PATH, record)
    verify()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path)
    parser.add_argument("--blender", type=Path, default=BLENDER)
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    if args.verify:
        verify()
    elif args.source:
        prepare(args.source, args.blender)
    else:
        parser.error("Pass --source or --verify.")


if __name__ == "__main__":
    if "--blender-jobs" in sys.argv:
        blender_worker(Path(sys.argv[sys.argv.index("--blender-jobs") + 1]))
    else:
        main()

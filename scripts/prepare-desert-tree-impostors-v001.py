#!/usr/bin/env python3
"""Render the original trees to one alpha WebP for low-cost distant views."""

from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import math
from pathlib import Path
import runpy
import re
import struct
import subprocess
from tempfile import TemporaryDirectory

import numpy as np
from PIL import Image

from asset_intake import AssetIntake, digest, read_json, write_json


TOOLS = runpy.run_path(str(Path(__file__).with_name("prepare-desert-decoration-v001.py")))
ROOT = TOOLS["ROOT"]
ART = ROOT / "art-source/world/desert-decoration"
MANIFEST = ART / "v003/tree-impostors.json"
METADATA = ROOT / "src/content/world/desert-tree-impostors-v001.ts"
TOWER_MANIFEST = ART / "v005/tower-tree-impostors.json"
TOWER_METADATA = ROOT / "src/content/world/desert-tower-tree-impostors-v001.ts"
TOWER_EXPORT = "DESERT_TOWER_TREE_IMPOSTORS"
TOWER_ASSETS = ("tower-tree-stylized", "tower-tree-broad")
ASSETS = ("t01", "t02", "t03", "tower-tree-stylized", "tower-tree-broad")
TILE, GUTTER, COLS, ELEVATION = 96, 4, 8, 7
ROWS = len(ASSETS)
SAMPLES = 2
BYTE_BUDGET = 80 * 1024
DATA_PREFIX = "data:image/webp;base64,"


def accessor(document, binary, index):
    descriptor = document["accessors"][index]
    view = document["bufferViews"][descriptor["bufferView"]]
    dtype = np.dtype({5121: "u1", 5123: "<u2", 5125: "<u4", 5126: "<f4"}[descriptor["componentType"]])
    channels = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[descriptor["type"]]
    result = np.ndarray(
        (descriptor["count"], channels), dtype=dtype, buffer=binary,
        offset=view.get("byteOffset", 0) + descriptor.get("byteOffset", 0),
        strides=(view.get("byteStride", dtype.itemsize * channels), dtype.itemsize),
    )
    if descriptor.get("normalized"):
        return result.astype(np.float64) / np.iinfo(dtype).max
    return result


def local_transform(node):
    if "matrix" in node:
        return np.asarray(node["matrix"], dtype=float).reshape(4, 4).T
    x, y, z, w = node.get("rotation", (0, 0, 0, 1))
    rotation = np.asarray([
        [1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
        [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
        [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)],
    ])
    result = np.eye(4)
    result[:3, :3] = rotation * node.get("scale", [1, 1, 1])
    result[:3, 3] = node.get("translation", [0, 0, 0])
    return result


def sample_texture(document, binary, texture_index, uv, images):
    index = document["textures"][texture_index]["source"]
    if index not in images:
        buffer = document["bufferViews"][document["images"][index]["bufferView"]]
        offset = buffer.get("byteOffset", 0)
        with Image.open(io.BytesIO(binary[offset:offset + buffer["byteLength"]])) as image:
            pixels = np.asarray(image.convert("RGB")) / 255
        images[index] = np.where(pixels <= .04045, pixels / 12.92, ((pixels + .055) / 1.055) ** 2.4)
    pixels = images[index]
    u = np.clip((uv[:, 0] * pixels.shape[1]).astype(int), 0, pixels.shape[1] - 1)
    v = np.clip((uv[:, 1] * pixels.shape[0]).astype(int), 0, pixels.shape[0] - 1)
    return pixels[v, u]


def read_tree(path, model_height=None):
    document, binary = TOOLS["read_glb"](path)
    parts = []
    images = {}

    def walk(index, parent):
        node = document["nodes"][index]
        world = parent @ local_transform(node)
        if "mesh" in node:
            for primitive in document["meshes"][node["mesh"]]["primitives"]:
                attrs = primitive["attributes"]
                linear = world[:3, :3]
                positions = accessor(document, binary, attrs["POSITION"]) @ linear.T + world[:3, 3]
                normals = accessor(document, binary, attrs["NORMAL"]) @ np.linalg.inv(linear)
                normals /= np.maximum(1e-6, np.linalg.norm(normals, axis=1, keepdims=True))
                faces = accessor(document, binary, primitive["indices"]).reshape(-1, 3)
                material = document["materials"][primitive["material"]].get("pbrMetallicRoughness", {})
                colors = np.tile(material.get("baseColorFactor", [1, 1, 1, 1])[:3], (len(positions), 1)).astype(float)
                if "COLOR_0" in attrs:
                    colors *= accessor(document, binary, attrs["COLOR_0"])[:, :3]
                if "baseColorTexture" in material:
                    texture = material["baseColorTexture"]["index"]
                    uv = accessor(document, binary, attrs["TEXCOORD_0"])
                    colors *= sample_texture(document, binary, texture, uv, images)
                # Soft light shows the original folds and branches without reacting to gameplay lights twice.
                lit = np.maximum(normals @ np.asarray([-.40, .78, .48]), 0)
                colors *= (.66 + lit * .25 + np.maximum(normals[:, 1], 0) * .11)[:, None]
                parts.append((positions, colors, faces))
        for child in node.get("children", []):
            walk(child, world)

    for node in document["scenes"][document.get("scene", 0)]["nodes"]:
        walk(node, np.eye(4))
    vertices = np.concatenate([part[0] for part in parts])
    colors = np.concatenate([part[1] for part in parts])
    offset = 0
    faces = []
    for points, _colors, triangles in parts:
        faces.append(triangles.astype(np.uint32) + offset)
        offset += len(points)
    low, high = vertices.min(axis=0), vertices.max(axis=0)
    origin = (low + high) * .5
    origin[1] = low[1]
    vertices -= origin
    if model_height:
        vertices *= model_height / (high[1] - low[1])
    return vertices, colors, np.concatenate(faces)


def atlas_sources(intake):
    version1 = read_json(ART / "v001/manifest.json")
    version2 = read_json(ART / "v002/manifest.json")
    sources = {}
    for record in version1["assets"] + version2["assets"]:
        if record["id"] in ("t01", "t02", "t03"):
            reference = record.get("sourceVault") or record["originalPath"]
            original = intake.existing(reference)
            if not original:
                raise FileNotFoundError(f"Original tree is absent from the local asset library: {reference}")
            sources[record["id"]] = original.path, reference, None
    for tree, filename in (("tower-tree-stylized", "stylized-tree.glb"), ("tower-tree-broad", "broad-tree.glb")):
        reference = Path("public/assets/world/tower-trees/v001") / filename
        path = ROOT / reference
        if not path.is_file():
            path = ROOT.parent.parent / reference
        sources[tree] = path, reference.as_posix(), 25
    return sources


def views(points):
    elevation = math.radians(ELEVATION)
    projections = []
    for column in range(COLS):
        angle = column * (2 * math.pi / COLS)
        direction = np.asarray([math.sin(angle), 0, math.cos(angle)])
        right = np.asarray([math.cos(angle), 0, -math.sin(angle)])
        up = np.asarray([0, math.cos(elevation), 0]) - math.sin(elevation) * direction
        sight = direction * math.cos(elevation) + [0, math.sin(elevation), 0]
        projections.append(np.column_stack((points @ right, points @ up, points @ sight)))
    extent = [max(np.abs(view[:, 0]).max() for view in projections) * 2,
              min(view[:, 1].min() for view in projections),
              max(view[:, 1].max() for view in projections)]
    width, low, high = extent
    return projections, width * 1.018, (high - low) * 1.018, (low + high) * .5


def render_tile(exe, stage, projection, colors, indices, width, height, center_y):
    render_size = TILE * SAMPLES
    active_pixels = (TILE - GUTTER * 2) * SAMPLES
    xy = projection.copy()
    xy[:, 0] = render_size / 2 + projection[:, 0] / width * active_pixels
    xy[:, 1] = render_size / 2 - (projection[:, 1] - center_y) / height * active_pixels
    vertices = np.ascontiguousarray(np.concatenate([xy, colors], axis=1), dtype="<f4")
    triangles = np.ascontiguousarray(indices, dtype="<u4")
    model, image = stage / "raster-input.bin", stage / "raster-output.rgba"
    with model.open("wb") as file:
        file.write(struct.pack("<III", render_size, len(vertices), triangles.size))
        vertices.tofile(file)
        triangles.tofile(file)
    subprocess.run([str(exe), str(model), str(image)], check=True)
    return Image.frombytes("RGBA", (render_size, render_size), image.read_bytes()).resize(
        (TILE, TILE), Image.Resampling.BOX,
    )


def metadata_text(record, image, export_name="DESERT_TREE_IMPOSTORS"):
    data = {"url": DATA_PREFIX + base64.b64encode(image).decode("ascii"), **{
        key: record[key] for key in (
            "columns", "rows", "atlasWidth", "atlasHeight", "tileSize",
            "gutter", "elevationDegrees", "shapes",
        )
    }}
    return ("// Generated by prepare-desert-tree-impostors-v001.py from the registered original tree models.\n"
            f"export const {export_name} = " + json.dumps(data, ensure_ascii=False, indent=2)
            + " as const;\n")


def verify_atlas(manifest_path, metadata_path, export_name="DESERT_TREE_IMPOSTORS"):
    manifest = read_json(manifest_path)
    source = metadata_path.read_text()
    inline = re.search(r'"url": "data:image/webp;base64,([^"]+)"', source)
    if not inline:
        raise ValueError("The runtime metadata does not contain a tree atlas.")
    image = base64.b64decode(inline.group(1), validate=True)
    if hashlib.sha256(image).hexdigest() != manifest["sha256"]:
        raise ValueError("The tree atlas differs from its registered derivative.")
    if source != metadata_text(manifest, image, export_name):
        raise ValueError("The tree atlas metadata differs from its registered values.")
    with Image.open(io.BytesIO(image)) as atlas:
        if atlas.mode != "RGBA" or atlas.size != (manifest["atlasWidth"], manifest["atlasHeight"]):
            raise ValueError("Unexpected tree atlas formats or dimensions")
    print(f'{manifest["columns"] * manifest["rows"]} poses, {manifest["bytes"]:,} bytes, {manifest["sha256"][:12]}')
    return manifest, image


def verify():
    verify_atlas(MANIFEST, METADATA)


def crop_tower_views():
    original, image = verify_atlas(MANIFEST, METADATA)
    size = original["tileSize"]
    width = original["atlasWidth"]
    shapes = {}
    roots = {}
    source_rows = {}
    output = Image.new("RGBA", (width, size * len(TOWER_ASSETS)))
    with Image.open(io.BytesIO(image)) as atlas:
        for row, asset in enumerate(TOWER_ASSETS):
            shape = original["shapes"][asset]
            source_row = shape["row"]
            shapes[asset] = {**shape, "row": row}
            source_rows[asset] = source_row
            roots[asset] = original["originals"][asset]
            output.paste(atlas.crop((0, size * source_row, width, size * (source_row + 1))), (0, size * row))
    encoded = io.BytesIO()
    quality = 93
    output.save(encoded, format="WEBP", quality=quality, method=6)
    derivative = encoded.getvalue()
    with Image.open(io.BytesIO(derivative)) as decoded:
        if decoded.getchannel("A").tobytes() != output.getchannel("A").tobytes():
            raise ValueError("The cropped atlas changed a tree silhouette.")
    result = {
        "version": 1, "runtimeSource": TOWER_METADATA.relative_to(ROOT).as_posix(),
        "columns": original["columns"], "rows": len(TOWER_ASSETS),
        "atlasWidth": width, "atlasHeight": size * len(TOWER_ASSETS),
        "tileSize": size, "gutter": original["gutter"], "elevationDegrees": original["elevationDegrees"],
        "bytes": len(derivative), "sha256": hashlib.sha256(derivative).hexdigest(), "webpQuality": quality,
        "sourceAtlas": {"originalPath": original["runtimeSource"], "originalSha256": original["sha256"], "rows": source_rows},
        "shapes": shapes, "originals": roots,
    }
    return result, derivative


def prepare_tower_only(verify_only=False):
    result, derivative = crop_tower_views()
    intake = AssetIntake(ROOT)
    with intake.transaction():
        existing = read_json(TOWER_MANIFEST)
        if existing or verify_only:
            previous, image = verify_atlas(TOWER_MANIFEST, TOWER_METADATA, TOWER_EXPORT)
            if previous != result or image != derivative:
                raise ValueError("The landmark atlas did not reproduce from the existing tree frame rows.")
            return
        TOWER_METADATA.write_text(metadata_text(result, derivative, TOWER_EXPORT))
        write_json(TOWER_MANIFEST, result)
    verify_atlas(TOWER_MANIFEST, TOWER_METADATA, TOWER_EXPORT)


def prepare():
    intake = AssetIntake(ROOT)
    with intake.transaction():
        if read_json(MANIFEST):
            verify()
            return
        with TemporaryDirectory(prefix="dunhuang-tree-atlas-") as directory:
            stage = Path(directory)
            executable = stage / "tree-raster"
            subprocess.run([
                "c++", "-O2", "-std=c++17", str(Path(__file__).with_name("desert-tree-impostor-raster.cpp")),
                "-o", str(executable),
            ], check=True)
            atlas = Image.new("RGBA", (TILE * COLS, TILE * ROWS))
            sources = atlas_sources(intake)
            shapes, originals = {}, {}
            for row, asset in enumerate(ASSETS):
                path, reference, target_height = sources[asset]
                vertices, colors, indices = read_tree(path, target_height)
                projections, width, height, center_y = views(vertices)
                for column, projection in enumerate(projections):
                    tile = render_tile(executable, stage, projection, colors, indices, width, height, center_y)
                    atlas.paste(tile, (TILE * column, TILE * row))
                tile_scale = TILE / (TILE - 2 * GUTTER)
                shapes[asset] = {
                    "row": row, "width": round(width * tile_scale, 5), "height": round(height * tile_scale, 5),
                    "centerY": round(center_y, 5),
                }
                originals[asset] = {"originalPath": reference, "originalSha256": digest(path)}
                print(f"Rendered {asset}", flush=True)

            for quality in (68, 60, 52, 44, 36):
                encoded = io.BytesIO()
                atlas.save(encoded, format="WEBP", quality=quality, method=6)
                generated = encoded.getvalue()
                if len(generated) <= BYTE_BUDGET:
                    break
            count = len(generated)
            if count > BYTE_BUDGET:
                raise ValueError(f"Tree atlas exceeds its transfer budget: {count} bytes")
            record = {
                "version": 1, "runtimeSource": METADATA.relative_to(ROOT).as_posix(),
                "columns": COLS, "rows": ROWS, "atlasWidth": TILE * COLS, "atlasHeight": TILE * ROWS,
                "tileSize": TILE, "gutter": GUTTER, "elevationDegrees": ELEVATION,
                "byteBudget": BYTE_BUDGET, "bytes": count, "sha256": hashlib.sha256(generated).hexdigest(),
                "webpQuality": quality,
                "shapes": shapes, "originals": originals,
            }
            METADATA.write_text(metadata_text(record, generated))
            write_json(MANIFEST, record)
    verify()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tower-only", action="store_true", help="Reuse only the two existing landmark rows.")
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    if args.tower_only:
        prepare_tower_only(args.verify)
    elif args.verify:
        verify()
    else:
        prepare()

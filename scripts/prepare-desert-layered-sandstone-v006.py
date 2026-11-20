#!/usr/bin/env python3
"""Rebalance the underside of the existing layered sandstone GLB without changing its mesh."""

import gzip
import json
import struct
from pathlib import Path

from asset_intake import digest, publish_file, read_json, staged_path, write_json

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("public/assets/world/desert-decoration/v001/r02.glb")
DESTINATION = Path("public/assets/world/desert-decoration/v006/r02.glb")
MANIFEST = ROOT / "art-source/world/desert-decoration/v006/r02.json"

def revise_colors(data: bytearray):
    json_length = struct.unpack_from("<I", data, 12)[0]
    gltf = json.loads(data[20:20 + json_length])
    attributes = gltf["meshes"][0]["primitives"][0]["attributes"]
    color = gltf["accessors"][attributes["COLOR_0"]]
    normals = gltf["accessors"][attributes["NORMAL"]]
    if (color["componentType"], color["type"], color["normalized"], color["count"]) != (5123, "VEC4", True, normals["count"]):
        raise ValueError("R02 color or normal layout changed")
    binary_offset = 28 + json_length

    def offset(accessor):
        return binary_offset + gltf["bufferViews"][accessor["bufferView"]]["byteOffset"] + accessor.get("byteOffset", 0)

    count = 0
    for i in range(color["count"]):
        at = offset(color) + i * 8
        rgb = struct.unpack_from("<3H", data, at)
        normal_y = struct.unpack_from("<f", data, offset(normals) + i * 12 + 4)[0]
        if rgb[0] / 65535 < .27 and normal_y < -.55:
            # This pigment marks the downward-facing strata only.
            adjusted = (.378, .284, .171)
        elif normal_y < .2:
            # Keep the shaded vertical faces close to the lit sandstone color.
            weight = min(1.0, (.2 - normal_y) / .4)
            adjusted = tuple(value / 65535 + lift * weight for value, lift in zip(rgb, (.044, .033, .019)))
        else:
            continue
        struct.pack_into("<3H", data, at, *(round(value * 65535) for value in adjusted))
        count += 1
    if not 338 < count < color["count"]:
        raise ValueError("Unexpected rock strata count")
    return count


def main():
    source = ROOT / SOURCE
    data = bytearray(source.read_bytes())
    changed_vertices = revise_colors(data)
    destination = ROOT / DESTINATION
    with staged_path(destination.parent) as stage:
        stage.write_bytes(data)
        publish_file(stage, destination, digest(stage))
    write_json(MANIFEST, {
        "version": 6,
        "asset": "r02",
        "source": SOURCE.as_posix(),
        "sourceSha256": digest(source),
        "sourceRegistration": "art-source/world/desert-decoration/v001/manifest.json",
        "runtime": DESTINATION.as_posix(),
        "sha256": digest(destination),
        "changedColorVertices": changed_vertices,
        "bytes": len(data),
        "gzip3Bytes": len(gzip.compress(data, compresslevel=3, mtime=0)),
    }, existing=read_json(MANIFEST))

if __name__ == "__main__":
    main()

"""Extend the mural station's measured support bottoms to the model origin."""

import hashlib
import json
import math
from importlib import import_module
from pathlib import Path
import struct
import sys


# Reuse the courtyard station's exact GLB and UV-seam welding helpers.
sys.dont_write_bytecode = True
glb = import_module("build-world-pattern-interactives-v002")

ROOT = Path(__file__).resolve().parents[1]
ASSETS = Path("public/assets/world/pattern-interactives")
SOURCE = ASSETS / "v002/mural-station.glb"
TARGET = ASSETS / "v003/mural-station.glb"
MANIFEST = Path("art-source/world/models/pattern-interactives/v003/mural-grounding-manifest.json")
CONTACTS = Path("src/content/world/mural-station-contacts-v003.json")
SOURCE_HASH = "0f3633fa74ec814e05e664b5d14ffef54a4d42e8d63867880fe1117ccf7e59e3"

# Indices are the order of the first vertex in each exact welded component.
# The source hash ties the component identities to this particular export.
SUPPORTS = {
    3: "floor-jar",
    79: "left-stand-outer-foot",
    82: "left-stand-inner-leg",
    83: "shelf-left-forward-foot",
    90: "shelf-left-rear-foot",
    91: "shelf-center-left-forward-foot",
    97: "shelf-center-left-rear-foot",
    133: "shelf-center-right-forward-foot",
    141: "shelf-center-right-rear-foot",
    146: "table-right-rear-leg",
    151: "shelf-right-rear-foot",
    232: "table-left-forward-leg",
    237: "table-left-rear-leg",
    243: "table-right-forward-leg",
    244: "side-stand-left-forward-leg",
    247: "side-stand-right-forward-leg",
    257: "side-stand-right-rear-leg",
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def derive(original):
    if digest(original) != SOURCE_HASH:
        raise ValueError("The v002 mural finish differs from the measured source")
    doc, header, binary = glb.source_chunks(original)
    mesh, = doc["meshes"]
    primitive, = mesh["primitives"]
    if primitive["mode"] != 4 or any(
        node.keys() & {"translation", "rotation", "scale", "matrix"} for node in doc["nodes"]
    ):
        raise ValueError("Expected untransformed mural station triangles")

    attributes = primitive["attributes"]
    pos_start, positions = glb.read_accessor(doc, binary, attributes["POSITION"], "VEC3", 5126, "3f")
    norm_start, normals = glb.read_accessor(doc, binary, attributes["NORMAL"], "VEC3", 5126, "3f")
    _, index_values = glb.read_accessor(doc, binary, primitive["indices"], "SCALAR", 5123, "H")
    groups = glb.welded_components(positions, [i for i, in index_values])
    floor_components = {
        index for index, members in enumerate(groups)
        if min(positions[i][1] for i in members) < .005
    }
    if floor_components != SUPPORTS.keys():
        raise ValueError("The measured floor supports do not match the source")

    revised = bytearray(binary)
    supports = []
    for index, name in SUPPORTS.items():
        members = groups[index]
        low, high = glb.bounds(positions[i] for i in members)
        bottom, top = low[1], high[1]
        if bottom > 0:
            # Preserve the upper join and correct normals for the vertical stretch.
            vertical_scale = top / (top - bottom)
            for i in members:
                x, y, z = positions[i]
                struct.pack_into("<3f", revised, pos_start + 12 * i, x, (y - bottom) * vertical_scale, z)
                nx, ny, nz = normals[i]
                ny /= vertical_scale
                length = math.sqrt(nx * nx + ny * ny + nz * nz)
                struct.pack_into("<3f", revised, norm_start + 12 * i, nx / length, ny / length, nz / length)

        adjusted = [struct.unpack_from("<3f", revised, pos_start + 12 * i) for i in members]
        revised_low, revised_high = glb.bounds(adjusted)
        if revised_low != [low[0], 0, low[2]] or revised_high != high:
            raise ValueError(f"Could not ground {name} while retaining the upper join")
        footprint_low, footprint_high = glb.bounds(point for point in adjusted if point[1] <= .003)
        supports.append({
            "id": name,
            "component": index,
            "vertices": len(members),
            "beforeMinY": bottom,
            "afterMinY": 0,
            "upperJoinY": top,
            "footprint": [footprint_low[0], footprint_low[2], footprint_high[0], footprint_high[2]],
        })

    _, new_positions = glb.read_accessor(doc, revised, attributes["POSITION"], "VEC3", 5126, "3f")
    overall_bounds = glb.bounds(new_positions)
    if overall_bounds != glb.bounds(positions):
        raise ValueError("Grounding altered the overall model bounds")
    return header + revised, overall_bounds, supports


def encode(data):
    return (json.dumps(data, ensure_ascii=False, indent=2) + "\n").encode()


def main():
    original = (ROOT / SOURCE).read_bytes()
    revised, bounds, supports = derive(original)
    manifest = {
        "source": str(SOURCE),
        "sourceSha256": SOURCE_HASH,
        "asset": str(TARGET),
        "sha256": digest(revised),
        "bytes": len(revised),
        "bounds": dict(zip(("min", "max"), bounds)),
        "supports": supports,
    }
    footprints = sorted(support["footprint"] for support in supports)
    files = {ROOT / TARGET: revised, ROOT / MANIFEST: encode(manifest), ROOT / CONTACTS: encode(footprints)}
    for path, data in files.items():
        if path.exists() and path.read_bytes() != data:
            raise ValueError(f"Refusing to replace a different versioned file: {path}")
    for path, data in files.items():
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
    print(f"{TARGET}: {len(supports)} floor supports, {manifest['sha256']}")


if __name__ == "__main__":
    main()

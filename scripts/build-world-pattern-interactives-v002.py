"""Derive the courtyard coloring station with coplanar wooden feet."""

import hashlib
import json
import math
from pathlib import Path
import struct


ROOT = Path(__file__).resolve().parents[1]
ASSETS = Path("public/assets/world/pattern-interactives")
SOURCE = ASSETS / "v001/coloring-station.glb"
TARGET = ASSETS / "v002/coloring-station.glb"
MANIFEST = Path("art-source/world/models/pattern-interactives/v002/export-manifest.json")

# Lowest Y and the X/Z footprint center identify individual welded components.
# The easel's four outer feet and jar already rest at zero.
SUPPORTS = (
    ("table-leg-back-left", .007324, .2256, -.0552),
    ("table-leg-left", .013184, .1230, .1038),
    ("table-leg-front", .016113, .3530, .2522),
    ("table-leg-right", .012695, .4551, .0916),
    ("easel-center-rear-support", .019043, -.0842, -.1755),
)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def source_chunks(glb):
    magic, version, size, json_size, json_tag = struct.unpack_from("<4sIII4s", glb)
    bin_header = 20 + json_size
    bin_size, bin_tag = struct.unpack_from("<I4s", glb, bin_header)
    if (magic, version, size, json_tag, bin_tag, bin_header + 8 + bin_size) != (
        b"glTF", 2, len(glb), b"JSON", b"BIN\0", len(glb)
    ):
        raise ValueError("Expected the v001 GLB with JSON and binary chunks")
    return json.loads(glb[20:bin_header]), glb[:bin_header + 8], glb[bin_header + 8:]


def read_accessor(doc, binary, index, shape, component_type, fmt):
    accessor = doc["accessors"][index]
    view = doc["bufferViews"][accessor["bufferView"]]
    layout = struct.Struct("<" + fmt)
    if (
        accessor["type"] != shape or accessor["componentType"] != component_type
        or view.get("byteStride", layout.size) != layout.size
        or accessor.get("sparse") or view["buffer"] != 0
    ):
        raise ValueError("Unexpected coloring station accessor layout")
    start = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    end = start + accessor["count"] * layout.size
    return start, list(layout.iter_unpack(binary[start:end]))


def welded_components(vertices, indices):
    # Position welding reunites the duplicate vertices at UV and normal seams.
    roots = list(range(len(vertices)))

    def root(i):
        while roots[i] != i:
            roots[i] = roots[roots[i]]
            i = roots[i]
        return i

    owner = {}
    for i, point in enumerate(vertices):
        roots[i] = owner.setdefault(point, i)
    for a, b, c in zip(indices[::3], indices[1::3], indices[2::3]):
        roots[root(b)] = root(a)
        roots[root(c)] = root(a)

    groups = {}
    for i in range(len(vertices)):
        groups.setdefault(root(i), []).append(i)
    return list(groups.values())


def bounds(vertices):
    axes = list(zip(*vertices))
    return [min(axis) for axis in axes], [max(axis) for axis in axes]


def derive(original):
    doc, header, binary = source_chunks(original)
    mesh, = doc["meshes"]
    primitive, = mesh["primitives"]
    if primitive["mode"] != 4 or any(
        node.keys() & {"translation", "rotation", "scale", "matrix"} for node in doc["nodes"]
    ):
        raise ValueError("Expected untransformed triangle geometry")

    attributes = primitive["attributes"]
    pos_start, positions = read_accessor(doc, binary, attributes["POSITION"], "VEC3", 5126, "3f")
    norm_start, normals = read_accessor(doc, binary, attributes["NORMAL"], "VEC3", 5126, "3f")
    _, index_values = read_accessor(doc, binary, primitive["indices"], "SCALAR", 5123, "H")
    groups = welded_components(positions, [i for i, in index_values])
    measured = [(members, *bounds(positions[i] for i in members)) for members in groups]
    if sum(low[1] == 0 for _, low, _ in measured) != 5:
        raise ValueError("Expected the original grounded jar and four easel feet")

    revised = bytearray(binary)
    results = []
    changed = set()
    for name, base, center_x, center_z in SUPPORTS:
        matches = [
            (members, low, high) for members, low, high in measured
            if abs(low[1] - base) < 1e-6
            and abs((low[0] + high[0]) / 2 - center_x) < .002
            and abs((low[2] + high[2]) / 2 - center_z) < .002
        ]
        if len(matches) != 1:
            raise ValueError(f"Could not uniquely identify {name}")
        members, low, high = matches[0]
        if changed.intersection(members):
            raise ValueError(f"Component already processed for {name}")
        changed.update(members)

        # Leave the upper join at its measured height and extend the foot to zero.
        vertical_scale = high[1] / (high[1] - low[1])
        for i in members:
            x, y, z = positions[i]
            y = (y - low[1]) * vertical_scale
            struct.pack_into("<3f", revised, pos_start + 12 * i, x, y, z)
            nx, ny, nz = normals[i]
            ny /= vertical_scale
            length = math.sqrt(nx * nx + ny * ny + nz * nz)
            struct.pack_into("<3f", revised, norm_start + 12 * i, nx / length, ny / length, nz / length)

        adjusted = [struct.unpack_from("<3f", revised, pos_start + 12 * i) for i in members]
        revised_low, revised_high = bounds(adjusted)
        if revised_low != [low[0], 0, low[2]] or revised_high != high:
            raise ValueError(f"Ground correction did not preserve the upper join for {name}")
        results.append({
            "id": name,
            "beforeMinY": low[1],
            "afterMinY": revised_low[1],
            "upperJoinY": high[1],
            "vertices": len(members),
        })

    _, revised_positions = read_accessor(doc, revised, attributes["POSITION"], "VEC3", 5126, "3f")
    overall_bounds = bounds(revised_positions)
    if overall_bounds != bounds(positions):
        raise ValueError("The grounded model changed its declared size")
    if sum(min(revised_positions[i][1] for i in members) == 0 for members in groups) != 10:
        raise ValueError("Expected all nine wooden feet and the jar to rest at zero")
    return header + revised, {
        "components": len(groups),
        "bounds": dict(zip(("min", "max"), overall_bounds)),
        "groundedSupportCount": 10,
        "adjustedSupports": results,
    }


def main():
    original = (ROOT / SOURCE).read_bytes()
    revised, metrics = derive(original)
    record = {
        "source": str(SOURCE),
        "sourceSha256": sha256(original),
        "asset": str(TARGET),
        "sha256": sha256(revised),
        "bytes": len(revised),
        **metrics,
    }
    manifest_data = (json.dumps(record, indent=2, ensure_ascii=False) + "\n").encode()
    files = {ROOT / TARGET: revised, ROOT / MANIFEST: manifest_data}
    for path, data in files.items():
        if path.exists() and path.read_bytes() != data:
            raise ValueError(f"Refusing to replace a different versioned file: {path}")
    for path, data in files.items():
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
    print(manifest_data.decode(), end="")


if __name__ == "__main__":
    main()

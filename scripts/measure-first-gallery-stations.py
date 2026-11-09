"""Measure the first gallery station overlays and object hits from the shipped GLBs."""

import hashlib
import json
import math
import sys
from importlib import import_module
from pathlib import Path


sys.dont_write_bytecode = True
glb = import_module("build-world-pattern-interactives-v002")
ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/assets/world/pattern-interactives"
COLORING = ASSETS / "v002/coloring-station.glb"
MURAL = ASSETS / "v003/mural-station.glb"
CONFIG = ROOT / "src/content/world/first-gallery-stations-v001.json"
REPORT = ROOT / "work/world/first-gallery-v001/station-measurements.json"

# Component numbers are tied to the existing export by the hashes below. The
# atlas inspection shows the cream paper inside this rectangle, in the original
# model's +Z front view. Clips and rails are separate components and still occlude it.
PAPER_COMPONENT = 13
PAPER_RECT = (-.260, .135, .0855, .660)
PAPER_OFFSET = .0008
COLORING_HASH = "2a9145d3facd83faf3bbba0afc8655e56b5b9b50af0bb0e7930caa414bf55485"
MURAL_HASH = "132dd9dc5267e74c33bdd61d9cf756cc37a1f975ffed315e92181d065b92e12e"
LOTUS_BLOSSOM = {11, 14, 19, 20, *range(24, 79)} - {54}
LOTUS_PLANT = LOTUS_BLOSSOM | {7, 9, 10, 15, 16, 17, 18, 21, 54}
MURAL_COMPONENTS = {"lotus": LOTUS_PLANT, "bird": {132}, "grapes": {23}}


def load_model(path, expected_hash):
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != expected_hash:
        raise ValueError(f"Measured export differs: {path.name}")
    doc, _, binary = glb.source_chunks(data)
    mesh, = doc["meshes"]
    primitive, = mesh["primitives"]
    if primitive["mode"] != 4 or any(
        node.keys() & {"translation", "rotation", "scale", "matrix"} for node in doc["nodes"]
    ):
        raise ValueError("Expected one triangle mesh in the original station coordinates")
    _, positions = glb.read_accessor(doc, binary, primitive["attributes"]["POSITION"], "VEC3", 5126, "3f")
    _, index_values = glb.read_accessor(doc, binary, primitive["indices"], "SCALAR", 5123, "H")
    indices = [index for index, in index_values]
    triangles = list(zip(indices[::3], indices[1::3], indices[2::3]))
    components = glb.welded_components(positions, indices)
    membership = [0] * len(positions)
    for component, vertices in enumerate(components):
        for vertex in vertices:
            membership[vertex] = component
    return positions, triangles, components, membership


def projected_area(a, b, c):
    return ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2


def clip(points, axis, value, side):
    """Keep the side of one model-space plane and interpolate original depth."""
    result = []
    for a, b in zip(points[-1:] + points[:-1], points):
        a_inside, b_inside = (a[axis] - value) * side >= 0, (b[axis] - value) * side >= 0
        if a_inside != b_inside:
            fraction = (value - a[axis]) / (b[axis] - a[axis])
            result.append(tuple(start + (end - start) * fraction for start, end in zip(a, b)))
        if b_inside:
            result.append(b)
    return result


def front_projector(faces):
    prepared = []
    min_x, min_y, max_x, max_y = PAPER_RECT
    for identifier, (a, b, c) in faces:
        left, right = min(a[0], b[0], c[0]), max(a[0], b[0], c[0])
        bottom, top = min(a[1], b[1], c[1]), max(a[1], b[1], c[1])
        if right < min_x or left > max_x or top < min_y or bottom > max_y:
            continue
        ab = tuple(v - u for u, v in zip(a, b))
        ac = tuple(v - u for u, v in zip(a, c))
        det = ab[0] * ac[1] - ac[0] * ab[1]
        if abs(det) > 1e-12:
            prepared.append((left, bottom, right, top, a, ab, ac, 1 / det, identifier))

    def project(x, y):
        depth, component = -math.inf, None
        for left, bottom, right, top, a, ab, ac, inverse, identifier in prepared:
            if not (left - 1e-8 <= x <= right + 1e-8 and bottom - 1e-8 <= y <= top + 1e-8):
                continue
            qx, qy = x - a[0], y - a[1]
            u = (qx * ac[1] - ac[0] * qy) * inverse
            v = (ab[0] * qy - qx * ab[1]) * inverse
            z = a[2] + u * ab[2] + v * ac[2]
            if u >= -1e-6 and v >= -1e-6 and u + v <= 1 + 1e-6 and z > depth:
                depth, component = z, identifier
        return depth, component

    return project


def verify_paper(paper, positions, triangles, membership):
    source = front_projector((membership[face[0]], [positions[i] for i in face]) for face in triangles)
    points = list(zip(paper["positions"][::3], paper["positions"][1::3], paper["positions"][2::3]))
    faces = zip(paper["indices"][::3], paper["indices"][1::3], paper["indices"][2::3])
    overlay = front_projector((PAPER_COMPONENT, [points[i] for i in face]) for face in faces)
    min_x, min_y, max_x, max_y = PAPER_RECT
    offsets, occluders = [], {}
    for column in range(27):
        x = min_x + .0001 + (max_x - min_x - .0002) * column / 26
        for row in range(41):
            y = min_y + .0001 + (max_y - min_y - .0002) * row / 40
            depth, component = source(x, y)
            patch, _ = overlay(x, y)
            if not math.isfinite(patch):
                raise ValueError(f"The artwork overlay missed the paper at {x:.4f}, {y:.4f}")
            if component == PAPER_COMPONENT:
                offsets.append(patch - depth)
            elif component is not None and patch < depth:
                occluders[component] = occluders.get(component, 0) + 1
            else:
                raise ValueError(f"The paper overlay overdraws station geometry at {x:.4f}, {y:.4f}")
    if min(offsets) < PAPER_OFFSET - 1e-5 or max(offsets) > PAPER_OFFSET + 1e-5:
        raise ValueError("The overlay does not follow the source paper surface")

    def surface_length(a, b, fixed, along_x):
        previous = (a, overlay(a, fixed)[0] if along_x else overlay(fixed, a)[0])
        length = 0.0
        for i in range(1, 101):
            coordinate = a + (b - a) * i / 100
            depth = overlay(coordinate, fixed)[0] if along_x else overlay(fixed, coordinate)[0]
            length += math.hypot(coordinate - previous[0], depth - previous[1])
            previous = (coordinate, depth)
        return length

    width = surface_length(min_x + .0001, max_x - .0001, (min_y + max_y) / 2, True)
    height = surface_length(min_y + .0001, max_y - .0001, (min_x + max_x) / 2, False)
    return {
        "frontRayCount": 27 * 41, "visiblePaperRays": len(offsets), "occludedRays": occluders,
        "observedOffsetZ": [min(offsets), max(offsets)], "physicalAspect": round(width / height, 6),
    }


def measure_paper(model):
    positions, triangles, _, membership = model
    min_x, min_y, max_x, max_y = PAPER_RECT
    width, height = max_x - min_x, max_y - min_y
    clipped_positions, texture_uv, indices, welded = [], [], [], {}
    area = 0.0
    for face in triangles:
        if membership[face[0]] != PAPER_COMPONENT:
            continue
        points = [positions[index] for index in face]
        if projected_area(*points) <= 1e-9:
            continue
        for axis, boundary, side in [(0, min_x, 1), (0, max_x, -1), (1, min_y, 1), (1, max_y, -1)]:
            points = clip(points, axis, boundary, side)
        for a, b in zip(points[1:], points[2:]):
            sample = (points[0], a, b)
            triangle_area = projected_area(*sample)
            if triangle_area <= 1e-9:
                continue
            area += triangle_area
            for x, y, z in sample:
                point = (round(x, 6), round(y, 6), round(z + PAPER_OFFSET, 6))
                if point not in welded:
                    welded[point] = len(clipped_positions) // 3
                    clipped_positions.extend(point)
                    texture_uv.extend((round((x - min_x) / width, 6), round((y - min_y) / height, 6)))
                indices.append(welded[point])
    coverage = area / (width * height)
    if not .99 <= coverage <= 1.01:
        raise ValueError(f"The front paper patch is not a complete non-overlapping rectangle: {coverage:.5f}")
    paper = {"positions": clipped_positions, "uv": texture_uv, "indices": indices}
    verification = verify_paper(paper, positions, triangles, membership)
    paper["aspect"] = verification["physicalAspect"]
    return paper, {
        "rect": PAPER_RECT, "offsetZ": PAPER_OFFSET,
        "vertices": len(clipped_positions) // 3, "triangles": len(indices) // 3,
        "projectionCoverage": coverage, "depthRange": [min(clipped_positions[2::3]), max(clipped_positions[2::3])],
        **verification,
    }


def face_ranges(faces):
    ranges = []
    for face in faces:
        if ranges and face == ranges[-1][1] + 1:
            ranges[-1][1] = face
        else:
            ranges.append([face, face])
    return ranges


def measure_objects(model):
    positions, triangles, components, membership = model
    result = {}
    for name, selected in MURAL_COMPONENTS.items():
        low, high = glb.bounds(positions[i] for component in selected for i in components[component])
        aiming = LOTUS_BLOSSOM if name == "lotus" else selected
        aim_low, aim_high = glb.bounds(positions[i] for component in aiming for i in components[component])
        hits = [face for face, tri in enumerate(triangles) if membership[tri[0]] in selected]
        result[name] = {
            "min": [round(v, 6) for v in low], "max": [round(v, 6) for v in high],
            "center": [round((a + b) / 2, 6) for a, b in zip(aim_low, aim_high)],
            "faces": face_ranges(hits),
        }
    return result


def write(path, data, compact=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=None if compact else 2) + "\n")


def main():
    paper, diagnostics = measure_paper(load_model(COLORING, COLORING_HASH))
    objects = measure_objects(load_model(MURAL, MURAL_HASH))
    write(CONFIG, {"paper": paper, "muralObjects": objects}, compact=True)
    write(REPORT, {
        "sourceModels": {
            str(COLORING.relative_to(ROOT)): COLORING_HASH, str(MURAL.relative_to(ROOT)): MURAL_HASH,
        },
        "space": "GLB model local coordinates, +Z points toward the visible paper and props",
        "paper": diagnostics,
        "muralObjects": {
            name: {**{key: value for key, value in item.items() if key != "faces"},
                   "selectedTriangles": sum(end - start + 1 for start, end in item["faces"])}
            for name, item in objects.items()
        },
        "faceRangeConvention": "Zero-based inclusive bounds in original GLB primitive triangle order",
    })
    print(f"Paper: {diagnostics['vertices']} vertices, {diagnostics['triangles']} triangles; {len(objects)} exact prop hit surfaces.")


if __name__ == "__main__":
    main()

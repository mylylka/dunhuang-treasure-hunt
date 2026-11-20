#!/usr/bin/env python3
"""Bake distant silhouettes and linear vertex colors from the runtime GLBs."""

from __future__ import annotations

import argparse
import io
import json
import math
from pathlib import Path
import runpy
import subprocess
from tempfile import TemporaryDirectory

import numpy as np
from PIL import Image
from scipy.spatial import ConvexHull, cKDTree


TOOLS = runpy.run_path(str(Path(__file__).with_name("prepare-desert-decoration-v001.py")))
ROOT = TOOLS["ROOT"]
DESTINATION = ROOT / "src/content/world/desert-decoration-overlook-v001.ts"
SOURCE = ROOT / "public/assets/world/desert-decoration"
SILHOUETTE_LIMITS = {
    "c01b": 22, "c02": 22, "c03b": 28, "c04": 22,
    "g02": 12, "r01": 16, "r02": 18, "r03": 20, "r04": 24,
    "rock-shrub-3": 20, "shrub-2": 40, "s02": 24, "s04b": 16,
    "w01b": 24, "t01": 146, "t02": 160, "t03": 174,
    "tower-tree-stylized": 420, "tower-tree-broad": 440,
}


def accessor(document, binary, index):
    descriptor = document["accessors"][index]
    view = document["bufferViews"][descriptor["bufferView"]]
    dtype = np.dtype({5121: "u1", 5123: "<u2", 5125: "<u4", 5126: "<f4"}[descriptor["componentType"]])
    channels = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[descriptor["type"]]
    data = np.ndarray(
        (descriptor["count"], channels), dtype=dtype, buffer=binary,
        offset=view.get("byteOffset", 0) + descriptor.get("byteOffset", 0),
        strides=(view.get("byteStride", dtype.itemsize * channels), dtype.itemsize),
    ).astype(np.float64)
    if descriptor.get("normalized"):
        data /= np.iinfo(dtype).max
    return data


def source_path(asset):
    version = "v002" if asset == "t03" else "v001"
    if asset.startswith("tower-tree-"):
        filename = f'{asset.removeprefix("tower-tree-")}-tree.glb'
        relative = Path("public/assets/world/tower-trees/v001") / filename
        path = ROOT / relative
        if not path.is_file():
            path = ROOT.parent.parent / relative
    else:
        path = SOURCE / version / f"{asset}.glb"
    return path


def render_mesh(path):
    document, binary = TOOLS["read_glb"](path)
    primitive = document["meshes"][0]["primitives"][0]
    attributes = primitive["attributes"]
    points = accessor(document, binary, attributes["POSITION"])
    if "COLOR_0" in attributes:
        colors = accessor(document, binary, attributes["COLOR_0"])[:, :3]
    else:
        view = document["bufferViews"][document["images"][0]["bufferView"]]
        start = view.get("byteOffset", 0)
        with Image.open(io.BytesIO(binary[start:start + view["byteLength"]])) as image:
            pixels = np.asarray(image.convert("RGB"))
        uv = accessor(document, binary, attributes["TEXCOORD_0"])
        u = np.clip((uv[:, 0] * pixels.shape[1]).astype(int), 0, pixels.shape[1] - 1)
        v = np.clip((uv[:, 1] * pixels.shape[0]).astype(int), 0, pixels.shape[0] - 1)
        srgb = pixels[v, u] / 255
        colors = np.where(srgb <= .04045, srgb / 12.92, ((srgb + .055) / 1.055) ** 2.4)
    faces = accessor(document, binary, primitive["indices"]).astype(int).reshape(-1, 3)
    return points, colors, faces


def source_geometry(asset):
    points, colors, _faces = render_mesh(source_path(asset))
    if asset.startswith("tower-tree-"):
        lower, upper = points.min(axis=0), points.max(axis=0)
        center = (lower + upper) * .5
        center[1] = lower[1]
        points = (points - center) * (25 / (upper[1] - lower[1]))
    return points, colors


class Mesh:
    def __init__(self):
        self.positions = []
        self.colors = []
        self.indices = []

    def add(self, points, colors, faces):
        first = len(self.positions)
        self.positions.extend(points)
        self.colors.extend(colors)
        self.indices.extend([first + index for index in face] for face in faces)

    def record(self):
        return {
            "positions": [round(float(x), 4) for point in self.positions for x in point],
            "colors": [round(float(x), 3) for color in self.colors for x in color],
            "indices": [int(index) for face in self.indices for index in face],
        }


def hull(mesh, points, colors, face_limit):
    """Sample exterior support points, respecting the hull's triangle budget."""
    size = (face_limit + 4) // 2
    axis_points = list(dict.fromkeys(
        int(boundary(points[:, axis]))
        for axis in range(3) for boundary in (np.argmin, np.argmax)
    ))
    corners = set(axis_points[:size])
    # Add diagonal support points in a deterministic order after the axes.
    for i in range(32):
        if len(corners) >= size:
            break
        y = 1 - 2 * ((i + .5) / 32)
        angle = i * math.pi * (3 - math.sqrt(5))
        horizontal = math.sqrt(1 - y * y)
        direction = [math.cos(angle) * horizontal, y, math.sin(angle) * horizontal]
        corners.add(int(np.argmax(points @ direction)))
    chosen = sorted(corners)
    points, colors = points[chosen], colors[chosen]
    shape = ConvexHull(points)
    faces = shape.simplices.copy()
    for index, (a, b, c) in enumerate(faces):
        if np.dot(np.cross(points[b] - points[a], points[c] - points[a]), shape.equations[index, :3]) < 0:
            faces[index, 1:3] = c, b
    mesh.add(points, colors, faces)


def cluster(points, count, axes=(0, 2)):
    """Partition the actual footprint while preserving curved or discontinuous groups."""
    coordinates = points[:, axes]
    first = int(np.argmin(coordinates[:, 0]))
    seeds = [coordinates[first]]
    for _ in range(count - 1):
        separation = np.min(np.sum((coordinates[:, None] - np.asarray(seeds)[None]) ** 2, axis=2), axis=1)
        seeds.append(coordinates[np.argmax(separation)])
    for _ in range(9):
        assignment = np.argmin(np.sum((coordinates[:, None] - np.asarray(seeds)[None]) ** 2, axis=2), axis=1)
        seeds = [np.mean(coordinates[assignment == index], axis=0) for index in range(count)]
    return [assignment == index for index in range(count)]


def grass_silhouette(mesh, points, colors):
    for membership in cluster(points, 3):
        clump = points[membership]
        hues = colors[membership]
        lower, upper = clump.min(axis=0), clump.max(axis=0)
        ground = clump[clump[:, 1] < upper[1] * .23]
        center = np.median(ground, axis=0) if len(ground) else clump[np.argmin(clump[:, 1])]
        center = center.copy()
        center[1] = 0
        tips = clump[clump[:, 1] > upper[1] * .62]
        greens = hues[hues[:, 1] > hues[:, 0] * .92]
        leaf = np.quantile(greens if len(greens) else hues, .62, axis=0)
        for axis in (0, 2):
            # Two triangles along a gently bent blade, crossed through the clump.
            tip = tips[np.argmax(tips[:, 1])].copy()
            width = (upper[axis] - lower[axis]) * .20
            offset = np.zeros(3)
            offset[axis] = width
            bend = center + (tip - center) * .50
            bend[axis] += width * .60
            bend[1] = max(bend[1], upper[1] * .40)
            mesh.add(
                [center - offset * .35, center + offset * .35, bend + offset, tip],
                [leaf] * 4,
                [(0, 1, 2), (0, 2, 3)],
            )


def reed_silhouette(mesh, points, colors):
    for index, membership in enumerate(cluster(points, 3)):
        reed = points[membership]
        lower, upper = reed.min(axis=0), reed.max(axis=0)
        height = upper[1]
        ground = reed[reed[:, 1] < height * .20]
        stem = np.median(ground, axis=0) if len(ground) else reed[np.argmin(reed[:, 1])].copy()
        stem[1] = 0
        tip = reed[np.argmax(reed[:, 1])]
        stem_top = stem + (tip - stem) * .9
        blade_axis = np.array([.74, 0, -.67]) if index == 1 else np.array([.80, 0, .60])
        blade_axis *= np.max((upper - lower)[[0, 2]]) * .026
        hues = colors[membership]
        greens = hues[hues[:, 1] > hues[:, 0] * .92]
        leaf = np.median(greens if len(greens) else hues, axis=0) * [.72, .82, .72]
        seed = np.array([.38, .27, .10])
        mesh.add(
            [stem - blade_axis, stem + blade_axis, stem_top + blade_axis * .35, stem_top - blade_axis * .35],
            [leaf] * 4, [(0, 1, 2), (0, 2, 3)],
        )
        head = stem_top * .65 + tip * .35
        mesh.add(
            [stem_top, head + blade_axis * 1.45, tip, head - blade_axis * 1.45],
            [seed, seed * .88, seed, seed * .74], [(0, 1, 2), (0, 2, 3)],
        )
        possible_tips = reed[(reed[:, 1] > height * .20) & (reed[:, 1] < height * .66)]
        if not len(possible_tips):
            possible_tips = reed
        for side in (-1, 1):
            target = possible_tips[np.argmax(possible_tips @ blade_axis * side)]
            root = stem + (tip - stem) * (.20 if side < 0 else .08)
            bend = root * .54 + target * .46
            bend[1] += height * .15
            mesh.add(
                [root, bend + blade_axis * .95, bend - blade_axis * .95, target],
                [leaf, leaf * .86, leaf, leaf * .76], [(0, 1, 2), (1, 3, 2)],
            )


def trunk(mesh, points, colors, height, width):
    base = points[points[:, 1] < height * .1]
    center = (base.min(axis=0) + base.max(axis=0)) * .5
    radius = np.max(np.linalg.norm(base[:, [0, 2]] - center[[0, 2]], axis=1))
    bark = np.median(colors[points[:, 1] < height * .1], axis=0)
    rings = []
    for level, thickness in ((0., 1.), (.29, .70), (.53, .46), (.68, .29)):
        y = height * level
        band = points[np.abs(points[:, 1] - y) < height * .08]
        if len(band):
            close = band[np.linalg.norm(band[:, [0, 2]] - center[[0, 2]], axis=1) < width * .22]
            if len(close):
                center = np.median(close, axis=0)
        offset = radius * thickness
        rings.extend([
            [center[0] - offset, y, center[2]], [center[0], y, center[2] - offset],
            [center[0] + offset, y, center[2]], [center[0], y, center[2] + offset],
        ])
    faces = []
    for layer in range(3):
        for index in range(4):
            a, b = 4 * layer + index, 4 * layer + (index + 1) % 4
            faces.extend([(a, a + 4, b), (a + 4, b + 4, b)])
    mesh.add(rings, [bark] * len(rings), faces)
    return np.asarray(rings).reshape(-1, 4, 3).mean(axis=1), bark


def bough(mesh, lower, upper, radius, bark):
    # A tapered three-sided cross-section still gives the bough thickness in profile.
    ring = np.array([[-radius, 0, 0], [radius * .5, 0, radius * .85], [.5 * radius, 0, -.85 * radius]])
    mesh.add(
        [*list(lower + ring), upper], [bark, bark * .82, bark * .91, bark],
        [(0, 3, 1), (1, 3, 2), (2, 3, 0)],
    )


def poplar_canopy(mesh, points, colors, trunk_path, bark, asset, limit):
    sections = {"t01": 8, "t02": 9, "t03": 10}[asset]
    canopy = list(cluster(points, sections, axes=(0, 1, 2)))
    for group in canopy:
        hue = colors[group] * [.64, .77, .62]
        hull(mesh, points[group], hue, 14)
    stem_base = trunk_path[1]
    left, right = min(canopy, key=lambda m: points[m][:, 0].min()), max(canopy, key=lambda m: points[m][:, 0].max())
    for section in (left, right):
        crown_tip = np.median(points[section], axis=0)
        bough(mesh, stem_base, crown_tip, max(.022, limit * .00023), bark)


def shrub_canopy(mesh, points, colors):
    height = points[:, 1].max()
    leaves = points[:, 1] > .17 * height
    root = np.median(points[~leaves], axis=0)
    root[1] = 0
    bark = np.median(colors[~leaves], axis=0) * [.72, .78, .66]
    leaf_number = 0
    for index, section in enumerate(cluster(points[leaves], 4, axes=(0, 1, 2))):
        volume = points[leaves][section]
        hues = colors[leaves][section]
        olive = hues[hues[:, 1] > hues[:, 0] * .87]
        palette = np.median(olive if len(olive) else hues, axis=0)
        branch_tip = np.median(volume, axis=0)
        branch_tip[1] = np.quantile(volume[:, 1], .78)
        delta = branch_tip - root
        side = np.array([-delta[2], 0, delta[0]])
        side *= .009 / max(np.linalg.norm(side), .01)
        mesh.add(
            [root - side, root + side, branch_tip + side * .18, branch_tip - side * .18],
            [bark, bark, bark * .8, bark * .9], [(0, 1, 2), (0, 2, 3)],
        )
        target = int(np.argmin(np.linalg.norm(volume - branch_tip, axis=1)))
        separation = np.full(len(volume), np.inf)
        for detail in range(4 - index % 2):
            center = volume[target]
            tone = (.66 * palette + .34 * hues[target]) * [.77, .86, .72]
            tone *= .83 + ((index * 2 + detail) % 4) * .075
            direction = leaf_number * (math.pi * (3 - math.sqrt(5)))
            leaf_number += 1
            length = .082 + (detail % 3) * .015
            diagonal = np.array([math.cos(direction), (-1) ** detail * .23, math.sin(direction)]) * length
            across = np.array([-math.sin(direction), .06, math.cos(direction)]) * length * .47
            mesh.add(
                [center - diagonal * .73, center + across, center + diagonal, center - across * .81],
                [tone * .87, tone, tone * 1.09, tone * .93], [(0, 1, 2), (0, 2, 3)],
            )
            separation = np.minimum(separation, np.sum((volume - center) ** 2, axis=1))
            target = int(np.argmax(separation))
    leaf_height = max(point[1] for point in mesh.positions)
    for point in mesh.positions:
        point[1] *= height / leaf_height


def landmark_mesh(asset, simplified):
    original, original_colors = source_geometry(asset)
    document, binary = TOOLS["read_glb"](simplified)
    primitive = document["meshes"][0]["primitives"][0]
    points = accessor(document, binary, primitive["attributes"]["POSITION"])
    faces = accessor(document, binary, primitive["indices"]).astype(int).reshape(-1, 3)
    limit = SILHOUETTE_LIMITS[asset]
    if len(faces) > limit:
        points, faces = limit_landmark_triangles(points, faces, limit)
    # The detail model and the silhouette share the normalized 25 m landmark.
    lower, upper = points.min(axis=0), points.max(axis=0)
    desired_min, desired_max = original.min(axis=0), original.max(axis=0)
    points = desired_min + (points - lower) / (upper - lower) * (desired_max - desired_min)
    if len(faces) > SILHOUETTE_LIMITS[asset]:
        raise ValueError(f"Landmark simplification exceeded its scene budget: {asset} ({len(faces)} tris)")
    distances, nearby = cKDTree(original).query(points, k=5)
    weights = 1 / np.maximum(distances, .01)
    colors = np.sum(original_colors[nearby] * weights[:, :, None], axis=1) / weights.sum(axis=1)[:, None]
    mesh = Mesh()
    mesh.add(points, colors, faces)
    return mesh.record()


def limit_landmark_triangles(points, faces, limit):
    """Collapse any remaining tiny leaf boundaries into their linked surface."""
    initial = points.min(axis=0)
    height = points[:, 1].max() - initial[1]
    for cells in range(58, 10, -1):
        keys = np.rint((points - initial) * cells / height).astype(int)
        _unique, remap, counts = np.unique(keys, axis=0, return_inverse=True, return_counts=True)
        collapsed = remap[faces]
        nondegenerate = (collapsed[:, 0] != collapsed[:, 1]) & (collapsed[:, 0] != collapsed[:, 2]) & (collapsed[:, 1] != collapsed[:, 2])
        collapsed = collapsed[nondegenerate]
        _keys, indexes = np.unique(np.sort(collapsed, axis=1), axis=0, return_index=True)
        if len(indexes) > limit:
            continue
        vertices = np.stack([np.bincount(remap, weights=points[:, axis]) / counts for axis in range(3)], axis=1)
        selected = collapsed[np.sort(indexes)]
        keep, selection = np.unique(selected, return_inverse=True)
        return vertices[keep], selection.reshape(-1, 3)
    raise ValueError("Could not fit landmark into triangle budget")


def make_mesh(asset):
    points, colors = source_geometry(asset)
    mesh = Mesh()
    limit = SILHOUETTE_LIMITS[asset]
    if asset == "g02":
        grass_silhouette(mesh, points, colors)
    elif asset == "w01b":
        reed_silhouette(mesh, points, colors)
    elif asset == "shrub-2":
        shrub_canopy(mesh, points, colors)
    elif asset in ("t01", "t02", "t03"):
        lower, upper = points.min(axis=0), points.max(axis=0)
        green = (colors[:, 1] > colors[:, 0] * .87) & (colors[:, 2] < colors[:, 1] * .82)
        stem, bark = trunk(mesh, points[~green], colors[~green], upper[1], upper[0] - lower[0])
        poplar_canopy(mesh, points[green], colors[green], stem, bark, asset, limit)
    else:
        count = {"c01b": 2, "c02": 2, "c03b": 3, "c04": 2, "r04": 3,
                 "rock-shrub-3": 2, "s02": 2, "s04b": 2, "shrub-2": 2}.get(asset, 1)
        for section in cluster(points, count):
            hull(mesh, points[section], colors[section], limit // count)
    assert len(mesh.indices) <= limit, asset
    # Fit the true footprint without shifting the runtime pivot used for LOD changes.
    geometry = np.asarray(mesh.positions)
    for axis in (0, 2):
        coords = geometry[:, axis]
        source = points[:, axis]
        for select, side in ((min, coords < 0), (max, coords > 0)):
            if any(side):
                coords[side] *= select(source) / select(coords[side])
    mesh.positions = geometry
    return mesh.record()


def source_text(blender, geometry_only=False):
    with TemporaryDirectory(prefix="dunhuang-landmark-overlook-") as directory:
        stage = Path(directory)
        landmarks = {asset: stage / f"{asset}.glb" for asset in SILHOUETTE_LIMITS if asset.startswith("tower-tree-")}
        jobs = [
            {"source": str(source_path(asset)), "destination": str(destination), "limit": SILHOUETTE_LIMITS[asset]}
            for asset, destination in landmarks.items()
        ]
        spec = stage / "jobs.json"
        spec.write_text(json.dumps(jobs))
        if not geometry_only:
            result = subprocess.run([
                str(blender), "--background", "--factory-startup", "--python-exit-code", "1",
                "--python", str(Path(__file__).with_name("prepare-desert-landmark-meshes-v001.py")),
                "--", str(spec),
            ], capture_output=True, text=True)
            if result.returncode:
                raise RuntimeError(result.stdout + result.stderr)
        entries = {
            asset: landmark_mesh(asset, landmarks[asset]) if asset in landmarks else make_mesh(asset)
            for asset in SILHOUETTE_LIMITS
            if not geometry_only or asset not in {"t01", "t02", "t03", *landmarks}
        }
    header = """// Baked from the registered desert GLBs. Regenerate with prepare-desert-decoration-overlook-v001.py.
export interface DesertDecorationOverlookMesh {
  positions: readonly number[];
  colors: readonly number[];
  indices: readonly number[];
}

export const DESERT_DECORATION_OVERLOOK: Readonly<Record<string, DesertDecorationOverlookMesh>> = {
"""
    lines = [
        f'  "{name}": {json.dumps(values, separators=(",", ":"))},'
        for name, values in entries.items()
    ]
    print(f"{len(entries)} silhouettes, {sum(len(a['indices']) // 3 for a in entries.values())} triangles total.")
    return header + "\n".join(lines) + "\n};\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--geometry-only", action="store_true", help="Build v002 ground decoration geometry; trees use rendered captures")
    parser.add_argument("--blender", type=Path, default=TOOLS["BLENDER"])
    args = parser.parse_args()
    destination = DESTINATION.with_name("desert-decoration-overlook-v002.ts") if args.geometry_only else DESTINATION
    content = source_text(args.blender, args.geometry_only)
    if args.geometry_only:
        content = content.replace("overlook-v001.py.", "overlook-v001.py --geometry-only.")
    if args.verify:
        if destination.read_text() != content:
            raise ValueError("The checked-in silhouettes differ from their GLB derivatives.")
    else:
        destination.write_text(content)


if __name__ == "__main__":
    main()

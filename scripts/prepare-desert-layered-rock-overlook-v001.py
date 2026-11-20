#!/usr/bin/env python3
"""Reduce the corrected R02 model while preserving all four sandstone layers."""

from __future__ import annotations

import argparse
import gzip
import json
import math
from pathlib import Path
import runpy

import numpy as np
from PIL import Image, ImageChops, ImageDraw
from scipy.spatial import ConvexHull

from asset_intake import digest, read_json, write_json


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("public/assets/world/desert-decoration/v006/r02.glb")
REGISTRATION = Path("art-source/world/desert-decoration/v006/r02.json")
OUTPUT = Path("src/content/world/desert-decoration-layered-rock-v006.ts")
MANIFEST = ROOT / "art-source/world/desert-decoration/v006/r02-overlook.json"
SUPPORT_POINTS_PER_LAYER = 15
RECIPE = runpy.run_path(str(Path(__file__).with_name("prepare-desert-decoration-overlook-v001.py")))


def source_layers(vertices, indices):
    neighbors = [set() for _ in vertices]
    for a, b, c in indices:
        neighbors[a].update((b, c))
        neighbors[b].update((a, c))
        neighbors[c].update((a, b))
    seen = set()
    for vertex in range(len(vertices)):
        if vertex in seen:
            continue
        group = {vertex}
        remaining = [vertex]
        while remaining:
            connected = neighbors[remaining.pop()] - group
            group.update(connected)
            remaining.extend(connected)
        seen.update(group)
        yield sorted(group)


def reduce_layers(positions, colors, faces):
    # Weld the coincident per-face GLB vertices, then find the four original
    # layers. Preserve their separate outlines when choosing support points.
    vertices, mapping, counts = np.unique(
        positions.round(6), axis=0, return_inverse=True, return_counts=True,
    )
    shades = np.column_stack([
        np.bincount(mapping, weights=colors[:, axis]) / counts for axis in range(3)
    ])
    layers = list(source_layers(vertices, mapping[faces]))
    if len(layers) != 4:
        raise ValueError("Expected four independently modeled R02 sandstone layers.")

    directions = []
    for step in range(-4, 5):
        elevation = step * math.pi / 10
        horizontal = math.cos(elevation)
        for index in range(32):
            azimuth = index * math.tau / 32
            directions.append([math.sin(azimuth) * horizontal, math.sin(elevation), math.cos(azimuth) * horizontal])

    reduced_positions, reduced_colors, reduced_faces = [], [], []
    for layer in layers:
        points = vertices[layer]
        projected = points @ np.array(directions).T
        expected = projected.max(axis=0)
        selected = list(dict.fromkeys([*points.argmin(axis=0), *points.argmax(axis=0)]))
        while len(selected) < SUPPORT_POINTS_PER_LAYER:
            gap = expected - projected[selected].max(axis=0)
            direction = int(gap.argmax())
            if gap[direction] <= 1e-9:
                break
            selected.append(int(projected[:, direction].argmax()))

        outline = points[selected]
        hull = ConvexHull(outline)
        for face, plane in zip(hull.simplices.copy(), hull.equations):
            a, b, c = outline[face]
            if np.dot(np.cross(b - a, c - a), plane[:3]) < 0:
                face[1], face[2] = face[2], face[1]
            reduced_faces.append(face + len(reduced_positions))
        reduced_positions.extend(outline)
        reduced_colors.extend(shades[np.array(layer)[selected]])
    return np.asarray(reduced_positions).round(4), np.asarray(reduced_colors).round(3), np.asarray(reduced_faces)


def silhouette_scores(original, reduced):
    def mask(geometry, yaw, pitch):
        points, faces = geometry
        direction = np.array([math.sin(yaw), 0, math.cos(yaw)])
        right = np.array([math.cos(yaw), 0, -math.sin(yaw)])
        up = np.array([0, math.cos(pitch), 0]) - direction * math.sin(pitch)
        pixels = list(zip(115 + 165 * (points @ right), 160 - 165 * (points @ up)))
        image = Image.new("1", (230, 210))
        draw = ImageDraw.Draw(image)
        for face in faces:
            draw.polygon([pixels[vertex] for vertex in face], fill=1)
        return image

    measurements = []
    for elevation in (5, 16, 32):
        for azimuth in range(0, 360, 45):
            yaw, pitch = math.radians(azimuth), math.radians(elevation)
            a, b = (mask(geometry, yaw, pitch) for geometry in (original, reduced))
            intersection = ImageChops.logical_and(a, b).histogram()[255]
            union = ImageChops.logical_or(a, b).histogram()[255]
            measurements.append(round(intersection / union, 4))
    return measurements


def format_array(values):
    flat = values.ravel().tolist()
    rows = [", ".join(json.dumps(value) for value in flat[index:index + 12]) for index in range(0, len(flat), 12)]
    return "[\n    " + ",\n    ".join(rows) + ",\n  ]"


def derive():
    source = ROOT / SOURCE
    registration = read_json(ROOT / REGISTRATION)
    if digest(source) != registration["sha256"]:
        raise ValueError("The corrected R02 model differs from its registered file.")
    positions, colors, faces = RECIPE["render_mesh"](source)
    reduced_positions, reduced_colors, reduced_faces = reduce_layers(positions, colors, faces)
    result = "// Generated from the corrected R02 GLB by prepare-desert-layered-rock-overlook-v001.py.\n"
    result += "export const LAYERED_ROCK_OVERLOOK = {\n"
    for name, values in (("positions", reduced_positions), ("colors", reduced_colors), ("indices", reduced_faces)):
        result += f"  {name}: {format_array(values)},\n"
    result += "};\n"

    common_bounds = [positions.min(axis=0), positions.max(axis=0)]
    if not np.allclose([reduced_positions.min(axis=0), reduced_positions.max(axis=0)], common_bounds, atol=.0001):
        raise ValueError("The distant rock moved relative to its registered pivot or footprint.")
    scores = silhouette_scores((positions, faces), (reduced_positions, reduced_faces))
    gzip_bytes = len(gzip.compress(result.encode(), mtime=0))
    if not 60 <= len(reduced_faces) <= 110 or gzip_bytes > 2 * 1024 or min(scores) < .86 or np.mean(scores) < .90:
        raise ValueError("R02 silhouette or size fell outside the distant model limits.")
    return result, {
        "version": 6,
        "asset": "r02",
        "source": SOURCE.as_posix(),
        "sourceSha256": registration["sha256"],
        "sourceRegistration": REGISTRATION.as_posix(),
        "runtimeSource": OUTPUT.as_posix(),
        "sourceBounds": {"min": common_bounds[0].tolist(), "max": common_bounds[1].tolist()},
        "sourceTriangles": len(faces),
        "triangles": len(reduced_faces),
        "gzipBytes": gzip_bytes,
        "silhouette": {"azimuthStepDegrees": 45, "elevationsDegrees": [5, 16, 32], "intersectionOverUnion": scores},
    }


def verify():
    record = read_json(MANIFEST)
    if not record or digest(ROOT / OUTPUT) != record["sha256"] or digest(ROOT / SOURCE) != record["sourceSha256"]:
        raise ValueError("The R02 silhouette differs from its registered derivative.")
    print(f'{record["triangles"]} triangles, {record["gzipBytes"]:,} gzip bytes')


def prepare():
    if read_json(MANIFEST):
        verify()
        return
    text, record = derive()
    path = ROOT / OUTPUT
    path.write_text(text)
    write_json(MANIFEST, {**record, "sha256": digest(path), "bytes": path.stat().st_size})
    verify()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true")
    if parser.parse_args().verify:
        verify()
    else:
        prepare()

#!/usr/bin/env python3
"""Prepare the source 灌木丛1 surface for the sandbox environment."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
from pathlib import Path
import runpy
import subprocess
from tempfile import TemporaryDirectory

import numpy as np

from asset_intake import AssetIntake, VAULT_PREFIX, digest, publish_file, read_json, staged_path, write_json


ROOT = Path(__file__).resolve().parents[1]
WORKER = Path(__file__).with_name("prepare-desert-small-tree-v001.py")
SHRUB_ID = "shrub-1"
TEXTURE_SIZE = 256
NEAR_TRIANGLES = 950
FAR_TRIANGLES = 360
NEAR_GZIP_BUDGET = 45 * 1024
FAR_GZIP_BUDGET = 5 * 1024
FILES = {
    "near": Path("public/assets/world/desert-decoration/v006/shrub-1.glb"),
    "fallback": Path("src/content/world/desert-decoration-shrub-v006.ts"),
    "bounds": Path("src/content/world/desert-decoration-bounds-v006.json"),
}
MANIFEST = ROOT / "art-source/world/desert-decoration/v006/shrub-1.json"


def verify():
    record = read_json(MANIFEST)
    if not record:
        raise ValueError("No prepared shrub has been registered.")
    for name, path in FILES.items():
        result = record[name]
        resolved = ROOT / path
        if result["path"] != path.as_posix() or resolved.stat().st_size != result["bytes"]:
            raise ValueError(f"Registered shrub asset path or length differs: {resolved}")
        if digest(resolved) != result["sha256"]:
            raise ValueError(f"Registered shrub asset bytes differ: {resolved}")
    print(json.dumps({name: record[name] for name in ("near", "fallback", "silhouette")}, indent=2))


def run_derivation(source, stage, worker, tools):
    paths = {
        "near": stage / "shrub-1-near.glb",
        "fallback": stage / "shrub-1-fallback.glb",
    }
    local_source = stage / "shrub-1-source.glb"
    local_source.symlink_to(source)
    spec = stage / "jobs.json"
    spec.write_text(json.dumps([
        {"source": str(local_source), "destination": str(paths[name]),
         "target": target, "texture": TEXTURE_SIZE}
        for name, target in (("near", NEAR_TRIANGLES), ("fallback", FAR_TRIANGLES))
    ]))
    subprocess.run([
        str(worker["BLENDER"]), "--background", "--factory-startup", "--python-exit-code", "1",
        "--python", str(WORKER), "--", "--blender-jobs", str(spec),
    ], check=True)
    source_doc, _binary, source_prim = worker["get_surface"](source, tools)
    model_doc, model_bin, model_prim = worker["get_surface"](paths["near"], tools)
    normals = tools["accessor"](model_doc, model_bin, model_prim["attributes"]["NORMAL"])
    if not np.isfinite(normals).all() or np.max(np.abs(np.linalg.norm(normals, axis=1) - 1)) > .01:
        raise ValueError("Shrub derivative contains invalid surface normals.")
    near_data = worker["near_glb"](paths["near"], tools, asset_id=SHRUB_ID, generator="Dunhuang low shrub derivative")
    fallback_text, far_triangles = worker["fallback_text"](
        paths["fallback"], tools, export_name="SHRUB_1_OVERLOOK",
        description="original low shrub GLB", generator=Path(__file__).name,
    )
    far_data = fallback_text.encode()
    near_gzip = len(gzip.compress(near_data, compresslevel=3, mtime=0))
    far_gzip = len(gzip.compress(far_data, compresslevel=3, mtime=0))
    near_triangles = model_doc["accessors"][model_prim["indices"]]["count"] // 3
    if near_gzip > NEAR_GZIP_BUDGET or not 600 <= near_triangles <= NEAR_TRIANGLES:
        raise ValueError(f"Near shrub budget exceeded: {near_gzip} gzip bytes and {near_triangles} triangles")
    if far_gzip > FAR_GZIP_BUDGET or not 100 <= far_triangles <= FAR_TRIANGLES:
        raise ValueError(f"Far shrub budget exceeded: {far_gzip} gzip bytes and {far_triangles} triangles")
    bounds = tools["TOOLS"]["runtime_geometry"](paths["near"])
    sizes = {axis: bounds[axis] for axis in ("width", "height", "depth")}
    bounds_data = (json.dumps({SHRUB_ID: sizes}, indent=2) + "\n").encode()
    silhouette = worker["silhouette_scores"](source, [paths["near"], paths["fallback"]], tools)
    if min(silhouette["near"]) < .88 or min(silhouette["fallback"]) < .69:
        raise ValueError(f"Shrub silhouettes depart from the source mesh: {silhouette}")
    result = {"sourceTriangles": source_doc["accessors"][source_prim["indices"]]["count"] // 3,
              "silhouette": silhouette}
    output = {
        "near": (near_data, {"gzip3Bytes": near_gzip, "triangles": near_triangles, "maxTexture": TEXTURE_SIZE}),
        "fallback": (far_data, {"gzip3Bytes": far_gzip, "triangles": far_triangles}),
        "bounds": (bounds_data, {}),
    }
    return output, result


def prepare(source):
    worker = runpy.run_path(str(WORKER))
    tools = runpy.run_path(str(WORKER.with_name("prepare-desert-tree-impostors-v001.py")))
    intake = AssetIntake(ROOT)
    with intake.transaction():
        if read_json(MANIFEST):
            verify()
            return
        original = intake.original(VAULT_PREFIX + digest(source), local=source, validate=tools["TOOLS"]["read_glb"])
        with TemporaryDirectory(prefix="dunhuang-low-shrub-") as directory:
            assets, metadata = run_derivation(original.path, Path(directory), worker, tools)
        record = {"version": 6, "id": SHRUB_ID, "sourceName": source.name,
                  "originalPath": original.reference, "sourceSha256": original.sha256,
                  "sourceBytes": original.path.stat().st_size, **metadata}
        for name, (data, metadata) in assets.items():
            path = ROOT / FILES[name]
            checksum = hashlib.sha256(data).hexdigest()
            with staged_path(path.parent) as staged:
                staged.write_bytes(data)
                publish_file(staged, path, checksum)
            record[name] = {"path": FILES[name].as_posix(), "bytes": len(data), "sha256": checksum, **metadata}
        write_json(MANIFEST, record)
    verify()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path)
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    if args.verify:
        verify()
    elif args.source:
        prepare(args.source)
    else:
        parser.error("Pass --source or --verify.")

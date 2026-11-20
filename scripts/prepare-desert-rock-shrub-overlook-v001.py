#!/usr/bin/env python3
"""Reduce the existing rock-shrub GLB to a small inlined 3D silhouette."""

from __future__ import annotations

import argparse
import gzip
import json
from pathlib import Path
import runpy
import subprocess
from tempfile import TemporaryDirectory

from asset_intake import AssetIntake, digest, read_json, write_json


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("public/assets/world/desert-decoration/v001/rock-shrub-3.glb")
OUTPUT = Path("src/content/world/desert-decoration-rock-shrub-v005.ts")
MANIFEST = ROOT / "art-source/world/desert-decoration/v005/rock-shrub-3-overlook.json"
TRIANGLE_TARGET = 215
BYTE_BUDGET = 4096


def verify():
    record = read_json(MANIFEST)
    if not record or digest(ROOT / OUTPUT) != record["sha256"]:
        raise ValueError("The rock-shrub silhouette differs from its recorded derivative.")
    if digest(ROOT / SOURCE) != record["sourceSha256"]:
        raise ValueError("The original running rock-shrub GLB has changed.")
    print(f'{record["triangles"]} triangles, {record["gzipBytes"]:,} gzip bytes')


def derive(intake):
    worker = Path(__file__).with_name("prepare-desert-small-tree-v001.py")
    small_tree = runpy.run_path(str(worker))
    tools = runpy.run_path(str(Path(__file__).with_name("prepare-desert-tree-impostors-v001.py")))
    source = ROOT / SOURCE
    document, _binary, primitive = small_tree["get_surface"](source, tools)
    bounds = document["accessors"][primitive["attributes"]["POSITION"]]
    lower, upper = bounds["min"], bounds["max"]
    registry = read_json(ROOT / "art-source/world/desert-decoration/v001/manifest.json")
    source_reference = next(asset["sourceVault"] for asset in registry["assets"] if asset["id"] == "rock-shrub-3")
    original = intake.existing(source_reference)
    if not original:
        raise FileNotFoundError(f"Missing source asset: {source_reference}")
    with TemporaryDirectory(prefix="dunhuang-rock-shrub-") as directory:
        stage = Path(directory)
        model = stage / "overlook.glb"
        original_glb = stage / "original.glb"
        original_glb.symlink_to(original.path)
        spec = stage / "jobs.json"
        spec.write_text(json.dumps([{
            "source": str(original_glb), "destination": str(model), "target": TRIANGLE_TARGET,
            "texture": 512,
        }]))
        subprocess.run([
            str(small_tree["BLENDER"]), "--background", "--factory-startup", "--python-exit-code", "1",
            "--python", str(worker), "--", "--blender-jobs", str(spec),
        ], check=True)
        text, triangles = small_tree["fallback_text"](
            model, tools, fit_bounds=(lower, upper), export_name="ROCK_SHRUB_3_OVERLOOK",
            description="original rock-shrub GLB", generator=Path(__file__).name,
        )
    gzip_size = len(gzip.compress(text.encode(), mtime=0))
    if not 110 <= triangles <= 220 or gzip_size > BYTE_BUDGET:
        raise ValueError(f"Unexpected silhouette cost: {triangles} triangles, {gzip_size} gzip bytes")
    return text, {
        "version": 1, "source": SOURCE.as_posix(), "sourceSha256": digest(source),
        "sourceBounds": {"min": lower, "max": upper},
        "originalPath": original.reference, "originalSha256": original.sha256,
        "runtimeSource": OUTPUT.as_posix(), "triangles": triangles, "gzipBytes": gzip_size,
    }


def prepare():
    intake = AssetIntake(ROOT)
    with intake.transaction():
        if read_json(MANIFEST):
            verify()
            return
        text, record = derive(intake)
        destination = ROOT / OUTPUT
        destination.write_text(text)
        write_json(MANIFEST, {**record, "sha256": digest(destination), "bytes": destination.stat().st_size})
    verify()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true")
    if parser.parse_args().verify:
        verify()
    else:
        prepare()

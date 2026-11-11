#!/usr/bin/env python3
"""Derive the 1K balcony ensemble while preserving its model and placement."""

import hashlib
import io
import json
from pathlib import Path
import runpy

from PIL import Image, __version__ as PILLOW_VERSION


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/assets/world/music-balcony-ensemble/v001/ensemble.glb"
OUTPUT = ROOT / "public/assets/world/music-balcony-ensemble/v002/ensemble.glb"
MANIFEST = ROOT / "art-source/world/models/music-balcony-ensemble/v002/asset-manifest.json"
GLB_TOOLS = ROOT / "scripts/prepare-mogao-exhibit-interior-mobile-v001.py"
TEXTURE_SIZE = (1024, 1024)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    tools = runpy.run_path(str(GLB_TOOLS))
    original = SOURCE.read_bytes()
    meta, binary = tools["unpack_glb"](original)
    base_colors = {
        meta["textures"][material["pbrMetallicRoughness"]["baseColorTexture"]["index"]]["source"]
        for material in meta["materials"]
        if "baseColorTexture" in material.get("pbrMetallicRoughness", {})
    }
    assert base_colors == set(range(len(meta["images"]))) == set(range(4))
    replacements = {}
    changes = []
    for image in meta["images"]:
        assert image["mimeType"] == "image/jpeg"
        index = image["bufferView"]
        payload = tools["buffer_data"](meta, binary, index)
        with Image.open(io.BytesIO(payload)) as source:
            assert source.mode == "RGB" and source.size == (4096, 4096)
            assert source.getexif().get(274, 1) == 1
            reduced = source.resize(TEXTURE_SIZE, Image.Resampling.LANCZOS)
            profile = source.info.get("icc_profile")
        encoded = io.BytesIO()
        reduced.save(encoded, format="JPEG", quality=92, subsampling=0, optimize=True, icc_profile=profile)
        replacement = encoded.getvalue()
        replacements[index] = replacement
        changes.append({
            "name": image["name"],
            "source": {"size": [4096, 4096], "bytes": len(payload), "sha256": sha(payload)},
            "output": {"size": TEXTURE_SIZE, "bytes": len(replacement), "sha256": sha(replacement)},
        })

    result = tools["repack"](meta, binary, replacements, {})
    tools["verify"](meta, binary, result, replacements)
    unchanged = [tools["buffer_data"](meta, binary, index)
                 for index in range(len(meta["bufferViews"])) if index not in replacements]
    manifest = {
        "version": "music-balcony-ensemble-v002",
        "source": {"path": str(SOURCE.relative_to(ROOT)), "bytes": len(original), "sha256": sha(original)},
        "output": {"path": str(OUTPUT.relative_to(ROOT)), "bytes": len(result), "sha256": sha(result)},
        "tool": {"script": str(Path(__file__).resolve().relative_to(ROOT)), "pillow": PILLOW_VERSION,
                 "resampler": "Lanczos", "encoding": "JPEG quality 92, 4:4:4"},
        "changes": changes,
        "verification": {"unchangedBufferViews": len(unchanged), "unchangedBufferViewsSha256": sha(b"".join(unchanged)),
                         "metadataEqualExcept": ["BIN buffer length", "buffer view offsets and lengths"]},
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    tools["write_new_or_identical"](OUTPUT, result)
    tools["write_new_or_identical"](MANIFEST, (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    print(f"{OUTPUT.relative_to(ROOT)}: {len(original):,} → {len(result):,} bytes, {len(changes)} textures at 1024²")


if __name__ == "__main__":
    main()

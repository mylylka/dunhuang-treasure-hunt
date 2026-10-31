#!/usr/bin/env python3
"""Archive and resize the approved three-image story proof; never repaint artwork.

Requires Pillow, already available in the project environment. Run with the source
library path as the first argument. Existing originals are never overwritten.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path

from PIL import Image, ImageOps, __version__ as pillow_version

ROOT = Path(__file__).resolve().parents[1]
SPECS = (
    ("nine-colored-deer-scroll", "九色鹿全图.jpg", "full-scroll.webp", 4096, None),
    ("nine-colored-deer-rescue", "鹿王救人+溺水者立誓.jpg", "rescue-and-promise.webp", 1400,
     {"x": 6, "y": 0, "width": 2994, "height": 2150}),
    ("nine-colored-deer-appeal", "鹿王陈情.jpg", "appeal-to-the-king.webp", 1400,
     {"x": 3398, "y": 0, "width": 2507, "height": 2150}),
)


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def keep_or_create(path: Path, data: bytes) -> None:
    if path.exists():
        if path.read_bytes() != data:
            raise RuntimeError(f"Existing version differs; use a new version directory: {path}")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def prepare(source: Path) -> None:
    archive = ROOT / "art-source/world/nine-colored-deer/v001"
    runtime = ROOT / "public/assets/world/story/v001"
    records = []
    for asset_id, source_name, output_name, max_side, viewport in SPECS:
        original = source / source_name
        raw = original.read_bytes()
        keep_or_create(archive / source_name, raw)
        with Image.open(io.BytesIO(raw)) as original_image:
            original_size = original_image.size
            image = ImageOps.exif_transpose(original_image).convert("RGB")
            image.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
            encoded = io.BytesIO()
            image.save(encoded, "WEBP", quality=88, method=6)
            result = encoded.getvalue()
            keep_or_create(runtime / output_name, result)
            records.append({
                "id": asset_id,
                "sourceFile": source_name,
                "sourceSha256": digest(raw),
                "sourceWidth": original_size[0], "sourceHeight": original_size[1],
                "sourceBytes": len(raw),
                "runtimeFile": f"assets/world/story/v001/{output_name}",
                "runtimeSha256": digest(result),
                "runtimeWidth": image.width, "runtimeHeight": image.height,
                "runtimeBytes": len(result),
                "fullScrollCorrespondence": viewport,
                "processing": "EXIF orientation, RGB conversion, Lanczos fit without crop, WebP quality 88; no content edits",
                "visualReview": "No obvious platform watermark in the three preview images; cracks and losses retained",
            })
    manifest = {
        "version": 1,
        "stage": "graybox-two-segment-technical-preview",
        "providedBy": "开发者",
        "sourceLibraryName": source.name,
        "creator": None,
        "imageIdentity": "用户提供的九色鹿故事图；摄影、临摹或其他复制图像的身份及原作者尚未确认。",
        "storyReference": {"title": "敦煌研究院：莫高窟第257窟", "url": "https://www.dha.ac.cn/info/1425/3548.htm"},
        "referenceScope": "仅核对故事题材与情节，不作为用户文件权属或洞窟3D陈设的认定。",
        "pillowVersion": pillow_version,
        "files": records,
    }
    keep_or_create(archive / "source-manifest.json", (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode())
    print(json.dumps({"files": records, "runtimeTotalBytes": sum(r["runtimeBytes"] for r in records)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="User's 3D visual library directory")
    prepare(parser.parse_args().source)

#!/usr/bin/env python3
"""Derive the mobile main chamber by resizing its two embedded floor images."""

import hashlib
import io
import json
import math
import struct
import sys
from copy import deepcopy
from pathlib import Path

from PIL import Image, __version__ as PILLOW_VERSION


ROOT = Path(__file__).resolve().parents[1]
UPPER_VERSION = "v003" if "--aligned-exhibit" in sys.argv else "v002"
OUTPUT_ASSET = "mogao-upper/v003" if UPPER_VERSION == "v003" else "mogao-exhibit/v001"
SOURCE = ROOT / f"public/assets/world/mogao-upper/{UPPER_VERSION}/interior.glb"
OUTPUT = ROOT / f"public/assets/world/{OUTPUT_ASSET}/interior-mobile.glb"
MANIFEST_DIR = "models/mogao-upper/v003" if UPPER_VERSION == "v003" else "mogao-exhibit/v001"
MANIFEST = ROOT / f"art-source/world/{MANIFEST_DIR}/interior-mobile-manifest.json"
COLLISION = ROOT / f"src/content/world/mogao-upper-{UPPER_VERSION}.json"
SIZE = (1024, 1024)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def unpack_glb(data):
    magic, version, length = struct.unpack_from("<4sII", data)
    assert (magic, version, length) == (b"glTF", 2, len(data))
    json_length, json_kind = struct.unpack_from("<I4s", data, 12)
    start = 20 + json_length
    bin_length, bin_kind = struct.unpack_from("<I4s", data, start)
    assert (json_kind, bin_kind, start + 8 + bin_length) == (b"JSON", b"BIN\0", length)
    meta = json.loads(data[20:start])
    assert meta["buffers"] == [{"byteLength": bin_length}]
    return meta, data[start + 8:]


def buffer_data(meta, binary, index):
    view = meta["bufferViews"][index]
    assert view["buffer"] == 0
    start = view.get("byteOffset", 0)
    return binary[start:start + view["byteLength"]]


def normalize_normals(image):
    # Lanczos averages tangent-space vectors. Restore unit length after
    # sampling and keep the conventional neutral normal for a zero vector.
    raw = image.tobytes()
    out = bytearray(len(raw))
    for i in range(0, len(raw), 3):
        x, y, z = raw[i] - 127.5, raw[i + 1] - 127.5, raw[i + 2] - 127.5
        length = math.sqrt(x * x + y * y + z * z)
        scale = 127.5 / length if length >= 1 else 0
        out[i] = round(127.5 + x * scale)
        out[i + 1] = round(127.5 + y * scale)
        out[i + 2] = round(127.5 + z * scale) if scale else 255
    return Image.frombytes("RGB", image.size, bytes(out))


def derive_image(name, original):
    with Image.open(io.BytesIO(original)) as image:
        assert image.mode == "RGB" and image.size == (2048, 2048)
        assert image.getexif().get(274, 1) == 1, "An authored EXIF rotation needs separate review"
        reduced = image.resize(SIZE, Image.Resampling.LANCZOS)
    file = io.BytesIO()
    if name == "floor-normal":
        normalize_normals(reduced).save(file, format="PNG", optimize=True)
        return file.getvalue(), "image/png"
    assert name == "floor-albedo"
    reduced.save(file, format="JPEG", quality=92, subsampling=0, optimize=True)
    return file.getvalue(), "image/jpeg"


def pack_glb(meta, binary):
    encoded = json.dumps(meta, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    encoded += b" " * (-len(encoded) % 4)
    size = 28 + len(encoded) + len(binary)
    return (struct.pack("<4sIII4s", b"glTF", 2, size, len(encoded), b"JSON") + encoded
            + struct.pack("<I4s", len(binary), b"BIN\0") + binary)


def repack(original_meta, original_bin, replacements, formats):
    meta = deepcopy(original_meta)
    binary = bytearray()
    previous_end = 0
    for i, view in enumerate(meta["bufferViews"]):
        start = view.get("byteOffset", 0)
        assert start >= previous_end
        assert not any(original_bin[previous_end:start]), "A non-padding gap must be preserved"
        previous_end = start + view["byteLength"]
        binary.extend(b"\0" * (-len(binary) % 4))
        if "byteOffset" in view or binary:
            view["byteOffset"] = len(binary)
        data = replacements.get(i)
        if data is None:
            data = buffer_data(original_meta, original_bin, i)
        view["byteLength"] = len(data)
        binary.extend(data)
    assert not any(original_bin[previous_end:])
    binary.extend(b"\0" * (-len(binary) % 4))
    meta["buffers"][0]["byteLength"] = len(binary)
    for image in meta["images"]:
        if image["name"] in formats:
            image["mimeType"] = formats[image["name"]]
    return pack_glb(meta, bytes(binary))


def verify(source_meta, source_bin, result, replacements):
    meta, binary = unpack_glb(result)
    normalized = deepcopy(meta)
    assert len(meta["bufferViews"]) == len(source_meta["bufferViews"])
    for i, view in enumerate(normalized["bufferViews"]):
        original_view = source_meta["bufferViews"][i]
        original = buffer_data(source_meta, source_bin, i)
        current = buffer_data(meta, binary, i)
        assert current == replacements.get(i, original), f"Unexpected binary change in buffer view {i}"
        assert view.get("byteOffset", 0) % 4 == 0
        view["byteLength"] = original_view["byteLength"]
        if "byteOffset" in original_view:
            view["byteOffset"] = original_view["byteOffset"]
        else:
            view.pop("byteOffset", None)
    normalized["buffers"][0]["byteLength"] = source_meta["buffers"][0]["byteLength"]
    for i, image in enumerate(meta["images"]):
        if image["bufferView"] not in replacements:
            continue
        with Image.open(io.BytesIO(buffer_data(meta, binary, image["bufferView"]))) as decoded:
            decoded.load()
            assert decoded.size == SIZE and decoded.mode == "RGB"
            assert Image.MIME[decoded.format] == image["mimeType"]
        normalized["images"][i]["mimeType"] = source_meta["images"][i]["mimeType"]
    assert normalized == source_meta, "Only image MIME and BIN offsets/lengths may differ"


def write_new_or_identical(path, data):
    if path.exists():
        if path.read_bytes() != data:
            raise FileExistsError(f"Refusing to replace a different existing file: {path}")
    else:
        with path.open("xb") as file:
            file.write(data)


def main():
    original = SOURCE.read_bytes()
    meta, binary = unpack_glb(original)
    images = {image["name"]: image for image in meta["images"]}
    replacements = {}
    formats = {}
    changes = []
    for name in ("floor-normal", "floor-albedo"):
        image = images[name]
        index = image["bufferView"]
        assert not any(accessor.get("bufferView") == index for accessor in meta["accessors"])
        assert not any(
            part.get("bufferView") == index
            for accessor in meta["accessors"]
            for part in (accessor.get("sparse", {}).get("indices", {}), accessor.get("sparse", {}).get("values", {}))
        )
        assert sum(entry["bufferView"] == index for entry in meta["images"]) == 1
        pixels = buffer_data(meta, binary, index)
        encoded, mime = derive_image(name, pixels)
        replacements[index], formats[name] = encoded, mime
        changes.append({
            "name": name,
            "bufferView": index,
            "source": {"size": [2048, 2048], "mime": image["mimeType"], "bytes": len(pixels), "sha256": sha(pixels)},
            "output": {"size": SIZE, "mime": mime, "bytes": len(encoded), "sha256": sha(encoded)},
        })
    result = repack(meta, binary, replacements, formats)
    verify(meta, binary, result, replacements)
    manifest = {
        "version": "mogao-exhibit-interior-mobile-v001",
        "source": {"path": str(SOURCE.relative_to(ROOT)), "bytes": len(original), "sha256": sha(original)},
        "output": {"path": str(OUTPUT.relative_to(ROOT)), "bytes": len(result), "sha256": sha(result)},
        "tool": {"pillow": PILLOW_VERSION, "resampler": "Lanczos", "floorNormal": "PNG, normalized tangent vectors",
                 "floorAlbedo": "JPEG quality 92, 4:4:4"},
        "changes": changes,
        "verification": {
            "unchangedBufferViews": len(meta["bufferViews"]) - len(replacements),
            "unchangedEmbeddedImages": len(meta["images"]) - len(changes),
            "metadataEqualExcept": ["BIN buffer length", "buffer view offsets and lengths", "floor-albedo MIME"],
            "collisionAndCameraSource": {"path": str(COLLISION.relative_to(ROOT)), "sha256": sha(COLLISION.read_bytes())},
        },
    }
    write_new_or_identical(OUTPUT, result)
    write_new_or_identical(MANIFEST, (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    print(f"{OUTPUT.relative_to(ROOT)}: {len(original):,} → {len(result):,} bytes ({100 * (1 - len(result) / len(original)):.1f}% smaller)")


if __name__ == "__main__":
    main()

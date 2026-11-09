"""Archive the two delivered devices and build smaller, self-contained GLBs."""

import argparse
import hashlib
import io
import json
from pathlib import Path
import struct

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "art-source/world/models/pattern-interactives/v001"
RUNTIME = ROOT / "public/assets/world/pattern-interactives/v001"
DEVICES = (
    ("coloring-station", "第一馆涂色互动装置.glb", "第一馆涂色互动装置安装图.png"),
    ("mural-station", "第一馆壁画互动装置.glb", "第一馆壁画互动装置安装示意图.png"),
)
ATLAS_SIZE = (2048, 2048)


def glb_chunks(data):
    if struct.unpack_from("<4sII", data) != (b"glTF", 2, len(data)):
        raise ValueError("Expected a valid GLB v2 header")
    json_length, json_type = struct.unpack_from("<I4s", data, 12)
    bin_start = 20 + json_length
    bin_length, bin_type = struct.unpack_from("<I4s", data, bin_start)
    if json_type != b"JSON" or bin_type != b"BIN\0" or bin_start + 8 + bin_length != len(data):
        raise ValueError("Expected JSON and BIN chunks")
    return json.loads(data[20:bin_start]), data[bin_start + 8:]


def pack_glb(document, binary):
    header = json.dumps(document, ensure_ascii=False, separators=(",", ":")).encode()
    header += b" " * (-len(header) % 4)
    return (
        struct.pack("<4sIII4s", b"glTF", 2, 28 + len(header) + len(binary), len(header), b"JSON")
        + header
        + struct.pack("<I4s", len(binary), b"BIN\0")
        + binary
    )


def runtime_device(original):
    document, binary = glb_chunks(original)
    mesh, = document["meshes"]
    primitive, = mesh["primitives"]
    image, = document["images"]
    atlas_view = image["bufferView"]
    indices = document["accessors"][primitive["indices"]]
    position = document["accessors"][primitive["attributes"]["POSITION"]]
    index_view = indices["bufferView"]
    if (
        primitive["mode"] != 4
        or image["mimeType"] != "image/jpeg"
        or indices["componentType"] != 5125
        or indices["byteOffset"] != 0
        or indices["max"][0] >= 65536
    ):
        raise ValueError("Source layout changed. Review the texture and index conversion.")

    packed = bytearray()
    for i, view in enumerate(document["bufferViews"]):
        start = view["byteOffset"]
        block = binary[start:start + view["byteLength"]]
        if i == atlas_view:
            with Image.open(io.BytesIO(block)) as atlas:
                if atlas.size != (4096, 4096) or atlas.mode != "RGB":
                    raise ValueError("Expected the supplied 4096×4096 RGB atlas")
                resized = io.BytesIO()
                atlas.resize(ATLAS_SIZE, Image.Resampling.LANCZOS).save(
                    resized, "JPEG", quality=92, subsampling=0, optimize=True,
                    icc_profile=atlas.info.get("icc_profile"),
                )
                block = resized.getvalue()
        if i == index_view:
            values = [value for value, in struct.iter_unpack("<I", block)]
            if len(values) != indices["count"] or max(values) != indices["max"][0]:
                raise ValueError("Index accessor does not match the source buffer")
            block = struct.pack(f"<{len(values)}H", *values)
            indices["componentType"] = 5123
        view["byteOffset"] = len(packed)
        view["byteLength"] = len(block)
        packed.extend(block)
        packed.extend(b"\0" * (-len(packed) % 4))

    buffer, = document["buffers"]
    buffer["byteLength"] = len(packed)
    metrics = {
        "bounds": {"min": position["min"], "max": position["max"]},
        "front": [0, 0, 1],
        "vertices": position["count"],
        "triangles": indices["count"] // 3,
        "sourceAtlasSize": [4096, 4096],
        "runtimeAtlasSize": list(ATLAS_SIZE),
    }
    return pack_glb(document, packed), metrics


def file_record(name, data):
    return {"file": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Directory containing the four supplied files")
    args = parser.parse_args()
    records = []
    writes = {}
    for stem, source_name, reference_name in DEVICES:
        original = (args.source / source_name).read_bytes()
        reference = (args.source / reference_name).read_bytes()
        runtime, metrics = runtime_device(original)
        runtime_name = f"{stem}.glb"
        records.append({
            "id": stem,
            "source": file_record(source_name, original),
            "installationReference": file_record(reference_name, reference),
            "runtime": file_record(runtime_name, runtime),
            **metrics,
        })
        writes.update({
            ARCHIVE / source_name: original,
            ARCHIVE / reference_name: reference,
            RUNTIME / runtime_name: runtime,
        })

    manifest = {
        "version": 1,
        "runtimeProcessing": "Lanczos 2048 px JPEG atlas, quality 92, 4:4:4; exact 16-bit index encoding.",
        "devices": records,
    }
    writes[ARCHIVE / "export-manifest.json"] = (
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"
    ).encode()
    for path, data in writes.items():
        if path.exists() and path.read_bytes() != data:
            raise ValueError(f"Refusing to replace a different versioned file: {path}")
    for path, data in writes.items():
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
    print(json.dumps(manifest, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

"""Derive a lighter indoor finish for the first hall mural station."""

import io
import json
from pathlib import Path
import runpy

from PIL import Image, ImageEnhance, ImageStat


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/assets/world/pattern-interactives"
SOURCE = ASSETS / "v001/mural-station.glb"
TARGET = ASSETS / "v002/mural-station.glb"
MANIFEST = ROOT / "art-source/world/models/pattern-interactives/v002/mural-finish-manifest.json"

TONE_EXPONENT = 0.84
SATURATION = 0.93
BOUNCE_FACTOR = [0.09, 0.085, 0.08]


def lighten_atlas(data):
    with Image.open(io.BytesIO(data)) as original:
        if original.mode != "RGB":
            raise ValueError("Expected the RGB color atlas")
        lift = [round(255 * (value / 255) ** TONE_EXPONENT) for value in range(256)]
        lighter = ImageEnhance.Color(original.point(lift * 3)).enhance(SATURATION)
        output = io.BytesIO()
        lighter.save(
            output, "JPEG", quality=94, subsampling=0, optimize=True,
            icc_profile=original.info.get("icc_profile"),
        )
        return output.getvalue(), {
            "atlasSize": list(original.size),
            "sourceMeanLuma": round(ImageStat.Stat(original.convert("L")).mean[0], 2),
            "runtimeMeanLuma": round(ImageStat.Stat(lighter.convert("L")).mean[0], 2),
        }


def main():
    helpers = runpy.run_path(str(ROOT / "scripts/build-world-pattern-interactives-v001.py"))
    source_data = SOURCE.read_bytes()
    document, source_buffer = helpers["glb_chunks"](source_data)
    image, = document["images"]
    material, = document["materials"]
    if image["mimeType"] != "image/jpeg" or "emissiveTexture" in material:
        raise ValueError("Review the source atlas and material before deriving this finish")

    atlas_index = image["bufferView"]
    texture = material["pbrMetallicRoughness"]["baseColorTexture"]["index"]
    blocks = []
    for view in document["bufferViews"]:
        start = view["byteOffset"]
        blocks.append(source_buffer[start:start + view["byteLength"]])
    atlas, metrics = lighten_atlas(blocks[atlas_index])
    packed = bytearray()
    for index, view in enumerate(document["bufferViews"]):
        block = atlas if index == atlas_index else blocks[index]
        view.update(byteOffset=len(packed), byteLength=len(block))
        packed.extend(block)
        packed.extend(b"\0" * (-len(packed) % 4))
    document["buffers"][0]["byteLength"] = len(packed)

    # A low atlas-tinted contribution restores color in the indoor shade.
    material["emissiveTexture"] = {"index": texture}
    material["emissiveFactor"] = BOUNCE_FACTOR
    output_data = helpers["pack_glb"](document, packed)
    file_record = helpers["file_record"]
    record = {
        "source": file_record(str(SOURCE.relative_to(ROOT)), source_data),
        "runtime": file_record(str(TARGET.relative_to(ROOT)), output_data),
        "toneExponent": TONE_EXPONENT,
        "saturation": SATURATION,
        "atlasTintedBounceFactor": BOUNCE_FACTOR,
        **metrics,
    }
    manifest_data = (json.dumps(record, ensure_ascii=False, indent=2) + "\n").encode()
    writes = {TARGET: output_data, MANIFEST: manifest_data}
    for path, data in writes.items():
        if path.exists() and path.read_bytes() != data:
            raise ValueError(f"Refusing to replace a different versioned file: {path}")
    for path, data in writes.items():
        if not path.exists():
            path.write_bytes(data)
    print(manifest_data.decode(), end="")


if __name__ == "__main__":
    main()

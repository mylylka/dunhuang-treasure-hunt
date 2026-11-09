"""Downsize the first-floor story images for the wall-painting folio."""

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "src/content/world"
ASSETS = ROOT / "public/assets/world"
PAPER = ASSETS / "mogao-exhibit/v008/paper"


def read_config(filename):
    return json.loads((CONTENT / filename).read_text(encoding="utf-8"))


def story_images():
    deer = read_config("nine-colored-deer-v002.json")
    deer_media = read_config("story-media-v002.json")
    deer_folder = ASSETS / "story/v002"
    yield "deer-full", deer_folder / deer_media["full-scroll"]["file"]
    for scene in deer["segments"]:
        for image in scene["images"]:
            image_id = image["id"]
            yield f"deer-{image_id}", deer_folder / deer_media[image_id]["file"]

    novice = read_config("novice-story-v001.json")
    novice_folder = ASSETS / "novice-story/v001"
    yield "novice-full", novice_folder / novice["fullImage"]["file"]
    for scene in novice["segments"]:
        for image in scene["images"]:
            yield f"novice-{image['id']}", novice_folder / image["file"]


def main():
    PAPER.mkdir(parents=True, exist_ok=True)
    total = 0
    for name, source in story_images():
        limit = 1120 if name.endswith("-full") else 280
        output = PAPER / f"{name}.webp"
        with Image.open(source) as image:
            image.thumbnail((limit, limit), Image.Resampling.LANCZOS)
            image.save(output, quality=72, method=6)
        size = output.stat().st_size
        total += size
        print(f"{output.name}: {image.width}x{image.height}, {size:,} bytes")
    print(f"First-floor folio images: {total:,} bytes")


if __name__ == "__main__":
    main()

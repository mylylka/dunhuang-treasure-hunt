"""Archive the supplied exhibit pack and produce versioned WebP derivatives."""

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / "art-source/world/mogao-exhibit/v001"
PUBLIC = ROOT / "public/assets/world/mogao-exhibit/v001"
CONFIG = ROOT / "src/content/world/mogao-exhibit-v001.json"
PREFIX = "mogao-exhibit/v001"
ITEM_IDS = [f"{wall}{n:02}" for wall in "ABCD" for n in range(1, 4)]
SUPPLIED_REFERENCE_ONLY = {"C02", "D01"}
HEADINGS = {
    "A": ("佛教东来", "异域造像与本土神话"),
    "B": ("盛世兴茂", "丝路服饰与唐风人物"),
    "C": ("多元敦煌", "不同民族留下的面孔"),
    "D": ("守护之形", "从药叉到披甲天王"),
}
SCROLL_PROMPT = (
    "Create one game inventory reward icon as a bitmap sprite for a calm Dunhuang museum exploration game. "
    "A compact rolled ancient Chinese handscroll, tilted slightly from lower left to upper right, tied in the "
    "middle with a thin dark cinnabar red silk cord and a small simple knot; warm tawny parchment wraps visible, "
    "two short dark walnut end caps with understated brushed bronze rims. Subtle old paper fibres, warm ambient "
    "gallery light, restrained shaded illustration with a softly dimensional hand-painted finish, crisp readable "
    "silhouette even at a 48 px display. Single centered object, occupies about 82% of square canvas, ample "
    "transparent padding, isolated on genuinely transparent background, no square badge, no hands, no scenery, "
    "no decorative halo, no text, no letters, no writing, no logo, no watermark. Historically inspired game UI "
    "decorative prop."
)


def archive(source: Path, name: str | None = None) -> dict:
    contents = source.read_bytes()
    target = ARCHIVE / (name or source.name)
    if target.exists() and target.read_bytes() != contents:
        raise ValueError(f"Archive already has a different file: {target}")
    if not target.exists():
        target.write_bytes(contents)
    return {"file": target.name, "sha256": hashlib.sha256(contents).hexdigest()}


def write_json(path: Path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def derivatives(source: Path, exhibit_id: str) -> tuple[dict, str, int]:
    name = exhibit_id.lower()
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original).convert("RGB")
    image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    photo = f"{name}.webp"
    image.save(PUBLIC / photo, quality=88, method=5)
    display = {"path": f"{PREFIX}/{photo}", "width": image.width, "height": image.height}
    image.thumbnail((240, 240), Image.Resampling.LANCZOS)
    thumb = f"{name}-thumb.webp"
    image.save(PUBLIC / thumb, quality=78, method=4)
    return display, f"{PREFIX}/{thumb}", (PUBLIC / thumb).stat().st_size


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--scroll-image", type=Path)
    args = parser.parse_args()
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    documents = [archive(path) for path in sorted(args.source.glob("0[0-5]_*.md"))]
    data_path = args.source / "05_展品数据.json"
    documents.append(archive(data_path))
    pack = json.loads(data_path.read_text(encoding="utf-8"))
    if [wall["id"] for wall in pack["walls"]] != list("ABCD"):
        raise ValueError("Expected walls A through D in order.")
    if [item["id"] for item in pack["items"]] != ITEM_IDS:
        raise ValueError("Expected three named exhibits per wall in order.")
    walls = []
    for wall in pack["walls"]:
        title, subtitle = HEADINGS[wall["id"]]
        walls.append({"id": wall["id"], "title": title, "subtitle": subtitle,
                      "years": wall["years"], "intro": wall["intro"]})
    items = []
    references = []
    thumb_bytes = 0
    for item in pack["items"]:
        exhibit_id = item["id"]
        image = thumb = None
        original = args.source / item["local"]
        source = archive(original) if original.is_file() else None
        if source:
            image, thumb, size = derivatives(original, exhibit_id)
            thumb_bytes += size
        references.append({**(source or {}), "id": exhibit_id, "imageSource": item["img"],
                           "referencePage": item["page"], "credit": item["rights"],
                           "status": item["status"], "previewImage": image,
                           "thumbnail": thumb})
        entry = {field: item[field] for field in (
            "id", "wall", "period", "cave", "location", "type", "title", "note", "look", "voice", "page", "img"
        )}
        items.append({**entry, "image": image, "thumb": thumb, "referenceOnly": exhibit_id in SUPPLIED_REFERENCE_ONLY})
    if thumb_bytes > 150 * 1024:
        raise ValueError(f"Scroll thumbnails use {thumb_bytes} bytes (limit 150 KiB).")
    write_json(CONFIG, {"title": pack["title"], "entrance": pack["entrance"], "walls": walls, "items": items})
    existing_scroll = ARCHIVE / "reward-scroll-original.png"
    if args.scroll_image:
        archive(args.scroll_image, existing_scroll.name)
    scroll = None
    if existing_scroll.exists():
        with Image.open(existing_scroll) as original:
            image = original.convert("RGBA")
        alpha = image.getchannel("A")
        if alpha.getextrema()[0] == 255:
            raise ValueError("Expected real transparency in the generated scroll sprite.")
        image = image.crop(alpha.getbbox())
        image.thumbnail((256, 256), Image.Resampling.LANCZOS)
        image.save(PUBLIC / "reward-scroll.webp", quality=85, method=5)
        scroll = {**archive(existing_scroll), "tool": "OpenAI built-in imagegen",
                  "transparentBackground": True, "prompt": SCROLL_PROMPT,
                  "runtime": f"{PREFIX}/reward-scroll.webp"}
    write_json(ARCHIVE / "source-manifest.json", {
        "purpose": "本地试玩参考。C02/D01 使用用户补发的转载参考图，发布前另核来源与使用许可。",
        "documents": documents, "references": references, "thumbBytes": thumb_bytes,
        "rewardScroll": scroll,
    })
    print(f"{len(items)} exhibit entries, {sum(item['image'] is not None for item in items)} images, {thumb_bytes} thumbnail bytes.")


if __name__ == "__main__":
    main()

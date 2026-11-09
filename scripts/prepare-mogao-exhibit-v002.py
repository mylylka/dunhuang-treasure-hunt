"""Publish derivatives from the approved B-hall review without changing its source images."""

import argparse
from copy import deepcopy
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / "art-source/world/mogao-exhibit/v002"
PUBLIC = ROOT / "public/assets/world/mogao-exhibit/v002"
CONTENT = ROOT / "src/content/world"
PREFIX = "mogao-exhibit/v002"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def archive(source, name):
    contents = source.read_bytes()
    target = ARCHIVE / name
    if target.exists() and target.read_bytes() != contents:
        raise ValueError(f"Different version already archived at {target}")
    if not target.exists():
        target.write_bytes(contents)
    return {"file": name, "sha256": hashlib.sha256(contents).hexdigest()}


def title_texture(source, name, lighten=False):
    with Image.open(source) as image:
        title = image.convert("RGBA")
    if lighten:
        alpha = title.getchannel("A")
        title = Image.new("RGBA", title.size, (223, 201, 165))
        title.putalpha(alpha)
    title.thumbnail((1120, 1120), Image.Resampling.LANCZOS)
    title.save(PUBLIC / name, lossless=True, method=6)
    return f"{PREFIX}/{name}"


def artwork(source, name):
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original).convert("RGB")
    image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    image.save(PUBLIC / name, quality=85, method=6)
    return {"path": f"{PREFIX}/{name}", "width": image.width, "height": image.height}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("review", type=Path, nargs="?", default=ARCHIVE / "approved-layout.json",
                        help="Approved wall-layout-v005.json or the archived review")
    args = parser.parse_args()
    review = read_json(args.review)
    archived_review = deepcopy(review)
    archived_walls = {wall["id"]: wall for wall in archived_review["walls"]}
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    drawings = []
    layouts = []
    for wall in review["walls"]:
        key = wall["id"]
        archived_wall = archived_walls[key]
        source = args.review.parent / wall["titleAsset"]
        title = title_texture(source, f"title-{key.lower()}.webp", lighten=key in ("B", "C"))
        archived_title = archive(source, f"title-{key.lower()}.png")
        archived_wall["titleAsset"] = archived_title["file"]
        drawings.append({**archived_title, "runtime": title})
        layout = {field: wall[field] for field in ("id", "width", "titleBox")}
        layout["titlePath"] = title
        layout["panels"] = [{field: panel[field] for field in ("id", "rect", "crop")} for panel in wall["panels"]]
        if "opening" in wall:
            layout["opening"] = wall["opening"]
        if "plaque" in wall:
            plaque = wall["plaque"]
            source = args.review.parent / plaque["textAsset"]
            path = title_texture(source, "plaque-d.webp")
            archived_plaque = archive(source, "plaque-d.png")
            archived_wall["plaque"]["textAsset"] = archived_plaque["file"]
            drawings.append({**archived_plaque, "runtime": path})
            layout["plaque"] = {"rect": plaque["rect"], "path": path}
        for panel in archived_wall["panels"]:
            if not panel["id"].startswith("C03"):
                panel.pop("asset", None)
        layouts.append(layout)
    write_json(CONTENT / "mogao-exhibit-layout-v002.json", {
        "height": review["height"], "floorWorldY": review["floorWorldY"], "walls": layouts,
    })

    content_path = CONTENT / "mogao-exhibit-v001.json"
    content = read_json(content_path)
    c03 = next(item for item in content["items"] if item["id"] == "C03")
    c_wall = next(wall for wall in review["walls"] if wall["id"] == "C")
    supplied = {panel["id"]: args.review.parent / panel["asset"] for panel in c_wall["panels"] if panel["id"].startswith("C03")}
    images = []
    for panel_id, field in (("C03", "image"), ("C03-detail", "detailImage")):
        name = panel_id.lower()
        source = supplied[panel_id]
        image = artwork(source, f"{name}.webp")
        c03[field] = image
        archived_image = archive(source, f"{name}-original{source.suffix}")
        archived_panel = next(panel for panel in archived_walls["C"]["panels"] if panel["id"] == panel_id)
        archived_panel["asset"] = archived_image["file"]
        images.append({**archived_image, "exhibitId": "C03", "runtime": image})

    with Image.open(supplied["C03"]) as original:
        thumbnail = ImageOps.exif_transpose(original).convert("RGB")
    thumbnail.thumbnail((240, 240), Image.Resampling.LANCZOS)
    thumbnail.save(PUBLIC / "c03-thumb.webp", quality=76, method=4)
    c03["thumb"] = f"{PREFIX}/c03-thumb.webp"
    c03["referenceOnly"] = True
    thumb_bytes = sum((PUBLIC.parent.parent / item["thumb"]).stat().st_size for item in content["items"] if item["thumb"])
    if thumb_bytes > 150 * 1024:
        raise ValueError(f"Review thumbnails total {thumb_bytes} bytes (limit 150 KiB)")
    write_json(content_path, content)
    write_json(ARCHIVE / "approved-layout.json", archived_review)
    write_json(ARCHIVE / "source-manifest.json", {
        "review": "wall-layout-v005，D 墙牌匾边纹与四墙批准稿",
        "exhibitSource": "用户交付的第 3 窟千手千眼观音整图与局部参考图",
        "referencePage": c03["page"],
        "designSources": drawings,
        "images": images,
        "thumbBytes": thumb_bytes,
    })
    print(f"{len(layouts)} walls, 13 image faces, {thumb_bytes} bytes across 12 review thumbnails")


if __name__ == "__main__":
    main()

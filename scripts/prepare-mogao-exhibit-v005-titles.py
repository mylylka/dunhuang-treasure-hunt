"""Replace only the subtitle ink in the four approved B-hall title textures."""

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "src/content/world"
ART = ROOT / "art-source/world"
ASSETS = ROOT / "public/assets/world"
REVISION = "mogao-exhibit/v005"
FONT = "/System/Library/Fonts/Supplemental/Songti.ttc"
SCALE = 600
LIGHT, BOLD = 3, 1
INK = (197, 175, 143, 255)

# Local typesetting parameters from the v002 and v003 source title images.
# The horizontal C subtitle is raised 75 mm to leave air above its lotus.
SUBTITLES = {
    "A": (1.31, .40, .177, .200),
    "B": (.13, .40, .177, .199),
    "C": (1.83, .245, .177, 0),
    "D": (1.04, .67, .175, .213),
}


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def subtitle_layer(size, key, text, weight, lift=0):
    layer = Image.new("RGBA", size)
    draw = ImageDraw.Draw(layer)
    x, y, em, pitch = SUBTITLES[key]
    font = ImageFont.truetype(FONT, round(em * SCALE), index=weight)
    for index, glyph in enumerate(text if pitch else [text]):
        left, top, right, _ = font.getbbox(glyph)
        align = (left + right) / 2 if pitch else left
        draw.text((x * SCALE - align, (y - lift + index * pitch) * SCALE - top), glyph, font=font, fill=INK)
    return layer


def world_ink(box, image):
    left, top, right, bottom = image.getbbox()
    dx, dy = box["w"] / image.width, box["h"] / image.height
    return {
        "x": round(box["x"] + left * dx, 6),
        "y": round(box["y"] + box["h"] - bottom * dy, 6),
        "w": round((right - left) * dx, 6),
        "h": round((bottom - top) * dy, 6),
    }


def main():
    layout = json.loads((CONTENT / "mogao-exhibit-layout-v003.json").read_text(encoding="utf-8"))
    content = json.loads((CONTENT / "mogao-exhibit-v001.json").read_text(encoding="utf-8"))
    subtitles = {wall["id"]: wall["subtitle"] for wall in content["walls"]}
    (ART / REVISION).mkdir(parents=True, exist_ok=True)
    (ASSETS / REVISION).mkdir(parents=True, exist_ok=True)
    records = []
    for wall in layout["walls"]:
        key = wall["id"]
        previous = Path(wall["titlePath"]).with_suffix(".png")
        with Image.open(ART / previous) as original:
            title = original.convert("RGBA")
        old_subtitle = subtitle_layer(title.size, key, subtitles[key], LIGHT)
        old_ink = old_subtitle.getbbox()
        if title.crop(old_ink).tobytes() != old_subtitle.crop(old_ink).tobytes():
            raise ValueError(f"{key} subtitle no longer matches the approved title texture")
        title.paste((0, 0, 0, 0), old_ink)
        subtitle = subtitle_layer(title.size, key, subtitles[key], BOLD, lift=.075 if key == "C" else 0)
        if title.crop(subtitle.getbbox()).getbbox():
            raise ValueError(f"{key} subtitle overlaps the main title")
        wall["titleInk"] = world_ink(wall["titleBox"], title)
        wall["subtitleInk"] = world_ink(wall["titleBox"], subtitle)
        title.alpha_composite(subtitle)
        title.save(ART / REVISION / previous.name, optimize=True)
        title.thumbnail((1120, 1120), Image.Resampling.LANCZOS)
        wall["titlePath"] = f"{REVISION}/{previous.with_suffix('.webp').name}"
        title.save(ASSETS / wall["titlePath"], lossless=True, method=6)
        records.append({"wall": key, "previous": str(previous), "source": previous.name, "runtime": wall["titlePath"]})
    write_json(CONTENT / "mogao-exhibit-layout-v004.json", layout)
    write_json(ART / REVISION / "title-manifest.json", {
        "typeface": "Songti SC",
        "subtitleWeight": "Bold",
        "horizontalSubtitleLiftMeters": .075,
        "titles": records,
    })


if __name__ == "__main__":
    main()

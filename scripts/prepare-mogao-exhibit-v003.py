"""Typeset the approved B/C heading revision at the A/D physical font sizes."""

from itertools import combinations
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "src/content/world"
ARCHIVE = ROOT / "art-source/world/mogao-exhibit/v003"
PUBLIC = ROOT / "public/assets/world/mogao-exhibit/v003"
SCALE = 600
FONT = "/System/Library/Fonts/Supplemental/Songti.ttc"
HEAD = (.395, 1, (227, 208, 176, 255))
SUB = (.177, 3, (197, 175, 143, 255))


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def overlaps(first, second):
    return all(
        max(first[axis], second[axis]) + 1e-6
        < min(first[axis] + first[span], second[axis] + second[span])
        for axis, span in (("x", "w"), ("y", "h"))
    )


def letter(draw, text, position, style, centered=False):
    size, index, ink = style
    font = ImageFont.truetype(FONT, round(size * SCALE), index=index)
    left, top, right, _ = font.getbbox(text)
    x, y = position
    x = x * SCALE - ((left + right) / 2 if centered else left)
    draw.text((x, y * SCALE - top), text, font=font, fill=ink)


def make_heading(wall, words):
    key = wall["id"]
    if key == "B":
        wall["titleBox"] = {"x": 13.42, "y": 3.56, "w": .71, "h": 2.40}
        for panel in wall["panels"]:
            panel["rect"]["x"] = round(panel["rect"]["x"] - .27, 2)
    else:
        wall["titleBox"] = {"x": .27, "y": 5.37, "w": 4.50, "h": .55}
    box = wall["titleBox"]
    canvas = Image.new("RGBA", (round(box["w"] * SCALE), round(box["h"] * SCALE)))
    draw = ImageDraw.Draw(canvas)
    title, subtitle = words["title"], words["subtitle"]
    if key == "B":
        for text, x, top, pitch, style in (
            (title, .50, .13, .455, HEAD),
            (subtitle, .13, .40, .199, SUB),
        ):
            for i, char in enumerate(text):
                letter(draw, char, (x, top + i * pitch), style, centered=True)
    else:
        letter(draw, title, (.04, .072), HEAD)
        letter(draw, subtitle, (1.83, .245), SUB)

    left, top, right, bottom = canvas.getbbox()
    assert 0 < left < right < canvas.width and 0 < top < bottom < canvas.height, key
    name = f"title-{key.lower()}"
    canvas.save(ARCHIVE / f"{name}.png", optimize=True)
    canvas.thumbnail((1120, 1120), Image.Resampling.LANCZOS)
    canvas.save(PUBLIC / f"{name}.webp", lossless=True, method=6)
    wall["titlePath"] = f"mogao-exhibit/v003/{name}.webp"


def main():
    layout = json.loads((CONTENT / "mogao-exhibit-layout-v002.json").read_text())
    words = json.loads((CONTENT / "mogao-exhibit-v001.json").read_text())
    labels = {wall["id"]: wall for wall in words["walls"]}
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    for wall in layout["walls"]:
        if wall["id"] not in ("B", "C"):
            continue
        make_heading(wall, labels[wall["id"]])
        boxes = [panel["rect"] for panel in wall["panels"]] + [wall["titleBox"]]
        if wall.get("opening"):
            boxes.append(wall["opening"])
        for box in boxes:
            assert 0 <= box["x"] < box["x"] + box["w"] <= wall["width"]
            assert 0 <= box["y"] < box["y"] + box["h"] <= layout["height"]
        assert not any(overlaps(a, b) for a, b in combinations(boxes, 2)), wall["id"]
    write_json(CONTENT / "mogao-exhibit-layout-v003.json", layout)
    write_json(ARCHIVE / "source-manifest.json", {
        "typeface": "Songti SC",
        "headingSizeMeters": HEAD[0],
        "subtitleSizeMeters": SUB[0],
        "design": "B 墙右起竖排，C 墙左上横排，统一 A/D 墙字号。",
        "sources": ["title-b.png", "title-c.png"],
    })


if __name__ == "__main__":
    main()

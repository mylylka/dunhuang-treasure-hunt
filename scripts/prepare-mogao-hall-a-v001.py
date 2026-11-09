"""Archive the A-hall source packages and derive its runtime artwork and signs."""

import argparse
import hashlib
import io
import json
import math
import re
from pathlib import Path
from shutil import copyfile

from PIL import Image, ImageCms, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
REVISION = "mogao-hall-a/v001"
ARCHIVE = ROOT / "art-source/world" / REVISION
ASSETS = ROOT / "public/assets/world" / REVISION
CONTENT = ROOT / "src/content/world/mogao-hall-a-v001.json"
HEITI = Path("/System/Library/Fonts/STHeiti Medium.ttc")
SCALE = 560
STORIES = [
    {
        "id": "bandits", "title": "五百强盗成佛图", "source": "莫高窟第285窟 · 西魏",
        "folder": "500强盗皈依佛门-285窟", "full": "500全图大.png", "full_limits": (2048, 3840),
        "text": "500强盗故事文本.txt", "coordinates": "500强盗局部图坐标信息.txt", "reference": (2048, 293),
        "segments": [
            ("defeat", "官兵镇压，强盗战败", "500局部1.png", (0, 0, 485, 293), (28, 124, 786, 600)),
            ("captured", "战败被俘", "500局部2.png", (257, 0, 534, 293), (760, 246, 1091, 602)),
            ("trial", "殿前审判", "500局部3.png", (450, 0, 762, 293), (899, 85, 1439, 602)),
            ("punishment", "受刑与流放", "500局部4.png", (899, 0, 1168, 293), (1855, 70, 2295, 549)),
            ("restored-sight", "得眼林中复明听法", "500局部5.png", (1100, 0, 1440, 293), (2302, 36, 2887, 546)),
            ("ordained", "剃度为僧", "500局部6.png", (1450, 0, 1750, 293), (3092, 92, 3606, 602)),
            ("forest", "山林修行", "500局部7.png", (1806, 0, 2048, 293), (3752, 3, 4157, 513)),
        ],
    },
    {
        "id": "burning-house", "title": "火宅喻", "source": "莫高窟第61窟 · 五代",
        "folder": "火宅喻61窟", "full": "61窟-法華經變「火宅喻」.jpg", "full_limits": (1536, 2304),
        "text": "火宅喻故事文本.txt", "coordinates": "火宅喻坐标信息", "reference": (2048, 1048),
        "segments": [
            ("fire", "宅院四面起火", "火宅喻局部1.png", (780, 0, 1995, 860), (962, 127, 2483, 913)),
            ("three-carts", "三车引诸子出火宅", "火宅喻局部2.png", (40, 570, 1270, 1008), (59, 715, 1598, 1261)),
        ],
    },
]


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def archive_file(downloads, story, name):
    upstream = Path(story["folder"]) / name
    destination = ARCHIVE / "supplied" / story["id"] / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    if not destination.exists():
        copyfile(downloads / upstream, destination)
    return destination, {
        "downloadsPath": str(upstream),
        "archivePath": str(destination.relative_to(ARCHIVE)),
        "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
    }


def normalized(rect, size):
    width, height = size
    return [round(value / (width if index % 2 == 0 else height), 8) for index, value in enumerate(rect)]


def srgb(source):
    if "icc_profile" in source.info:
        mode = "RGBA" if "A" in source.getbands() else "RGB"
        profile = ImageCms.ImageCmsProfile(io.BytesIO(source.info["icc_profile"]))
        return ImageCms.profileToProfile(source.convert(mode), profile, ImageCms.createProfile("sRGB"), outputMode=mode)
    return source.convert("RGBA" if "A" in source.getbands() else "RGB")


def artwork(source, name, limits):
    with Image.open(source) as original:
        master = srgb(original)
    result = {"width": master.width, "height": master.height}
    for device, limit, quality in zip(("mobile", "desktop"), limits, (78, 82)):
        image = master.copy()
        image.thumbnail((limit, limit), Image.Resampling.LANCZOS)
        filename = f"{name}-{device}.webp"
        image.save(ASSETS / filename, quality=quality, method=6)
        result[device] = f"{REVISION}/{filename}"
    master.thumbnail((900, 900) if name.endswith("-full") else (280, 280), Image.Resampling.LANCZOS)
    master.save(ASSETS / f"{name}-paper.webp", quality=77, method=6)
    return result


def read_story(path, story_id, count):
    text = path.read_text(encoding="utf-8-sig").strip()
    fields = re.split(r"^\s*(完整画面|局部\d+)\s*[:：]\s*", text, flags=re.MULTILINE)
    passages = [(label, body.strip()) for label, body in zip(fields[1::2], fields[2::2])]
    overview = passages[0][1]
    segments = [body for label, body in passages if label.startswith("局部")]
    if story_id == "bandits":
        overview, _, end = overview.partition("，故事以")
        overview += "。"
        ending = "故事以" + end
    else:
        ending = passages[-1][1]
    if passages[0][0] != "完整画面" or len(segments) != count or not ending or ending == "故事以":
        raise ValueError(f"Unrecognized story package structure: {path}")
    return overview, segments, ending


def derive_story(downloads, story):
    files = []

    def record(name):
        source, entry = archive_file(downloads, story, name)
        files.append(entry)
        return source

    story_id = story["id"]
    text = record(story["text"])
    record(story["coordinates"])
    full = artwork(record(story["full"]), f"{story_id}-full", story["full_limits"])
    full_size = (full["width"], full["height"])
    overview, passages, ending = read_story(text, story_id, len(story["segments"]))
    segments = []
    for index, ((segment_id, title, filename, region, focus), passage) in enumerate(zip(story["segments"], passages), 1):
        image = artwork(record(filename), f"{story_id}-detail-{index}", (1200, 1600))
        segments.append({
            "id": segment_id, "title": title, "text": passage,
            "region": normalized(region, story["reference"]), "focus": normalized(focus, full_size), "image": image,
        })
    return {
        "id": story_id, "title": story["title"], "source": story["source"], "overview": overview,
        "ending": ending, "full": full, "segments": segments,
    }, files


def heiti(font_path, height):
    return ImageFont.truetype(str(font_path), height, index=1 if font_path == HEITI else 0)


def ink(text, font_path, height, color):
    font = heiti(font_path, height)
    left, top, right, bottom = font.getbbox(text)
    layer = Image.new("RGBA", (right - left, bottom - top))
    ImageDraw.Draw(layer).text((-left, -top), text, font=font, fill=color)
    return layer.crop(layer.getbbox())


def title_sign(font_path, story, metres, align):
    width, height = (round(value * SCALE) for value in metres)
    image = Image.new("RGBA", (width, height))
    title = ink(story["title"], font_path, round(.45 * SCALE), "#e8d2a2")
    source = ink(story["source"], font_path, round(.17 * SCALE), "#d1b98e")
    right = (width + title.width) // 2
    line_x = right - source.width if align == "right" else (width - source.width) // 2
    y = round(.105 * SCALE)
    assert min(line_x, width - line_x - source.width) >= round(.06 * SCALE)
    image.alpha_composite(title, ((width - title.width) // 2, y))
    image.alpha_composite(source, (line_x, y + title.height + round(.09 * SCALE)))
    return image


def scrollwork(draw, origin, scale, flip):
    x, y = origin

    def point(a, b):
        return x + scale * a, y + flip * scale * b

    def curve(start, pieces, color, thickness=1):
        points = [point(*start)]
        a = start
        for b, c, d in pieces:
            for index in range(1, 25):
                t = index / 24
                u = 1 - t
                points.append(point(*(u ** 3 * a[j] + 3 * u ** 2 * t * b[j] + 3 * u * t ** 2 * c[j] + t ** 3 * d[j]
                                      for j in (0, 1))))
            a = d
        draw.line(points, color, max(1, round(scale * thickness)), joint="curve")

    gold = "#cdb489"
    curve((0, 0), [((18, 0), (26, -20), (42, -26)), ((58, -33), (74, -24), (72, -10)),
                   ((71, 4), (52, 8), (49, -4)), ((46, -13), (58, -16), (61, -9)),
                   ((64, -4), (58, 0), (55, -4))], gold, 1.6)
    for start, tip, bend in [((16, -5), (14, -24), (5, -15)), ((25, -12), (37, 2), (40, -7)),
                              ((35, -23), (27, -37), (19, -35)), ((49, -29), (60, -39), (50, -41)),
                              ((68, -24), (82, -32), (78, -19)), ((70, -1), (86, 8), (82, -3))]:
        curve(start, [(bend, tip, tip), (tip, (start[0] + 4, start[1] - 4), start)], gold, 1.1)


def plaque(font_path):
    width, height = (round(value * SCALE) for value in (2.45, 1.30))
    image = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(image)
    for row in range(height):
        tint = 5 * math.cos((row / height - .35) * math.pi) + .55 * math.sin(row * 2.4)
        draw.line((0, row, width, row), tuple(round(base + tint) for base in (230, 212, 176)))
    pattern = Image.new("RGB", (width - 64, height - 64), "#e9d7b4")
    ornament = ImageDraw.Draw(pattern)
    for row, y in enumerate(range(30, pattern.height + 55, 93)):
        for x in range(-70 + (row % 2) * 77, pattern.width + 100, 154):
            scrollwork(ornament, (x, y), 1.30, -1 if row % 2 else 1)
    image.paste(Image.blend(image.crop((32, 32, width - 32, height - 32)), pattern, .55), (32, 32))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((14, 14, width - 15, height - 15), radius=15, outline="#987343", width=6)
    draw.rounded_rectangle((27, 27, width - 28, height - 28), radius=10, outline="#b89359", width=3)
    label = ink("绘世厅", font_path, round(.70 * SCALE), "#3d2a1c")
    image.paste(label, ((width - label.width) // 2, (height - label.height) // 2), label)
    return image


def sign_asset(image, name):
    image.save(ARCHIVE / f"{name}.png", optimize=True)
    image.thumbnail((1120, 1120), Image.Resampling.LANCZOS)
    image.save(ASSETS / f"{name}.webp", lossless=True, method=6)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--downloads", type=Path, default=Path.home() / "Downloads")
    parser.add_argument("--font", type=Path, default=HEITI)
    options = parser.parse_args()
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    ASSETS.mkdir(parents=True, exist_ok=True)
    stories, source_files = [], []
    for specification in STORIES:
        story, sources = derive_story(options.downloads, specification)
        stories.append(story)
        source_files.extend(sources)
    write_json(CONTENT, {"stories": stories})
    sign_asset(title_sign(options.font, stories[0], (3.48, .88), "right"), "title-bandits")
    sign_asset(title_sign(options.font, stories[1], (1.80, .94), "center"), "title-burning-house")
    sign_asset(plaque(options.font), "plaque")
    write_json(ARCHIVE / "source-manifest.json", {
        "files": source_files,
        "imageDerivation": "Pillow Lanczos WebP quality 78 mobile and 82 desktop, method 6; supplied ICC converted to sRGB",
        "paperImages": "WebP quality 77, method 6; maximum side 900 px for whole murals and 280 px for individual details",
        "coordinates": "Narrative rectangles from the user's coordinate files; detail crops calibrated against the full originals in the hall A media study",
        "mediaStudy": "work/world/mogao-exhibit-v001/hall-a-design-v001/media-study.md",
        "signs": {"typeface": heiti(options.font, 32).getname()[0], "titleD": [3.48, .88], "titleC": [1.80, .94], "plaqueD": [2.45, 1.30]},
    })


if __name__ == "__main__":
    main()

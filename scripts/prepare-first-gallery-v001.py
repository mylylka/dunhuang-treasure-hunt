#!/usr/bin/env python3
"""Register the supplied mural photographs and cut the original image into repair pieces."""
import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / "art-source/world/first-gallery/v001"
RUNTIME = ROOT / "public/assets/world/first-gallery/v001"
FULL_NAME = "藻井馆新背景墙-完整.png"
WORN_NAME = "藻井馆新背景墙-脱落版.png"

# Forward transform estimated on surviving painted landmarks (29 inliers,
# median reprojection error 0.56 px). Complete artwork is the reference frame.
SCALE = 0.9985392561984506
SKEW = 0.00028296646060276416
OFFSET = (1.0084692735698, 0.7012344810520971)
SIZE = (2168, 725)

# All coordinates were traced against the 2168×725 complete source. The
# restoration region is deliberately wider than the missing puzzle piece.
REGIONS = {
    "lotus": {
        "crop": (735, 42, 1433, 642),
        "restore": [(1068, 54), (1169, 73), (1234, 119), (1318, 161),
                    (1376, 235), (1415, 352), (1373, 467), (1300, 555),
                    (1184, 616), (1077, 650), (969, 619), (854, 548),
                    (784, 470), (753, 352), (784, 253), (840, 166),
                    (946, 102), (1016, 82)],
        "piece": [(1084, 68), (1074, 87), (1050, 105), (1028, 124),
                  (1014, 144), (1010, 164), (1024, 179), (1032, 196),
                  (1044, 184), (1065, 168), (1083, 147), (1095, 163),
                  (1110, 178), (1138, 195), (1147, 179), (1156, 163),
                  (1154, 146), (1144, 126), (1122, 107), (1100, 90)],
        "variants": ("rotate-left", "correct", "rotate-right"),
    },
    "bird": {
        "crop": (205, 54, 1960, 307),
        "restore": [(233, 67), (327, 47), (472, 52), (602, 61),
                    (714, 68), (760, 152), (768, 231), (727, 293),
                    (621, 316), (511, 305), (405, 289), (292, 269),
                    (244, 211), (215, 144)],
        "piece": [(270, 231), (326, 245), (387, 251), (440, 240),
                  (473, 220), (415, 227), (353, 219), (287, 196),
                  (349, 206), (402, 210), (445, 207), (479, 195),
                  (432, 190), (407, 171), (394, 155), (374, 146),
                  (341, 122), (387, 116), (343, 108), (408, 101),
                  (460, 106), (417, 84), (487, 81), (531, 90),
                  (551, 107), (551, 132), (571, 141), (591, 129),
                  (606, 110), (626, 92), (643, 87), (660, 89),
                  (676, 88), (662, 98), (652, 116), (637, 135),
                  (635, 164), (624, 189), (646, 199), (676, 226),
                  (700, 257), (720, 282), (690, 277), (661, 261),
                  (629, 258), (603, 244), (582, 245), (559, 238),
                  (522, 243), (494, 253), (449, 271), (397, 278),
                  (415, 265), (370, 269), (320, 259), (287, 245)],
        "variants": ("mirror", "correct"),
    },
    "grapes": {
        "crop": (1457, 337, 1930, 632),
        "restore": [(1459, 393), (1544, 344), (1648, 339), (1744, 342),
                    (1850, 364), (1911, 433), (1916, 524), (1861, 595),
                    (1756, 628), (1640, 624), (1542, 593), (1479, 523),
                    (1443, 454)],
        # The endpoints are both in the visible, curved tendril above the fruit.
        "piece": [(1623, 385), (1673, 386), (1700, 389), (1698, 414),
                  (1689, 438), (1640, 438), (1623, 430)],
        "variants": ("flip", "rotate-180", "correct"),
    },
}


def archive_source(name):
    stored = ARCHIVE / name
    if not stored.exists():
        shutil.copyfile(Path.home() / "Downloads" / name, stored)
    return stored


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def aligned_worn(full, worn):
    determinant = SCALE * SCALE + SKEW * SKEW
    a, b, d, e = SCALE / determinant, -SKEW / determinant, SKEW / determinant, SCALE / determinant
    tx, ty = OFFSET
    inverse = (a, b, -a * tx - b * ty, d, e, -d * tx - e * ty)
    affine = Image.Transform.AFFINE
    fit = worn.transform(SIZE, affine, inverse, Image.Resampling.BICUBIC)
    validity = Image.new("L", worn.size, 255).transform(SIZE, affine, inverse, Image.Resampling.BILINEAR)
    return Image.composite(fit, full, validity)


def outline(points, blur=0):
    mask = Image.new("L", SIZE)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    return mask.filter(ImageFilter.GaussianBlur(blur)) if blur else mask


def variant_piece(piece, variant):
    if variant.startswith("rotate-"):
        angle = {"rotate-left": 30, "rotate-right": -31, "rotate-180": 180}[variant]
        piece = piece.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC)
    elif variant == "mirror":
        piece = ImageOps.mirror(piece)
    elif variant == "flip":
        piece = ImageOps.flip(piece)
    return piece


def tile(piece, scale):
    piece = piece.resize((round(piece.width * scale), round(piece.height * scale)), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (320, 192))
    canvas.alpha_composite(piece, ((320 - piece.width) // 2, (192 - piece.height) // 2))
    return canvas


def main():
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    RUNTIME.mkdir(parents=True, exist_ok=True)
    full_path, worn_path = archive_source(FULL_NAME), archive_source(WORN_NAME)
    full, worn = (Image.open(path).convert("RGB") for path in (full_path, worn_path))
    if full.size != SIZE or worn.size != (2170, 725):
        raise ValueError("The archived source dimensions changed; trace and register again.")
    aligned = aligned_worn(full, worn)
    full.save(RUNTIME / "mural-full.jpg", quality=94, subsampling=0, optimize=True)
    aligned.save(RUNTIME / "mural-worn.jpg", quality=94, subsampling=0, optimize=True)
    outputs = [RUNTIME / f"mural-{part}.jpg" for part in ("full", "worn")]

    for name, region in REGIONS.items():
        mask = outline(region["restore"], 17)
        mask_path = RUNTIME / f"mural-{name}-mask.png"
        mask.convert("RGB").save(mask_path, optimize=True)
        outputs.append(mask_path)

        hole = outline(region["piece"], 1.25)
        work = Image.composite(aligned, full, hole).crop(region["crop"])
        board_path = RUNTIME / f"mural-{name}-board.jpg"
        work.save(board_path, quality=91, subsampling=0, optimize=True)
        outputs.append(board_path)
        # A fractional antialias pass keeps the source motifs crisp at any size.
        rgba = full.convert("RGBA")
        rgba.putalpha(outline(region["piece"], 0.65))
        left, top, right, bottom = outline(region["piece"]).getbbox()
        piece = rgba.crop((left - 3, top - 3, right + 3, bottom + 3))
        variants = [variant_piece(piece, variant) for variant in region["variants"]]
        scale = min(300 / max(p.width for p in variants), 174 / max(p.height for p in variants))
        for index, candidate in enumerate(variants):
            candidate_path = RUNTIME / f"mural-{name}-piece-{index + 1}.png"
            tile(candidate, scale).save(candidate_path, optimize=True)
            outputs.append(candidate_path)

    manifest = {
        "schemaVersion": 1,
        "sources": [{"file": path.name, "sha256": digest(path)} for path in (full_path, worn_path)],
        "referenceSize": SIZE,
        "wornSourceSize": worn.size,
        "wornToFull": [[SCALE, SKEW, OFFSET[0]], [-SKEW, SCALE, OFFSET[1]]],
        "regions": REGIONS,
        "runtime": [{"file": path.name, "sha256": digest(path)} for path in outputs],
    }
    (ARCHIVE / "mural-registration.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()

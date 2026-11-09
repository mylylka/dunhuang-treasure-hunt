#!/usr/bin/env python3
"""Derive aligned restoration and contour masks from the original first-gallery mural."""

import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "art-source/world/first-gallery/v001"
RUNTIME = ROOT / "public/assets/world/first-gallery/v001"
SIZE = (2168, 725)
FULL_NAME = "藻井馆新背景墙-完整.png"

# Tight painted silhouettes define where real edges may contribute to a guide.
# These original-image coordinates avoid the ornamental frame and other motifs.
LOTUS_RIGHT = [
    (1083, 60), (1118, 101), (1151, 129), (1169, 163), (1161, 187),
    (1193, 152), (1232, 133), (1234, 175), (1222, 206), (1277, 196),
    (1328, 200), (1328, 254), (1305, 292), (1351, 298), (1403, 319),
    (1439, 344), (1475, 365), (1433, 396), (1395, 414), (1347, 427),
    (1314, 432), (1324, 478), (1329, 538), (1297, 548), (1240, 534),
    (1218, 526), (1222, 565), (1230, 589), (1191, 586), (1168, 566),
    (1152, 604), (1114, 631), (1083, 663),
]
GRAPES_LEFT = [
    (353, 365), (390, 366), (420, 370), (444, 368), (500, 375),
    (540, 386), (578, 399), (597, 423), (600, 447), (629, 443),
    (654, 446), (686, 476), (686, 485), (666, 492), (643, 498),
    (633, 526), (615, 540), (592, 535), (579, 560), (567, 561),
    (552, 553), (545, 536), (544, 507), (535, 498), (521, 509),
    (503, 514), (500, 530), (484, 552), (467, 578), (461, 596),
    (444, 604), (426, 600), (414, 584), (411, 565), (394, 551),
    (382, 531), (369, 516), (357, 506), (348, 490), (333, 499),
    (314, 490), (304, 466), (312, 440), (329, 420), (332, 394), (340, 374),
]


def mirrored(points):
    return [(SIZE[0] - 1 - x, y) for x, y in points]


def silhouette(points):
    mask = Image.new("L", SIZE)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    return np.asarray(mask)


def dilate(mask, width):
    shape = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (width, width))
    return cv2.dilate(mask, shape)


def trace_mask(painted_edges, support):
    edges = cv2.bitwise_and(painted_edges, dilate(support, 15))
    # Short cracks from the paper surface are not guide strokes.
    _, labels, stats, _ = cv2.connectedComponentsWithStats(edges, connectivity=8)
    connected = stats[:, cv2.CC_STAT_AREA] >= 28
    connected[0] = False
    isolated = np.where(connected[labels], 255, 0).astype(np.uint8)
    lines = dilate(isolated, 3)
    return Image.fromarray(lines).filter(ImageFilter.GaussianBlur(.65))


def restoration_mask(baseline, support):
    # Keep the weathered edge of the earlier repair, but include the entire
    # painted silhouette so long feathers or outer petals are never clipped.
    margin = Image.fromarray(dilate(support, 35)).filter(ImageFilter.GaussianBlur(8))
    return ImageChops.lighter(baseline, margin)


def generate(output):
    registration = json.loads((ARCHIVE / "mural-registration.json").read_text(encoding="utf-8"))
    original = (ARCHIVE / FULL_NAME).read_bytes()
    reference = next(source["sha256"] for source in registration["sources"] if source["file"] == FULL_NAME)
    if hashlib.sha256(original).hexdigest() != reference or tuple(registration["referenceSize"]) != SIZE:
        raise ValueError("The registered original has changed; remeasure the mural before deriving masks.")

    with Image.open(ARCHIVE / FULL_NAME) as image:
        if image.size != SIZE:
            raise ValueError("Unexpected original mural dimensions.")
        source = np.asarray(image.convert("RGB"))
    # Smooth surface grain first. Compute real edges from the full color image,
    # separately on both sides so each painted figure keeps its own detail.
    painted_edges = cv2.Canny(cv2.GaussianBlur(source, (0, 0), 1.7), 18, 42, L2gradient=True)
    bird_left = registration["regions"]["bird"]["piece"]
    lotus = Image.open(RUNTIME / "mural-lotus-mask.png").convert("L")
    bird = Image.open(RUNTIME / "mural-bird-mask.png").convert("L")
    grapes = Image.open(RUNTIME / "mural-grapes-mask.png").convert("L")
    regions = [
        ("lotus-center", LOTUS_RIGHT + mirrored(LOTUS_RIGHT[::-1]), lotus),
        ("bird-left", bird_left, bird),
        ("bird-right", mirrored(bird_left), ImageOps.mirror(bird)),
        ("grapes-left", GRAPES_LEFT, ImageOps.mirror(grapes)),
        ("grapes-right", mirrored(GRAPES_LEFT), grapes),
    ]
    output.mkdir(parents=True, exist_ok=True)
    for name, points, baseline in regions:
        support = silhouette(points)
        restore = restoration_mask(baseline, support)
        trace = trace_mask(painted_edges, support)
        if trace.getbbox() is None or restore.getbbox() is None:
            raise ValueError(f"No original motif found for {name}.")
        restore.save(output / f"mural-restore-{name}.png", optimize=True)
        trace.save(output / f"mural-trace-{name}.png", optimize=True)


if __name__ == "__main__":
    generate(RUNTIME)

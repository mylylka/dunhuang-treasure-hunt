#!/usr/bin/env python3
"""Remove the platform watermark from the two coloring reference images (v001 -> v002).

Scope is limited to the watermark strokes; every pixel outside the reported
scope keeps its original value. Requires opencv-python-headless and numpy.

Usage: python scripts/remove-coloring-watermarks-v001.py
"""

from __future__ import annotations

import json
import pathlib

import cv2
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
LEVELS = ROOT / "public" / "assets" / "levels"

# Watermark rows located on the 449x913 reference; x1, y1, x2, y2.
FLORAL_ROWS = [(118, 109, 208, 146), (88, 411, 166, 446), (392, 112, 442, 145)]
# Tight boxes around the two "汤圆" marks and the vertical dotted guide.
LOTUS_BOXES = [(92, 134, 155, 170), (276, 138, 330, 164)]
LOTUS_TIGHT = [(97, 145, 150, 168), (287, 146, 316, 162), (105, 166, 116, 182)]


def load_rgb(path: pathlib.Path) -> np.ndarray:
    image = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if image.shape[2] == 4:
        alpha = image[:, :, 3:4] / 255.0
        image = (image[:, :, :3] * alpha + 255 * (1 - alpha)).round().astype(np.uint8)
    return image


def save_rgba(path: pathlib.Path, rgb: np.ndarray) -> None:
    alpha = np.full(rgb.shape[:2] + (1,), 255, np.uint8)
    cv2.imwrite(str(path), np.concatenate([rgb, alpha], axis=2))


def gray(image: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY).astype(np.float32)


def clean_floral_scroll(image: np.ndarray):
    """Light watermark strokes over flat fills: flatten low-contrast deviations."""
    cur = image.copy()
    band = np.zeros(cur.shape[:2], bool)
    for x1, y1, x2, y2 in FLORAL_ROWS:
        band[max(0, y1 - 6):y2 + 6, max(0, x1 - 6):x2 + 6] = True
    scope = np.zeros(cur.shape[:2], bool)
    for _ in range(3):
        median = cv2.medianBlur(cur, 9)
        deviation = np.abs(gray(cur) - gray(median))
        dark = cv2.dilate((gray(cur) < 155).astype(np.uint8), np.ones((3, 3), np.uint8))
        select = band & (deviation >= 3) & (deviation <= 45) & (gray(cur) > 160) & (dark == 0)
        cur[select] = median[select]
        scope |= select
    return cur, scope


def clean_lotus_rosette(image: np.ndarray):
    """Darker red watermark inside the petal: rebuild the stroke from the local median."""
    cur = image.copy()
    blue = image[:, :, 0]
    inside = blue < 120  # keeps the cream rim untouched
    scope = np.zeros(cur.shape[:2], bool)

    median = cv2.medianBlur(cur, 11)
    deviation = gray(cur) - gray(median)
    select = np.zeros(deviation.shape, bool)
    for x1, y1, x2, y2 in LOTUS_BOXES:
        select[y1:y2, x1:x2] = (deviation[y1:y2, x1:x2] >= 10) & (deviation[y1:y2, x1:x2] <= 95)
    select &= inside
    select = cv2.dilate(select.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & inside
    cur[select] = median[select]
    scope |= select

    for _ in range(3):
        median = cv2.medianBlur(cur, 9)
        deviation = np.abs(gray(cur) - gray(median))
        select = np.zeros(deviation.shape, bool)
        for x1, y1, x2, y2 in LOTUS_TIGHT:
            select[y1:y2, x1:x2] = (deviation[y1:y2, x1:x2] >= 3) & (deviation[y1:y2, x1:x2] <= 30)
        select &= inside
        cur[select] = median[select]
        scope |= select
    return cur, scope


def process(name: str, cleaner) -> dict:
    level_dir = LEVELS / name
    source = level_dir / f"{name}-reference-v001.png"
    target = level_dir / f"{name}-reference-v002.png"
    archive = ROOT / "art-source" / "levels" / name / "v002"
    archive.mkdir(parents=True, exist_ok=True)

    original = load_rgb(source)
    cleaned, scope = cleaner(original)
    save_rgba(target, cleaned)

    changed = np.abs(original.astype(np.int16) - cleaned.astype(np.int16)).max(axis=2) > 6
    outside = int((changed & ~scope).sum())

    kernel = np.ones((3, 3), np.uint8)
    cv2.imwrite(str(archive / "watermark-scope-mask.png"), scope.astype(np.uint8) * 255)
    cv2.imwrite(str(archive / "reference-before.png"), original)
    cv2.imwrite(str(archive / "reference-after.png"), cleaned)
    cv2.imwrite(str(archive / "reviewed-composite.png"), cleaned)
    del kernel

    return {
        "levelId": name,
        "source": f"public/assets/levels/{name}/{name}-reference-v001.png",
        "output": f"public/assets/levels/{name}/{name}-reference-v002.png",
        "imageSize": [int(original.shape[1]), int(original.shape[0])],
        "scopePixels": int(scope.sum()),
        "changedPixelsOutsideScope": outside,
        "changedPixels": int(changed.sum()),
    }


def main() -> None:
    results = [
        process("coloring-floral-scroll", clean_floral_scroll),
        process("coloring-lotus-rosette", clean_lotus_rosette),
    ]
    report = ROOT / "art-source" / "levels" / "watermark-removal-v002.json"
    report.write_text(json.dumps({"results": results}, ensure_ascii=False, indent=2), encoding="utf-8")
    for item in results:
        print(item["levelId"], "scope", item["scopePixels"], "changed", item["changedPixels"],
              "outside-scope-changes", item["changedPixelsOutsideScope"])


if __name__ == "__main__":
    main()

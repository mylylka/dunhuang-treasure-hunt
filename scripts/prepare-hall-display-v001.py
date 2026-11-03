#!/usr/bin/env python3
"""Conservative six-panel display-face extraction from the user setting board."""
from __future__ import annotations

import hashlib
import json
import math
import runpy
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'art-source/world/hall-decoration/v002'
OUTPUT = ROOT / 'public/assets/world/courtyard/v004/display-board-art.jpg'
REQUESTED_SOURCE = Path('/Users/liujing/Downloads/3d视觉素材库/纹样馆工作区小品设定板.png')
# User reorganized Downloads after the first inspection; retain the actual path in provenance.
SOURCE = next((path for path in [REQUESTED_SOURCE, Path('/Users/liujing/Downloads/敦煌/3d视觉素材库/纹样馆工作区小品设定板.png'), ARCHIVE / REQUESTED_SOURCE.name] if path.exists()), REQUESTED_SOURCE)
# Whole six-tile painted face, clockwise TL/TR/BR/BL; wood perimeter and legs excluded.
QUAD = [(367, 79), (615, 66), (655, 277), (406, 304)]
SIZE = (248, 214)
CROP = (338, 42, 676, 338)


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def relative(path: Path) -> str:
    return str(path.relative_to(ROOT))


def main() -> None:
    # Reuse the already-verified technical homography and local preview-font helpers.
    # run_name prevents the old preparation script's main() from running.
    helpers = runpy.run_path(str(ROOT / 'scripts/prepare-hall-decoration-v001.py'), run_name='hall_texture_helpers')
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    archived = ARCHIVE / SOURCE.name
    helpers['preserve_copy'](SOURCE, archived)
    original = Image.open(archived).convert('RGB')
    coefficients = helpers['perspective_coefficients'](SIZE, QUAD)
    edges = [math.dist(QUAD[index], QUAD[(index + 1) % 4]) for index in range(4)]
    assert SIZE[0] <= min(edges[0], edges[2])
    assert SIZE[1] <= min(edges[1], edges[3])
    texture = original.transform(SIZE, Image.Transform.PERSPECTIVE, coefficients, resample=Image.Resampling.BICUBIC)
    texture.save(OUTPUT, quality=97, subsampling=0)

    review = original.crop(CROP).resize((1014, 888), Image.Resampling.NEAREST)
    review_draw = ImageDraw.Draw(review)
    points = [((x - CROP[0]) * 3, (y - CROP[1]) * 3) for x, y in QUAD]
    review_draw.line(points + [points[0]], fill='#38ff94', width=2)
    review_path = ARCHIVE / 'display-board-source-preview.png'
    review.save(review_path)
    preview = Image.new('RGB', (1200, 740), '#f1e7d5')
    draw = ImageDraw.Draw(preview)
    font = helpers['font']
    draw.text((30, 22), '腰高纹样展示板 · 六格彩绘技术提取', font=font(28), fill='#4d3425')
    draw.text((30, 62), '设定板第一行第二项；原图归档、木架另建，未 AI 重绘或补画。', font=font(17), fill='#776654')
    review_small = review.copy()
    review_small.thumbnail((600, 525), Image.Resampling.LANCZOS)
    preview.paste(review_small, (30, 105))
    preview.paste(texture.resize((496, 428), Image.Resampling.NEAREST), (664, 105))
    draw.text((664, 548), '运行纹理：248×214 px，RGB 无 alpha', font=font(18), fill='#4d3425')
    draw.text((664, 580), '2倍查看，未增加图案细节', font=font(17), fill='#776654')
    draw.text((30, 646), '保留原有六格排列、内缝、纸面边缘与图案；不包含整外木框、横梁和支架。', font=font(18), fill='#4d3425')
    draw.text((30, 680), '建议彩绘面 0.84×0.7248 米；腰高0.98米为整件木架高度，由模型单独实现。', font=font(18), fill='#4d3425')
    draw.text((30, 711), '有效像素有限，近看清晰度以原图为准；不以放大冒充高清独立纹样。', font=font(16), fill='#776654')
    preview_path = ARCHIVE / 'display-board-extraction-preview.jpg'
    preview.save(preview_path, quality=93, subsampling=0)

    manifest = {
        'version': 'v001', 'archiveVersion': 'v002', 'date': '2026-11-02',
        'authorization': 'User annotation 9: use first-row second display from the supplied setting board; technical extraction only.',
        'script': 'scripts/prepare-hall-display-v001.py',
        'source': {'requestedPath': str(REQUESTED_SOURCE), 'originalPath': str(SOURCE), 'archivePath': relative(archived), 'sha256': sha(SOURCE),
                   'archiveSha256': sha(archived), 'byteIdentical': SOURCE.read_bytes() == archived.read_bytes(),
                   'pixels': list(original.size), 'bytes': SOURCE.stat().st_size},
        'selection': {'item': 'first row, second object: six-panel painted display', 'panelArrangement': 'three columns, two rows; original unequal column widths retained',
                      'quadClockwiseTLTRBRBL': QUAD, 'sourceEdgeLengthsPixels': edges,
                      'inversePerspectiveCoefficients': coefficients,
                      'includes': ['all six original tile faces', 'original internal seams and small tile borders', 'baked paper shading and tiny corner marks'],
                      'excludes': ['outer wood perimeter', 'support crossbars', 'A-frame legs', 'other objects on the setting board']},
        'runtime': {'path': relative(OUTPUT), 'sha256': sha(OUTPUT), 'pixels': list(SIZE), 'bytes': OUTPUT.stat().st_size,
                    'mode': 'RGB', 'colorSpace': 'sRGB', 'alpha': False, 'aspectRatio': SIZE[0] / SIZE[1],
                    'suggestedFaceSizeMeters': [.84, .84 * SIZE[1] / SIZE[0]],
                    'wholeObjectHeightMeters': .98,
                    'method': 'Single inverse homography; bicubic resampling at native effective resolution; JPEG97 4:4:4. No sharpening, reconstruction, repainting, new flowers or watermark changes.',
                    'aspectNote': 'Output ratio derives conservatively from the source face edge lengths; this single illustration is not a calibrated physical survey.',
                    'uv': 'Whole 0–1 texture on one separate face; keep the output aspect ratio. Model outer wood framing and support legs separately.'},
        'reviewOnly': [{'path': relative(review_path), 'note': '3x source crop with extraction boundary, no added detail.'},
                       {'path': relative(preview_path), 'note': 'Labeled comparison collage, not a runtime texture.'}],
        'validation': {'originalByteIdentical': True, 'nativeEffectiveResolution': True, 'allSixPanelsPreserved': True,
                       'outerWoodFrameExcluded': True, 'modelsModified': False},
        'limits': 'Source artwork is small and contains perspective/baked shading. Do not claim independently supplied HD artwork or invent missing detail.'
    }
    (ARCHIVE / 'display-board-source.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    assert manifest['source']['byteIdentical']
    assert Image.open(OUTPUT).size == SIZE
    print(json.dumps({'runtime': manifest['runtime'], 'manifest': relative(ARCHIVE / 'display-board-source.json'), 'preview': relative(preview_path)}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Archive and technically extract the approved hall textures; never repaint art."""
from __future__ import annotations

import hashlib
import json
import math
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('/Users/liujing/Downloads/3d视觉素材库')
ARCHIVE = ROOT / 'art-source/world/hall-decoration/v001'
RUNTIME = ROOT / 'public/assets/world/courtyard/v003'
HALL_NAME = '半开放藻井观赏厅内部图.png'
MURAL_NAME = '对称古韵莲花壁画.png'
BORDER_SOURCE = ROOT / 'public/assets/world/courtyard/v002/wall-floral-border.jpg'
# Source image pixel coordinates, clockwise: top-left, top-right, bottom-right, bottom-left.
# Rectangular cloth body only: no support bar, tassels, reconstructed pixels or added flowers.
BANNER_QUAD = [(1467, 267), (1549, 254), (1583, 491), (1498, 499)]
BANNER_SIZE = (82, 234)
REVIEW_CROP = (1450, 230, 1615, 555)


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def relative(path: Path) -> str:
    return str(path.relative_to(ROOT))


def preserve_copy(source: Path, destination: Path) -> None:
    """Reruns are safe; a different archived original is never overwritten."""
    if destination.exists():
        if sha(source) != sha(destination):
            raise RuntimeError(f'Refusing to overwrite different existing asset: {destination}')
    else:
        shutil.copy2(source, destination)
    assert sha(source) == sha(destination)


def perspective_coefficients(size: tuple[int, int], quad: list[tuple[int, int]]) -> list[float]:
    """Solve the inverse projective mapping (destination -> source) without extra dependencies."""
    width, height = size
    target = [(0, 0), (width, 0), (width, height), (0, height)]
    rows = []
    for (x, y), (u, v) in zip(target, quad):
        rows.append([x, y, 1, 0, 0, 0, -u*x, -u*y, u])
        rows.append([0, 0, 0, x, y, 1, -v*x, -v*y, v])
    for column in range(8):
        pivot = max(range(column, 8), key=lambda index: abs(rows[index][column]))
        rows[column], rows[pivot] = rows[pivot], rows[column]
        divisor = rows[column][column]
        if abs(divisor) < 1e-12:
            raise ValueError('Degenerate perspective quadrilateral')
        rows[column] = [value / divisor for value in rows[column]]
        for index in range(8):
            if index == column:
                continue
            factor = rows[index][column]
            rows[index] = [value-factor*base for value, base in zip(rows[index], rows[column])]
    return [row[-1] for row in rows]


def asset_record(path: Path) -> dict:
    with Image.open(path) as im:
        pixels, mode = list(im.size), im.mode
    return {'path': relative(path), 'sha256': sha(path), 'bytes': path.stat().st_size,
            'pixels': pixels, 'mode': mode}


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for candidate in ['/System/Library/Fonts/STHeiti Medium.ttc', '/System/Library/Fonts/PingFang.ttc']:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size=size)
    return ImageFont.load_default()


def create_preview(hall: Image.Image, mural: Image.Image, banner: Image.Image, border: Image.Image) -> None:
    # These layouts are review documents, never runtime art or enhanced texture candidates.
    canvas = Image.new('RGB', (1360, 930), '#f1e7d5')
    draw = ImageDraw.Draw(canvas)
    ink, muted = '#4d3425', '#776654'
    draw.text((36, 24), '方形观赏厅 · 纹理技术准备 v001', font=font(30), fill=ink)
    draw.text((36, 68), '原图归档保留；完整壁画、低清布幡、既有边饰分别接入。', font=font(18), fill=muted)
    mural_preview = mural.copy()
    mural_preview.thumbnail((900, 510), Image.Resampling.LANCZOS)
    canvas.paste(mural_preview, (36, 111))
    draw.text((36, 631), '莲花壁画：1672×941，完整等比；7.0m × 3.9396m', font=font(19), fill=ink)
    canvas.paste(banner.resize((164, 468), Image.Resampling.NEAREST), (1048, 111))
    draw.text((990, 594), '石青布幡：82×234', font=font(19), fill=ink)
    draw.text((990, 624), '2倍查看，未增加细节', font=font(17), fill=muted)
    draw.text((990, 652), '低清技术提取 · 待替换', font=font(17), fill='#965329')
    canvas.paste(border, (36, 705))
    draw.text((36, 818), '花卉边饰：1013×97，原字节复用；并非参考厅堂同款花纹。', font=font(19), fill=ink)
    draw.text((36, 858), '布幡保留参考图的折痕与光照，无 AI 重绘、锐化或花朵补绘。挂杆和流苏不在贴图中。', font=font(17), fill=muted)
    draw.text((36, 888), '后续近看清晰版可补独立正视布面图，约 1:3、512×1536；本次未改动藻井。', font=font(17), fill=muted)
    canvas.save(ARCHIVE / 'texture-preview.jpg', quality=93, subsampling=0)
    review = hall.crop(REVIEW_CROP).resize((495, 975), Image.Resampling.NEAREST)
    review_draw = ImageDraw.Draw(review)
    points = [((x-REVIEW_CROP[0])*3, (y-REVIEW_CROP[1])*3) for x, y in BANNER_QUAD]
    review_draw.line(points + [points[0]], fill='#35ff9a', width=2)
    review.save(ARCHIVE / 'banner-source-review.png')


def main() -> None:
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    RUNTIME.mkdir(parents=True, exist_ok=True)
    sources = []
    for name in [HALL_NAME, MURAL_NAME]:
        destination = ARCHIVE / name
        preserve_copy(SOURCE / name, destination)
        sources.append({**asset_record(destination), 'originalPath': str(SOURCE / name),
                        'originalSha256': sha(SOURCE / name), 'byteIdentical': True})

    hall = Image.open(ARCHIVE / HALL_NAME).convert('RGB')
    mural = Image.open(ARCHIVE / MURAL_NAME).convert('RGB')
    mural_path = RUNTIME / 'hall-lotus-mural.jpg'
    mural.save(mural_path, quality=95, subsampling=0)
    coefficients = perspective_coefficients(BANNER_SIZE, BANNER_QUAD)
    banner = hall.transform(BANNER_SIZE, Image.Transform.PERSPECTIVE, coefficients,
                            resample=Image.Resampling.BICUBIC)
    banner_path = RUNTIME / 'hall-banner.jpg'
    banner.save(banner_path, quality=97, subsampling=0)
    border_path = RUNTIME / 'hall-floral-border.jpg'
    preserve_copy(BORDER_SOURCE, border_path)
    border = Image.open(border_path).convert('RGB')
    edges = [math.dist(BANNER_QUAD[index], BANNER_QUAD[(index+1) % 4]) for index in range(4)]
    assert BANNER_SIZE[0] <= min(edges[0], edges[2])
    assert BANNER_SIZE[1] <= min(edges[1], edges[3])
    assert Image.open(mural_path).size == mural.size
    create_preview(hall, mural, banner, border)
    manifest = {
        'version': 'v001', 'date': '2026-11-02',
        'authorization': 'Approved docs/courtyard-square-hall-v001-plan.md; technical extraction only.',
        'script': 'scripts/prepare-hall-decoration-v001.py',
        'boundary': 'No AI generation, repainting, invented flowers, sharpening, watermark removal, or caisson changes. Original images archived byte-for-byte.',
        'sources': sources,
        'textures': [
            {**asset_record(mural_path), 'source': relative(ARCHIVE / MURAL_NAME),
             'method': 'Full original canvas converted to RGB JPEG95, 4:4:4. No crop, resize, or perspective change.',
             'aspectRatio': mural.width/mural.height,
             'suggestedPhysicalMeters': [7.0, 7.0*mural.height/mural.width],
             'note': 'Retains the source image frame, stone base and original baked lighting; display complete and proportional.'},
            {**asset_record(banner_path), 'source': relative(ARCHIVE / HALL_NAME),
             'status': 'low-resolution technical extraction; replacement pending',
             'method': 'Single inverse homography, bicubic resampling at native effective resolution, JPEG97 4:4:4. No content reconstruction.',
             'sourceQuadClockwiseTLTRBRBL': BANNER_QUAD, 'sourceEdgeLengthsPixels': edges,
             'inversePerspectiveCoefficients': coefficients, 'alpha': False,
             'aspectRatio': BANNER_SIZE[0]/BANNER_SIZE[1],
             'suggestedPhysicalMeters': [0.9, 0.9*BANNER_SIZE[1]/BANNER_SIZE[0]],
             'limitations': ['Only rectangular cloth body; no support bar or hanging tassels.',
                            'Baked shadows, folds and low source detail remain.',
                            'Central flower about 60–80 source pixels; not suitable for sharp close-up inspection.',
                            'Projective correction assumes a flat face; existing fabric folds are not reconstructed.'],
             'futureReplacement': 'Independent front-facing cloth image, approximately 1:3, 512x1536 or larger, without background/support bar.'},
            {**asset_record(border_path), 'source': relative(BORDER_SOURCE),
             'sourceSha256': sha(BORDER_SOURCE), 'byteIdentical': True,
             'method': 'Exact byte copy of existing approved floral border. No image operations.',
             'provenance': 'art-source/world/wall-decoration/v001/source-manifest.json',
             'aspectRatio': border.width/border.height,
             'note': 'Existing user artwork reused; not the exact beam design in the new hall reference.'}
        ],
        'reviewOnly': [
            {'path': relative(ARCHIVE / 'texture-preview.jpg'), 'note': 'Labeled review collage, not a runtime asset.'},
            {'path': relative(ARCHIVE / 'banner-source-review.png'), 'note': '3x nearest-neighbor source crop with extraction boundary; does not add image detail.'}
        ],
        'validation': {'originalShaMatches': True, 'borderByteIdentical': True,
                       'muralFullNativeCanvas': True, 'bannerNoDimensionUpsampling': True,
                       'glbModified': False, 'caissonModified': False}
    }
    (ARCHIVE / 'source-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    (ARCHIVE / 'README.md').write_text(
        '# 方形观赏厅纹理 v001\n\n'
        '两张用户 PNG 原稿按原字节归档；SHA、来源坐标、透视矩阵和运行文件清单见 `source-manifest.json`。\n\n'
        '- `hall-lotus-mural.jpg`：1672×941，完整画面，7m 宽对应 3.9396m 高。不能裁切或拉成正方形。\n'
        '- `hall-banner.jpg`：82×234，RGB 无 alpha，仅布面及金色边框，不含挂杆与流苏。原生有效像素透视提取，低清待替换；保留原图折痕和光照，无新增细节。建议 0.9×2.5683m。\n'
        '- `hall-floral-border.jpg`：1013×97，现有 v002 边饰原字节复制，不声称是新参考图同款。\n\n'
        '运行文件位于 `public/assets/world/courtyard/v003/`，按 sRGB 颜色纹理使用。布幡不需要 alphaTest 或透明材质；可用独立布面几何，UV 完整覆盖 0–1。穗子和挂杆另作几何。\n\n'
        '`texture-preview.jpg` 为素材拼图，`banner-source-review.png` 为带提取边界的 3 倍像素查看图，均不得作为运行纹理。未来布幡若需地面近看清晰，补独立正视布面图，约 1:3、512×1536。没有生成美术、去水印或改动藻井。\n\n'
        '重建：`python3 scripts/prepare-hall-decoration-v001.py`。已有不同原稿或边饰时脚本拒绝覆盖；旧院落版本保持原样。\n', encoding='utf-8')
    print(json.dumps({'archive': relative(ARCHIVE), 'textures': [asset_record(path) for path in [mural_path, banner_path, border_path]],
                      'preview': relative(ARCHIVE / 'texture-preview.jpg'), 'validation': manifest['validation']}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()

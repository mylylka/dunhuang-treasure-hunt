#!/usr/bin/env python3
"""Build versioned q92 WebP runtime images; keep every PNG and content index intact.

Requires the already available cwebp, Pillow and NumPy. No network/install step.
--check decodes and verifies all saved files and deterministic manifests without
writing. Add --reencode to compare every encoded byte again (slower).
"""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import io
import json
import math
from pathlib import Path
import shutil
import subprocess

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
STICKER_ARCHIVE = ROOT / 'art-source/shared/hidden-object-elements/v004'
BACKGROUND_ARCHIVE = ROOT / 'art-source/shared/hidden-object-backgrounds/v002'
SOURCE_POOL = ROOT / 'art-source/shared/hidden-object-elements/v003/pool-v003.json'
PNG_MANIFEST = ROOT / 'art-source/shared/hidden-object-elements/v002/manifest.json'
BACKGROUND_MANIFEST = ROOT / 'art-source/shared/hidden-object-backgrounds/v001/manifest.json'
ENCODER_FLAGS = ['-q', '92', '-alpha_q', '100', '-exact', '-sharp_yuv', '-m', '6', '-metadata', 'icc']
PAPER = '#fffaf1'


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def preserve(path: Path, data: bytes, check: bool) -> None:
    if path.exists():
        if path.read_bytes() != data:
            raise ValueError(f'Existing version differs; preserve it and create a new version: {path}')
    elif check:
        raise ValueError(f'Missing derived file: {path}')
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open('xb') as stream:
            stream.write(data)


def metrics(first: np.ndarray, second: np.ndarray) -> dict:
    delta = np.abs(first.astype(np.float32) - second.astype(np.float32))
    rmse = float(np.sqrt(np.mean(delta ** 2, dtype=np.float64)))
    return {'mae': round(float(np.mean(delta, dtype=np.float64)), 6),
            'p99': round(float(np.percentile(delta, 99)), 6), 'max': int(delta.max()),
            'psnrDb': round(20 * math.log10(255 / rmse), 6) if rmse else None}


def display(image: Image.Image, kind: str) -> tuple[np.ndarray, np.ndarray]:
    image = image.copy()
    # Offline quality check only: no resizing is applied to the runtime WebP.
    if kind == 'sticker':
        image.thumbnail((180, 180), Image.Resampling.LANCZOS)
    else:
        image = image.resize((480, round(image.height * 480 / image.width)), Image.Resampling.LANCZOS)
    paper = Image.new('RGBA', image.size, PAPER)
    paper.alpha_composite(image)
    return np.asarray(paper.convert('RGB')), np.asarray(image)[:, :, 3] >= 128


def specifications() -> tuple[list[dict], list[dict]]:
    pool = json.loads(SOURCE_POOL.read_bytes())
    sources = {row['spriteId']: row for row in json.loads(PNG_MANIFEST.read_bytes())['derivatives']}
    assert len(pool['sprites']) == len(sources) == 520
    stickers = []
    for sprite in pool['sprites']:
        source = sources[sprite['id']]
        assert source['runtimePath'] == 'public' + sprite['path']
        stickers.append({'id': sprite['id'], 'kind': 'sticker', 'categoryId': sprite['categoryId'],
                         'sourcePath': source['runtimePath'], 'sourceSha256': source['sha256'],
                         'runtimePath': sprite['path'].replace('/v002/', '/v003/').replace('.png', '.webp'),
                         'expectedSize': [sprite['width'], sprite['height']]})
    backgrounds = []
    for row in json.loads(BACKGROUND_MANIFEST.read_bytes())['assets']:
        backgrounds.append({'id': row['id'], 'kind': 'background', 'chapter': row['chapter'],
                            'sourcePath': 'public' + row['runtime'], 'sourceSha256': row['sha256'],
                            'runtimePath': row['runtime'].replace('/v001/', '/v002/').replace('.png', '.webp'),
                            'expectedSize': [row['width'], row['height']]})
    assert len(backgrounds) == 3
    return stickers, backgrounds


def convert(spec: dict, encoder: str, check: bool, reencode: bool) -> dict:
    source = ROOT / spec['sourcePath']
    source_data = source.read_bytes()
    assert sha(source_data) == spec['sourceSha256'], f'PNG source changed: {source}'
    destination = ROOT / 'public' / spec['runtimePath'].lstrip('/')
    if not check or reencode:
        command = [encoder, '-quiet', *ENCODER_FLAGS, str(source), '-o', '-']
        result = subprocess.run(command, capture_output=True, check=False)
        if result.returncode:
            raise RuntimeError(f'cwebp failed for {source}: {result.stderr.decode(errors="replace")}')
        data = result.stdout
        preserve(destination, data, check)
    else:
        data = destination.read_bytes()
    with Image.open(io.BytesIO(source_data)) as opened:
        source_mode = opened.mode
        source_icc = opened.info.get('icc_profile')
        original = opened.convert('RGBA')
    with Image.open(io.BytesIO(data)) as opened:
        assert opened.format == 'WEBP', destination
        assert opened.info.get('icc_profile') == source_icc, f'ICC profile changed: {destination}'
        decoded = opened.convert('RGBA')
    assert list(original.size) == spec['expectedSize'] == list(decoded.size), destination
    first, second = np.asarray(original), np.asarray(decoded)
    assert np.array_equal(first[:, :, 3], second[:, :, 3]), f'Alpha changed: {destination}'
    visible = first[:, :, 3] >= 128
    first_display, mask = display(original, spec['kind'])
    second_display, _ = display(decoded, spec['kind'])
    # Reading and encoding must never mutate the original PNG.
    assert source.read_bytes() == source_data
    return {**{key: value for key, value in spec.items() if key != 'expectedSize'},
            'sourceMode': source_mode, 'width': original.width, 'height': original.height,
            'pngBytes': len(source_data), 'webpBytes': len(data), 'webpSha256': sha(data),
            'bytesSaved': len(source_data) - len(data),
            'reduction': round(1 - len(data) / len(source_data), 8),
            'alphaByteIdentical': True, 'alphaSha256': sha(first[:, :, 3].tobytes()),
            'iccProfileIdentical': True, 'nativeVisibleRGB': metrics(first[:, :, :3][visible], second[:, :, :3][visible]),
            'offlineDisplay': {'size': [first_display.shape[1], first_display.shape[0]],
                               'resampler': 'Pillow LANCZOS', 'paper': PAPER,
                               'visibleContentRGB': metrics(first_display[mask], second_display[mask])}}


def summarize(records: list[dict]) -> dict:
    png = sum(row['pngBytes'] for row in records)
    webp = sum(row['webpBytes'] for row in records)
    return {'imageCount': len(records), 'pngBytes': png, 'webpBytes': webp, 'bytesSaved': png - webp,
            'aggregateReduction': round(1 - webp / png, 8),
            'minimumIndividualReduction': min(row['reduction'] for row in records),
            'allDimensionsUnchanged': True, 'allAlphaByteIdentical': all(row['alphaByteIdentical'] for row in records),
            'allIccProfilesIdentical': all(row['iccProfileIdentical'] for row in records),
            'meanNativeVisibleRGBMAE': round(float(np.mean([row['nativeVisibleRGB']['mae'] for row in records])), 6),
            'meanOfflineVisibleRGBMAE': round(float(np.mean([row['offlineDisplay']['visibleContentRGB']['mae'] for row in records])), 6),
            'maximumOfflineVisibleRGBP99': max(row['offlineDisplay']['visibleContentRGB']['p99'] for row in records),
            'minimumOfflineVisibleRGBPSNR': min(row['offlineDisplay']['visibleContentRGB']['psnrDb'] for row in records)}


def main(check: bool, reencode: bool, workers: int) -> None:
    encoder = shutil.which('cwebp')
    if not encoder:
        raise RuntimeError('cwebp is required; this script never installs dependencies.')
    encoder_version = subprocess.check_output([encoder, '-version'], text=True).strip()
    stickers, backgrounds = specifications()
    all_specs = stickers + backgrounds
    by_id = {}
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(convert, spec, encoder, check, reencode): spec for spec in all_specs}
        for index, future in enumerate(as_completed(futures), 1):
            row = future.result()
            by_id[row['id']] = row
            if index % 25 == 0 or index == len(all_specs):
                print(f'{"Checked" if check else "Encoded"} {index}/{len(all_specs)}', flush=True)
    sticker_rows = [by_id[spec['id']] for spec in stickers]
    background_rows = [by_id[spec['id']] for spec in backgrounds]
    common = {'schemaVersion': 1, 'registeredDate': '2026-11-04',
              'encoder': {'tool': 'cwebp', 'version': encoder_version, 'flags': ENCODER_FLAGS},
              'policy': 'Technical q92 RGB encoding only: no crop, resize, recolouring, mirroring or repainting. Dimensions and every alpha byte are verified unchanged; RGB is lossy, not bit-identical. All old PNGs and content indexes are preserved.',
              'qualityScope': 'Native RGB uses alpha>=128; offline display uses Pillow LANCZOS and warm-paper compositing (sticker max edge 180px; background width 480px). Display metrics exclude transparent blank pixels; these are not browser/GPU or real-device screenshots.'}
    sticker_manifest = {**common, 'version': 'hidden-object-webp-v004',
                        'sourcePool': SOURCE_POOL.relative_to(ROOT).as_posix(), 'sourcePoolSha256': sha(SOURCE_POOL.read_bytes()),
                        'sourcePngManifest': PNG_MANIFEST.relative_to(ROOT).as_posix(), 'sourcePngManifestSha256': sha(PNG_MANIFEST.read_bytes()),
                        'runtimeRoot': 'public/assets/shared/hidden-object/v003/',
                        'summary': summarize(sticker_rows),
                        'categorySummary': {category: summarize([row for row in sticker_rows if row['categoryId'] == category])
                                            for category in dict.fromkeys(row['categoryId'] for row in sticker_rows)},
                        'derivatives': sticker_rows}
    background_manifest = {**common, 'version': 'hidden-object-background-webp-v002',
                           'sourcePngManifest': BACKGROUND_MANIFEST.relative_to(ROOT).as_posix(),
                           'sourcePngManifestSha256': sha(BACKGROUND_MANIFEST.read_bytes()),
                           'runtimeRoot': 'public/assets/shared/hidden-object-backgrounds/v002/',
                           'summary': summarize(background_rows), 'derivatives': background_rows}
    preserve(STICKER_ARCHIVE / 'manifest.json', json_bytes(sticker_manifest), check)
    preserve(BACKGROUND_ARCHIVE / 'manifest.json', json_bytes(background_manifest), check)
    for archive, title in [(STICKER_ARCHIVE, '520张找物贴纸 q92 WebP 技术派生 v004'),
                           (BACKGROUND_ARCHIVE, '3张章节底图 q92 WebP 技术派生 v002')]:
        readme = f'''# {title}

保留旧PNG与正式素材索引，运行URL由`src/content/hidden-object/runtime-images.ts`统一转换。任务卡与盘面共用同一张派生图。这里只改变技术编码，不裁切、不缩放、不重画、不镜像，不主动调色。

编码参数：`cwebp -q 92 -alpha_q 100 -exact -sharp_yuv -m 6 -metadata icc`。RGB为有损编码，不能称为像素无损；逐张核对原尺寸、全部alpha字节与ICC一致。来源PNG和输出WebP的SHA-256、体积及可见区域质量指标见`manifest.json`。

重建：`python3 scripts/import-hidden-object-webp-v004.py --workers 4`。快速只读复验（所有文件哈希、解码、透明通道及指标）：同命令加`--check`；编码字节完整复现验证再加`--reencode`。已有不同字节的版本会拒绝覆盖。脚本不安装依赖、不下载资源、不改变活跃pool或assets索引。

180px贴纸及480px宽底图指标来自离线Pillow缩放/合成，仅是技术质量检查；不替代真实网页或手机目检。
'''.encode('utf-8')
        preserve(archive / 'README.md', readme, check)
    print(json.dumps({'checked': check, 'reencoded': reencode, 'stickers': sticker_manifest['summary'],
                      'backgrounds': background_manifest['summary']}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--reencode', action='store_true', help='Re-encode and compare every WebP byte, including with --check.')
    parser.add_argument('--workers', type=int, default=4)
    args = parser.parse_args()
    if not 1 <= args.workers <= 8:
        parser.error('--workers must be between 1 and 8')
    main(args.check, args.reencode, args.workers)

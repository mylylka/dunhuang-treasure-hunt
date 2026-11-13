#!/usr/bin/env python3
"""Archive eight user PNGs and copy the five untouched shadow-match runtime PNGs.

Uses local Pillow only. --check verifies archived files and runtime copies,
including mask/annotation correspondences, without the temporary source folder.
Never removes files or overwrites different existing bytes.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = Path('/var/folders/v4/5w5w475926b0_g74_gftn8mr0000gn/T')
ARCHIVE = ROOT / 'art-source/levels/music-apsara-shadow/v001'
RUNTIME = ROOT / 'public/assets/levels/music-apsara-shadow/v001'
IDS = (
    '4b282de7-d8f0-4433-a666-860ef596aa42',
    'e83d53fd-47ff-4e1c-974d-4b28ff8ecaa8',
    '22a9ee20-031a-44b2-8729-10eb7358552b',
    '90f460b2-1aab-497d-9f9f-5e58cff5419c',
    'e5c40027-632e-49e5-8d56-6284bd3461f7',
    '0bec9e11-4936-43d4-8864-6081fc739ee0',
    '51e31975-1c35-45f9-85d6-0ad2b3f76083',
    '89e1c0a6-c4b3-4580-a42f-61f9860af2f0',
)
RUNTIME_MAP = (
    (8, 'shadow-apsara-reference', None, 'reference.png'),
    (1, 'shadow-apsara-intact', 'shadow-one', 'shadow-intact.png'),
    (2, 'shadow-apsara-head-cloud', 'shadow-two', 'shadow-head-cloud.png'),
    (3, 'shadow-apsara-ribbon-foot', 'shadow-three', 'shadow-ribbon-foot.png'),
    (4, 'shadow-apsara-ribbon-cloud', 'shadow-four', 'shadow-ribbon-cloud.png'),
)
SOURCE_NOTE = '开发者提供的AI教学示意；保留用户PNG原始字节和透明通道，不代表特定洞窟、年代或历史原貌复原。'


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def encoded(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def filename(number: int) -> str:
    return f'codex-clipboard-{IDS[number - 1]}.png'


def preserve_or_write(path: Path, data: bytes) -> None:
    if path.exists():
        if path.read_bytes() != data:
            raise ValueError(f'Existing file differs; preserve it and create a new version: {path}')
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('xb') as stream:
        stream.write(data)


def mask(image: Image.Image) -> Image.Image:
    return image.getchannel('A').point(lambda alpha: 255 if alpha >= 128 else 0)


def count_white(image: Image.Image) -> int:
    return image.histogram()[255]


def image_info(image: Image.Image) -> dict:
    has_alpha = 'A' in image.getbands()
    alpha = image.getchannel('A') if has_alpha else Image.new('L', image.size, 255)
    histogram = alpha.histogram()
    box = alpha.point(lambda value: 255 if value >= 128 else 0).getbbox()
    nonzero = alpha.getbbox()
    rgb = image.convert('RGB')
    return {
        'width': image.width, 'height': image.height, 'mode': image.mode,
        'hasAlpha': has_alpha,
        'alphaMin': alpha.getextrema()[0], 'alphaMax': alpha.getextrema()[1],
        'transparentPixels': histogram[0], 'opaquePixels': histogram[255],
        'intermediateAlphaPixels': sum(histogram[1:255]),
        'alphaNonzeroBBox': list(nonzero) if nonzero else None,
        'alpha128BBox': list(box) if box else None,
        'alpha128Area': sum(histogram[128:]),
        'rgbEntirelyBlack': all(extrema == (0, 0) for extrema in rgb.getextrema()),
    }


def compare_masks(first: Image.Image, second: Image.Image, valid: Image.Image | None = None) -> dict:
    intersection = ImageChops.multiply(first, second)
    union = ImageChops.lighter(first, second)
    difference = ImageChops.difference(first, second)
    if valid is not None:
        intersection = ImageChops.multiply(intersection, valid)
        union = ImageChops.multiply(union, valid)
        difference = ImageChops.multiply(difference, valid)
    common, combined = count_white(intersection), count_white(union)
    differing = count_white(difference)
    box = difference.getbbox()
    return {'iou': common / combined if combined else 1.0, 'mismatchedPixels': differing,
            'differenceBBox': list(box) if box else None}


def audit(images: dict[int, Image.Image]) -> dict:
    for number in (1, 2, 3, 4, 8):
        image = images[number]
        assert image.mode == 'RGBA' and image.size == (1254, 1254), number
        alpha = image.getchannel('A')
        assert alpha.getextrema() == (0, 255), number
        assert count_white(mask(image)) > 0, number
    assert all(image_info(images[number])['rgbEntirelyBlack'] for number in (1, 2, 3, 4))
    reference_mask = mask(images[8])
    candidates = []
    correct = []
    for number in (1, 2, 3, 4):
        result = compare_masks(mask(images[number]), reference_mask)
        option_id = RUNTIME_MAP[number][2]
        if result['mismatchedPixels'] == 0:
            correct.append(option_id)
        alpha_difference = ImageChops.difference(images[number].getchannel('A'), images[8].getchannel('A'))
        histogram = alpha_difference.histogram()
        candidates.append({
            'sourceOrder': number, 'optionId': option_id,
            **result, 'rawAlphaEqual': histogram[0] == 1254 ** 2,
            'rawAlphaMAE': sum(value * total for value, total in enumerate(histogram)) / 1254 ** 2,
        })
    assert correct == ['shadow-one'], f'Expected exactly one identical silhouette, got {correct}'
    annotations = []
    for source_order, expected_order in ((5, 2), (6, 3), (7, 4)):
        annotated = images[source_order]
        assert annotated.mode == 'RGB' and annotated.size == (1474, 1474), source_order
        crop = annotated.crop((110, 110, 1364, 1364))
        red_channel, green_channel, blue_channel = crop.split()
        channels = [channel.tobytes() for channel in (red_channel, green_channel, blue_channel)]
        red = Image.frombytes('L', crop.size, bytes(
            255 if r > 150 and r * 2 > g * 3 and r * 2 > b * 3 else 0
            for r, g, b in zip(*channels)
        ))
        valid = ImageChops.invert(red)
        maximum = ImageChops.lighter(ImageChops.lighter(red_channel, green_channel), blue_channel)
        black = maximum.point(lambda value: 255 if value < 128 else 0)
        pairs = [compare_masks(black, mask(images[number]), valid) for number in (1, 2, 3, 4)]
        exact = [index + 1 for index, pair in enumerate(pairs) if pair['mismatchedPixels'] == 0]
        assert exact == [expected_order], (source_order, exact)
        annotations.append({
            'sourceOrder': source_order, 'matchesCleanSourceOrder': expected_order,
            'matchesOptionId': RUNTIME_MAP[expected_order][2],
            'readOnlyComparisonCrop': [110, 110, 1364, 1364],
            'ignoredRedPixels': count_white(red),
            **pairs[expected_order - 1],
        })
    return {
        'threshold': 'alpha >= 128',
        'matchingDefinition': '统一1254×1254画布，不平移、不缩放；比较二值前景轮廓，不要求原始alpha灰度逐像素一致。',
        'bboxConvention': '[left, top, right-exclusive, bottom-exclusive]',
        'uniqueCorrectOptionId': correct[0], 'candidates': candidates,
        'annotationComparison': '仅内存中去掉四边110px白底，黑色max(R,G,B)<128；忽略R>150且R>1.5G、R>1.5B的红圈覆盖像素。原图未裁切或改写。',
        'annotations': annotations,
    }


def load_archived() -> dict[int, Image.Image]:
    result = {}
    for number in range(1, 9):
        with Image.open(ARCHIVE / 'originals' / filename(number)) as image:
            image.load()
            result[number] = image.copy()
    return result


def asset_entries() -> list[dict]:
    return [{
        'id': asset_id, 'path': f'/assets/levels/music-apsara-shadow/v001/{runtime_name}',
        'width': 1254, 'height': 1254, 'kind': 'level', 'placeholder': False,
        'version': 'shadow-apsara-v001', 'sourceNote': SOURCE_NOTE,
    } for _, asset_id, _, runtime_name in RUNTIME_MAP]


def build(source_root: Path) -> None:
    originals = []
    for number in range(1, 9):
        source_filename = filename(number)
        archived = ARCHIVE / 'originals' / source_filename
        source = source_root / source_filename
        data = source.read_bytes() if source.exists() else archived.read_bytes()
        preserve_or_write(archived, data)
        with Image.open(io.BytesIO(data)) as image:
            info = image_info(image)
        originals.append({
            'sourceOrder': number, 'sourceFilename': source_filename,
            'archivePath': f'originals/{source_filename}', 'sha256': sha(data), 'bytes': len(data),
            'role': 'annotation-only' if 5 <= number <= 7 else ('color-reference' if number == 8 else 'clean-shadow'),
            **info,
        })
    images = load_archived()
    mask_audit = audit(images)
    runtime_files = []
    for number, asset_id, option_id, runtime_name in RUNTIME_MAP:
        original = originals[number - 1]
        data = (ARCHIVE / original['archivePath']).read_bytes()
        preserve_or_write(RUNTIME / runtime_name, data)
        runtime_files.append({
            'assetId': asset_id, 'optionId': option_id, 'sourceOrder': number,
            'sourceFilename': original['sourceFilename'],
            'path': f'/assets/levels/music-apsara-shadow/v001/{runtime_name}',
            'sha256': sha(data), 'sourceSha256': original['sha256'], 'bytes': len(data),
            'width': 1254, 'height': 1254, 'mode': 'RGBA', 'byteIdenticalToOriginal': True,
        })
    manifest = {
        'schemaVersion': 1, 'levelId': 'music-apsara-shadow', 'version': 'v001',
        'sourceNote': SOURCE_NOTE,
        'processing': '8张PNG按原文件名原字节归档；仅8/1/2/3/4复制为五张英文名运行PNG。无重编码、缩放、裁切、去圈、改色、镜像或重绘；5/6/7只作标注参考。',
        'correctOptionId': 'shadow-one', 'correctAssetId': 'shadow-apsara-intact',
        'originals': originals, 'runtimeFiles': runtime_files, 'maskAudit': mask_audit,
    }
    preserve_or_write(ARCHIVE / 'manifest.json', encoded(manifest))
    preserve_or_write(ARCHIVE / 'asset-index-entries.json', encoded(asset_entries()))


def check() -> None:
    manifest = json.loads((ARCHIVE / 'manifest.json').read_text())
    assert manifest['correctOptionId'] == 'shadow-one' and manifest['correctAssetId'] == 'shadow-apsara-intact'
    assert len(manifest['originals']) == 8 and len(manifest['runtimeFiles']) == 5
    images = load_archived()
    for number, original in enumerate(manifest['originals'], 1):
        assert original['sourceOrder'] == number and original['sourceFilename'] == filename(number)
        assert original['archivePath'] == f'originals/{filename(number)}'
        archived = ARCHIVE / original['archivePath']
        data = archived.read_bytes()
        assert len(data) == original['bytes'] and sha(data) == original['sha256'], archived
        for key, value in image_info(images[number]).items():
            assert original[key] == value, (number, key)
    for mapping, runtime in zip(RUNTIME_MAP, manifest['runtimeFiles']):
        number, asset_id, option_id, runtime_name = mapping
        assert (runtime['assetId'], runtime['optionId'], runtime['sourceOrder']) == (asset_id, option_id, number)
        assert runtime['path'] == f'/assets/levels/music-apsara-shadow/v001/{runtime_name}'
        data = (RUNTIME / runtime_name).read_bytes()
        original = manifest['originals'][number - 1]
        assert data == (ARCHIVE / original['archivePath']).read_bytes(), runtime_name
        assert sha(data) == runtime['sha256'] == runtime['sourceSha256'] == original['sha256']
        assert len(data) == runtime['bytes']
        with Image.open(io.BytesIO(data)) as image:
            assert image.mode == runtime['mode'] == 'RGBA' and image.size == (runtime['width'], runtime['height']) == (1254, 1254)
    assert set(path.name for path in RUNTIME.glob('*.png')) == {mapping[3] for mapping in RUNTIME_MAP}
    assert set(path.name for path in (ARCHIVE / 'originals').glob('*.png')) == {filename(number) for number in range(1, 9)}
    assert audit(images) == manifest['maskAudit'], 'Recorded mask/annotation audit differs'
    assert json.loads((ARCHIVE / 'asset-index-entries.json').read_text()) == asset_entries()
    print(json.dumps({
        'archivedOriginals': 8, 'runtimeFiles': 5, 'runtimeBytes': sum(item['bytes'] for item in manifest['runtimeFiles']),
        'allRuntimeByteIdentical': True, 'uniqueCorrectOptionId': 'shadow-one',
        'correctMaskIoU': manifest['maskAudit']['candidates'][0]['iou'],
        'annotations': {str(item['sourceOrder']): item['matchesCleanSourceOrder'] for item in manifest['maskAudit']['annotations']},
    }, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', type=Path, default=DEFAULT_SOURCE)
    parser.add_argument('--check', action='store_true', help='Read-only archive/runtime/audit verification; temporary sources not required')
    arguments = parser.parse_args()
    if not arguments.check:
        build(arguments.source_root)
    check()

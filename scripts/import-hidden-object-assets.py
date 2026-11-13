#!/usr/bin/env python3
"""Archive supplied sticker PNGs and build a reproducible, transparent runtime pool.

Uses Python's standard library and Pillow. Source files and existing different
archive/output files are never overwritten or removed; building a new version
updates only the active pool index. Run with --check to verify
the archive, pool, hashes, image dimensions and safe hit points without writing.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path

from PIL import Image, ImageFilter


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE_ROOT = Path('/Users/liujing/Downloads/找不同/批处理变清晰/切割结果')
DEFAULT_LAYOUT_REFERENCE = Path('/var/folders/v4/5w5w475926b0_g74_gftn8mr0000gn/T/codex-clipboard-10497184-327d-4d69-a9ea-d13047c52361.png')
ARCHIVE_ROOT = PROJECT_ROOT / 'art-source/shared/hidden-object-elements/v001'
RUNTIME_ROOT = PROJECT_ROOT / 'public/assets/shared/hidden-object/v001'
POOL_PATH = PROJECT_ROOT / 'src/content/hidden-object/pool.json'
MAX_EDGE = 256
ALPHA_THRESHOLD = 128
CATEGORIES = (
    ('instruments', '中国传统乐器装饰贴纸合集_51', 51),
    ('clothing', '敦煌古代服饰与佩饰素材总览图_138', 138),
    ('animals', '敦煌壁画动物与神兽素材总览图_108', 108),
    ('patterns', '敦煌纹样装饰单元素材总览图_39', 39),
    ('plants', '敦煌花卉植物元素素材总览图_33', 33),
    ('ritual', '敦煌佛教法器与供器素材总览图_151', 151),
)
LEGACY_GROUPS = [
    {'id': 'pipa', 'label': '琵琶造型'},
    {'id': 'drum', 'label': '鼓'},
    {'id': 'bell', 'label': '铃铛'},
]
GROUPS = [
    {'id': 'pipa', 'label': '琵琶'},
    {'id': 'drum', 'label': '鼓'},
    {'id': 'bell', 'label': '铃铛'},
]


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def preserve_or_write(path: Path, data: bytes) -> None:
    if path.exists():
        if path.read_bytes() != data:
            raise ValueError(f'Existing file differs; preserve it and create a new version: {path}')
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('xb') as stream:
        stream.write(data)


def target_groups(category_id: str, number: int) -> list[str]:
    if category_id != 'instruments':
        return []
    if 1 <= number <= 4:
        return ['pipa']
    if 25 <= number <= 30:
        return ['drum']
    if 34 <= number <= 36:
        return ['bell']
    return []


def safe_hit_point(image: Image.Image) -> dict[str, float]:
    """Choose a central pixel inside the largest alpha >= 128 component.

    Prefer a two-pixel inset from transparent pixels. This avoids transparent
    holes, faint background residue and detached decorative fragments.
    """
    width, height = image.size
    alpha = image.getchannel('A')
    pixels = alpha.tobytes()
    visited = bytearray(width * height)
    largest: list[int] = []
    for start, opacity in enumerate(pixels):
        if opacity < ALPHA_THRESHOLD or visited[start]:
            continue
        visited[start] = 1
        component = [start]
        cursor = 0
        while cursor < len(component):
            index = component[cursor]
            cursor += 1
            x, y = index % width, index // width
            neighbors = []
            if x:
                neighbors.append(index - 1)
            if x + 1 < width:
                neighbors.append(index + 1)
            if y:
                neighbors.append(index - width)
            if y + 1 < height:
                neighbors.append(index + width)
            for neighbor in neighbors:
                if not visited[neighbor] and pixels[neighbor] >= ALPHA_THRESHOLD:
                    visited[neighbor] = 1
                    component.append(neighbor)
        if len(component) > len(largest):
            largest = component
    if not largest:
        raise ValueError('Image has no foreground pixels at alpha >= 128')
    mask = alpha.point(lambda value: 255 if value >= ALPHA_THRESHOLD else 0)
    inset = mask.filter(ImageFilter.MinFilter(5)).tobytes()
    candidates = [index for index in largest if inset[index]] or largest
    center_x, center_y = (width - 1) / 2, (height - 1) / 2
    chosen = min(candidates, key=lambda index: (
        (index % width - center_x) ** 2 + (index // width - center_y) ** 2,
        index,
    ))
    return {
        'x': round((chosen % width + .5) / width, 6),
        'y': round((chosen // width + .5) / height, 6),
    }


def archive_file(source_root: Path, source: Path, originals: list[dict]) -> str:
    relative = source.relative_to(source_root).as_posix()
    archive_path = 'originals/' + relative
    data = source.read_bytes()
    preserve_or_write(ARCHIVE_ROOT / archive_path, data)
    originals.append({'path': archive_path, 'sha256': sha256(data), 'bytes': len(data)})
    return archive_path


def build(source_root: Path) -> None:
    originals: list[dict] = []
    derivatives: list[dict] = []
    sprites: list[dict] = []
    archive_file(source_root, source_root / '_统计.json', originals)
    for category_id, folder, expected_count in CATEGORIES:
        source_folder = source_root / folder
        source_files = sorted(source_folder.glob('*.png'), key=lambda path: int(path.stem))
        numbers = [int(path.stem) for path in source_files]
        if numbers != list(range(1, expected_count + 1)):
            raise ValueError(f'{folder}: expected consecutive 1..{expected_count}, got {numbers}')
        for metadata in sorted(source_folder.glob('*.json')):
            archive_file(source_root, metadata, originals)
        for source in source_files:
            number = int(source.stem)
            archived_path = archive_file(source_root, source, originals)
            with Image.open(source) as original:
                original.load()
                if 'A' not in original.getbands():
                    raise ValueError(f'Supplied PNG has no alpha channel: {source}')
                image = original.convert('RGBA')
            original_size = image.size
            scale = min(1, MAX_EDGE / max(original_size))
            size = tuple(max(1, round(dimension * scale)) for dimension in original_size)
            if size != original_size:
                image = image.resize(size, Image.Resampling.LANCZOS)
            filename = f'{category_id}-{number:03}.png'
            runtime_path = RUNTIME_ROOT / filename
            output = io.BytesIO()
            image.save(output, format='PNG', optimize=True)
            data = output.getvalue()
            preserve_or_write(runtime_path, data)
            sprite = {
                'id': f'ho-{category_id}-{number:03}',
                'categoryId': category_id,
                'path': f'/assets/shared/hidden-object/v001/{filename}',
                'width': image.width,
                'height': image.height,
                'groupIds': target_groups(category_id, number),
                'hitPoint': safe_hit_point(image),
            }
            sprites.append(sprite)
            derivatives.append({
                'spriteId': sprite['id'],
                'originalPath': archived_path,
                'originalWidth': original_size[0],
                'originalHeight': original_size[1],
                'runtimePath': runtime_path.relative_to(PROJECT_ROOT).as_posix(),
                'sha256': sha256(data),
                'bytes': len(data),
            })
    pool = {'id': 'dunhuang-stickers-v001', 'groups': LEGACY_GROUPS, 'sprites': sprites}
    # A legacy rebuild verifies v001 without downgrading a newer active pool.
    active = json.loads(POOL_PATH.read_text()) if POOL_PATH.exists() else None
    if active is None or all('/hidden-object/v001/' in sprite['path'] for sprite in active['sprites']):
        preserve_or_write(POOL_PATH, json_bytes(pool))
    manifest = {
        'schemaVersion': 1,
        'poolId': pool['id'],
        'sourceRoot': str(source_root),
        'sourceNote': '用户交付的独立贴纸元素。目录及母拼版名称不作为文物来源、年代或洞窟考据。',
        'processing': {
            'runtimeMaxEdge': MAX_EDGE,
            'resize': 'Pillow LANCZOS，按原比例仅缩小，不放大、不裁切、不补绘；保留RGBA透明通道。',
            'safeHitPoint': 'alpha>=128最大连通主体内，优先离透明边界至少2像素、最接近图心的像素中心，归一化坐标。',
            'targetGroups': '仅用户确认的乐器01-04为pipa、25-30为drum、34-36为bell；其他条目无自动历史命名。',
            'originalPolicy': '520张原PNG及全部7份统计/来源/位置JSON逐字节归档，保留相对路径与原文件名；不归档DS_Store及派生预览拼版。',
        },
        'categoryCounts': {category_id: count for category_id, _, count in CATEGORIES},
        'originals': originals,
        'derivatives': derivatives,
    }
    preserve_or_write(ARCHIVE_ROOT / 'manifest.json', json_bytes(manifest))
    readme = '''# 找物独立贴纸素材 v001

用户于2026-11-01授权接入程序化找物试玩。`originals/`逐字节保留用户提供的520张原PNG与7份统计、位置和来源JSON，原文件名与分类目录名均保留。`manifest.json`记录每个原文件和运行派生图的SHA-256、尺寸及映射。

运行图位于`public/assets/shared/hidden-object/v001/`，最长边256px，不放大、裁切或内容改绘；PNG保留透明。池索引位于`src/content/hidden-object/pool.json`。同一局只加载抽中的素材。

只将乐器01–04登记为“琵琶造型”、25–30登记为“鼓”、34–36登记为“铃铛”。其余图片只按素材类别索引；目录、AI造型或来源拼版文件名不自动成为历史事实。原有母图切割坐标不作关卡布局坐标。

重建：`python3 scripts/import-hidden-object-assets.py --source-root <切割结果目录>`。只验证：`python3 scripts/import-hidden-object-assets.py --check`。脚本不删除文件，不覆盖与现有内容不同的原稿或派生文件；素材变化应另建版本。
'''
    preserve_or_write(ARCHIVE_ROOT / 'README.md', readme.encode('utf-8'))


def legacy_pool(manifest: dict) -> dict:
    """Recover the immutable v001 pool from its recorded PNGs, not the active pool."""
    sprites = []
    for derivative in manifest['derivatives']:
        sprite_id = derivative['spriteId']
        category_id, number_text = sprite_id.removeprefix('ho-').rsplit('-', 1)
        runtime = PROJECT_ROOT / derivative['runtimePath']
        with Image.open(runtime) as image:
            sprites.append({
                'id': sprite_id, 'categoryId': category_id,
                'path': '/' + runtime.relative_to(PROJECT_ROOT / 'public').as_posix(),
                'width': image.width, 'height': image.height,
                'groupIds': target_groups(category_id, int(number_text)),
                'hitPoint': safe_hit_point(image),
            })
    return {'id': manifest['poolId'], 'groups': LEGACY_GROUPS, 'sprites': sprites}


def build_version(source_root: Path, version: str, max_edge: int, layout_reference: Path) -> None:
    """Create a new derivative version, referring to the unchanged v001 originals."""
    archive_root = ARCHIVE_ROOT.parent / version
    runtime_root = RUNTIME_ROOT.parent / version
    original_manifest_path = ARCHIVE_ROOT / 'manifest.json'
    original_manifest_data = original_manifest_path.read_bytes()
    original_manifest = json.loads(original_manifest_data)
    original_files = {item['path']: item for item in original_manifest['originals']}
    sprites = []
    derivatives = []
    for original_derivative in original_manifest['derivatives']:
        sprite_id = original_derivative['spriteId']
        category_id, number_text = sprite_id.removeprefix('ho-').rsplit('-', 1)
        number = int(number_text)
        original_path = original_derivative['originalPath']
        source = source_root / Path(original_path).relative_to('originals')
        original_data = source.read_bytes()
        original_record = original_files[original_path]
        if sha256(original_data) != original_record['sha256']:
            raise ValueError(f'Source no longer matches the v001 archived original: {source}')
        with Image.open(io.BytesIO(original_data)) as original:
            if 'A' not in original.getbands():
                raise ValueError(f'Supplied PNG has no alpha channel: {source}')
            image = original.convert('RGBA')
        original_size = image.size
        scale = min(1, max_edge / max(original_size))
        size = tuple(max(1, round(value * scale)) for value in original_size)
        if image.size != size:
            image = image.resize(size, Image.Resampling.LANCZOS)
        filename = f'{category_id}-{number:03}.png'
        runtime_path = runtime_root / filename
        output = io.BytesIO()
        image.save(output, format='PNG', optimize=True)
        data = output.getvalue()
        preserve_or_write(runtime_path, data)
        sprites.append({
            'id': sprite_id, 'categoryId': category_id,
            'path': f'/assets/shared/hidden-object/{version}/{filename}',
            'width': image.width, 'height': image.height,
            'groupIds': target_groups(category_id, number),
            'hitPoint': safe_hit_point(image),
        })
        derivatives.append({
            'spriteId': sprite_id, 'originalPath': original_path,
            'originalSha256': original_record['sha256'],
            'originalWidth': original_size[0], 'originalHeight': original_size[1],
            'runtimePath': runtime_path.relative_to(PROJECT_ROOT).as_posix(),
            'sha256': sha256(data), 'bytes': len(data),
        })
    pool = {'id': 'dunhuang-stickers-v001', 'groups': GROUPS, 'sprites': sprites}
    pool_data = json_bytes(pool)
    pool_file = archive_root / f'pool-{version}.json'
    preserve_or_write(pool_file, pool_data)
    archived_reference = archive_root / 'layout-reference.png'
    reference_data = layout_reference.read_bytes() if layout_reference.exists() else archived_reference.read_bytes()
    preserve_or_write(archived_reference, reference_data)
    with Image.open(io.BytesIO(reference_data)) as reference:
        reference_size = reference.size
    manifest = {
        'schemaVersion': 2, 'version': version, 'poolId': pool['id'],
        'originalArchive': {
            'manifestPath': original_manifest_path.relative_to(PROJECT_ROOT).as_posix(),
            'sha256': sha256(original_manifest_data), 'files': len(original_files),
            'policy': '原始527件均沿用v001归档，本版本不重复复制或修改原件。',
        },
        'processing': {
            'runtimeMaxEdge': max_edge,
            'resize': 'Pillow LANCZOS，按原比例仅缩小，不放大、不裁切、不补绘；保留RGBA透明通道。',
            'safeHitPoint': 'alpha>=128最大连通主体内，优先离透明边界至少2像素、最接近图心的像素中心，归一化坐标。',
            'targetGroups': '沿用稳定素材ID；仅乐器01-04为pipa、25-30为drum、34-36为bell。',
            'sourceRoot': str(source_root),
        },
        'sourceNote': original_manifest['sourceNote'],
        'categoryCounts': original_manifest['categoryCounts'],
        'pool': {'path': pool_file.name, 'sha256': sha256(pool_data), 'bytes': len(pool_data)},
        'layoutReference': {
            'path': archived_reference.name, 'sourcePath': str(layout_reference),
            'sha256': sha256(reference_data), 'bytes': len(reference_data),
            'width': reference_size[0], 'height': reference_size[1],
            'note': '用户提供的《找你妹》图像占比与布局参考，仅作交互布局参考，不作游戏运行美术。',
        },
        'derivatives': derivatives,
    }
    preserve_or_write(archive_root / 'manifest.json', json_bytes(manifest))
    readme = f'''# 找物独立贴纸派生 {version}

本版本以用户确认的更大物件和更清晰画布方案为目标，从v001原始归档重新生成520张透明PNG，最长边{max_edge}px，只缩小、不放大、不AI补绘。原图不足{max_edge}px时保留原生尺寸。v001的527件原始文件、旧256px运行图与处理登记均不覆盖。

`manifest.json`以SHA-256引用v001原档manifest，并逐项登记原PNG的SHA、原生尺寸、运行图尺寸和SHA。`pool-{version}.json`保存本版本可重建的完整池索引，稳定pool ID、sprite ID和目标分组均沿用。当前激活索引为`src/content/hidden-object/pool.json`。

`layout-reference.png`逐字节归档用户的《找你妹》布局参考，SHA与原路径见manifest；仅用于比较物件占比，不作为正式游戏素材或文化考据。

重建并激活：`python3 scripts/import-hidden-object-assets.py --version {version} --max-edge {max_edge}`。默认从v001归档读取原件，可选`--source-root <切割结果目录>`。只验证：`python3 scripts/import-hidden-object-assets.py --version {version} --max-edge {max_edge} --check`。旧命令`python3 scripts/import-hidden-object-assets.py --check`仍独立核验v001，不要求active pool仍指向v001，也不会降级当前索引。
'''
    preserve_or_write(archive_root / 'README.md', readme.encode('utf-8'))
    # Verify every derivative before switching the active index.
    check(source_root, version=version, max_edge=max_edge, require_active=False)
    if POOL_PATH.exists():
        active = json.loads(POOL_PATH.read_text())
        assert active['id'] == pool['id']
        assert [group['id'] for group in active['groups']] == [group['id'] for group in pool['groups']]
        stable = lambda entry: (entry['id'], entry['categoryId'], entry['groupIds'])
        assert [stable(entry) for entry in active['sprites']] == [stable(entry) for entry in sprites]
    if not POOL_PATH.exists() or POOL_PATH.read_bytes() != pool_data:
        POOL_PATH.parent.mkdir(parents=True, exist_ok=True)
        POOL_PATH.write_bytes(pool_data)


def check(source_root: Path, *, version: str = 'v001', max_edge: int = MAX_EDGE, require_active: bool = False) -> None:
    archive_root = ARCHIVE_ROOT.parent / version
    runtime_root = RUNTIME_ROOT.parent / version
    manifest = json.loads((archive_root / 'manifest.json').read_text())
    original_manifest_path = ARCHIVE_ROOT / 'manifest.json'
    original_manifest_data = original_manifest_path.read_bytes()
    original_manifest = json.loads(original_manifest_data)
    if version == 'v001':
        pool = legacy_pool(manifest)
        pool_bytes = len(json_bytes(pool))
    else:
        assert manifest['originalArchive']['manifestPath'] == original_manifest_path.relative_to(PROJECT_ROOT).as_posix()
        assert manifest['originalArchive']['sha256'] == sha256(original_manifest_data)
        assert manifest['originalArchive']['files'] == 527
        pool_path = archive_root / manifest['pool']['path']
        pool_data = pool_path.read_bytes()
        assert sha256(pool_data) == manifest['pool']['sha256']
        assert len(pool_data) == manifest['pool']['bytes']
        pool = json.loads(pool_data)
        pool_bytes = len(pool_data)
        if require_active:
            active = json.loads(POOL_PATH.read_text())
            assert active['id'] == pool['id'], 'Active pool ID differs from the selected version'
            assert [group['id'] for group in active['groups']] == [group['id'] for group in pool['groups']], 'Active group IDs differ from the selected version'
            assert active['sprites'] == pool['sprites'], 'Active sprites differ from the selected version'
            assert active['groups'] == GROUPS, 'Active group display names differ from the current names'
        reference = manifest['layoutReference']
        reference_path = archive_root / reference['path']
        reference_data = reference_path.read_bytes()
        assert sha256(reference_data) == reference['sha256']
        assert len(reference_data) == reference['bytes']
        with Image.open(io.BytesIO(reference_data)) as image:
            assert image.size == (reference['width'], reference['height'])
        reference_source = Path(reference['sourcePath'])
        if reference_source.exists():
            assert sha256(reference_source.read_bytes()) == reference['sha256']
    assert manifest['processing']['runtimeMaxEdge'] == max_edge
    assert pool['id'] == manifest['poolId'] == 'dunhuang-stickers-v001'
    # Existing v001/v002 snapshots retain their original labels and recorded hashes.
    assert pool['groups'] == (LEGACY_GROUPS if version in ('v001', 'v002') else GROUPS)
    assert len(pool['sprites']) == len(manifest['derivatives']) == 520
    assert len(original_manifest['originals']) == 527
    assert len({sprite['id'] for sprite in pool['sprites']}) == 520
    derivatives = {item['spriteId']: item for item in manifest['derivatives']}
    original_derivatives = {item['spriteId']: item for item in original_manifest['derivatives']}
    original_files = {item['path']: item for item in original_manifest['originals']}
    for original in original_manifest['originals']:
        archived = ARCHIVE_ROOT / original['path']
        assert sha256(archived.read_bytes()) == original['sha256'], archived
        assert archived.stat().st_size == original['bytes'], archived
        source = source_root / Path(original['path']).relative_to('originals')
        if source.exists():
            assert sha256(source.read_bytes()) == original['sha256'], source
    counts: dict[str, int] = {}
    groups: dict[str, int] = {group['id']: 0 for group in GROUPS}
    runtime_bytes = 0
    for sprite in pool['sprites']:
        category_id = sprite['categoryId']
        number = int(sprite['id'].rsplit('-', 1)[1])
        assert sprite['id'] == f'ho-{category_id}-{number:03}'
        assert sprite['path'] == f'/assets/shared/hidden-object/{version}/{category_id}-{number:03}.png'
        assert sprite['groupIds'] == target_groups(category_id, number), sprite['id']
        counts[category_id] = counts.get(category_id, 0) + 1
        for group in sprite['groupIds']:
            groups[group] += 1
        runtime = PROJECT_ROOT / 'public' / sprite['path'].lstrip('/')
        derivative = derivatives[sprite['id']]
        if version != 'v001':
            original_derivative = original_derivatives[sprite['id']]
            assert derivative['originalPath'] == original_derivative['originalPath']
            assert (derivative['originalWidth'], derivative['originalHeight']) == (original_derivative['originalWidth'], original_derivative['originalHeight'])
            assert derivative['originalSha256'] == original_files[derivative['originalPath']]['sha256']
        assert derivative['runtimePath'] == runtime.relative_to(PROJECT_ROOT).as_posix()
        data = runtime.read_bytes()
        assert sha256(data) == derivative['sha256'], runtime
        assert len(data) == derivative['bytes'], runtime
        runtime_bytes += len(data)
        with Image.open(runtime) as image:
            assert image.mode == 'RGBA', runtime
            assert image.size == (sprite['width'], sprite['height']), runtime
            assert max(image.size) <= max_edge, runtime
            assert image.width <= derivative['originalWidth'] and image.height <= derivative['originalHeight'], runtime
            scale = min(1, max_edge / max(derivative['originalWidth'], derivative['originalHeight']))
            assert image.size == tuple(max(1, round(value * scale)) for value in (derivative['originalWidth'], derivative['originalHeight'])), runtime
            alpha = image.getchannel('A')
            assert alpha.getextrema()[0] == 0 and alpha.getextrema()[1] >= ALPHA_THRESHOLD, runtime
            point = sprite['hitPoint']
            assert 0 < point['x'] < 1 and 0 < point['y'] < 1, runtime
            pixel = (int(point['x'] * image.width), int(point['y'] * image.height))
            assert alpha.getpixel(pixel) >= ALPHA_THRESHOLD, (runtime, point)
    assert counts == manifest['categoryCounts'] == {category_id: count for category_id, _, count in CATEGORIES}
    assert groups == {'pipa': 4, 'drum': 6, 'bell': 3}
    assert len(list(runtime_root.glob('*.png'))) == 520
    print(json.dumps({
        'version': version, 'maxEdge': max_edge, 'verifiedSprites': 520, 'verifiedOriginalFiles': 527,
        'categoryCounts': counts, 'targetGroupCounts': groups,
        'runtimeBytes': runtime_bytes, 'runtimeMiB': round(runtime_bytes / 1024 ** 2, 2),
        'poolBytes': pool_bytes,
    }, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', type=Path, help='Defaults to Downloads for v001, or the v001 original archive for v002')
    parser.add_argument('--version', choices=('v001', 'v002'), default='v001')
    parser.add_argument('--max-edge', type=int, help='Defaults to 256 for v001, 512 for v002; never enlarges originals')
    parser.add_argument('--layout-reference', type=Path, default=DEFAULT_LAYOUT_REFERENCE)
    parser.add_argument('--check', action='store_true', help='Verify existing files without writing')
    options = parser.parse_args()
    max_edge = options.max_edge if options.max_edge is not None else (256 if options.version == 'v001' else 512)
    if max_edge < 1 or (options.version == 'v001' and max_edge != 256):
        parser.error('max-edge must be positive; immutable v001 must remain at 256px')
    source_root = options.source_root or (DEFAULT_SOURCE_ROOT if options.version == 'v001' else ARCHIVE_ROOT / 'originals')
    if not options.check:
        if options.version == 'v001':
            build(source_root)
        else:
            build_version(source_root, options.version, max_edge, options.layout_reference)
    # Read-only historical checks validate archived bytes independently of active display names.
    check(source_root, version=options.version, max_edge=max_edge,
          require_active=not options.check and options.version != 'v001')

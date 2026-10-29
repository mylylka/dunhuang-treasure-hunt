"""Import the three user-replaced color references without touching coloring works.

This reference-only batch uses archive v003, avoiding the existing v002 line repairs.
Runtime filenames use reference-v002: the second reference image version.
Re-run from the archived files if the user's Downloads directory is unavailable.
"""
from __future__ import annotations

from datetime import date
from hashlib import sha256
import json
from pathlib import Path
import re
from shutil import copy2

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DELIVERY = Path('/Users/liujing/Downloads/填色游戏素材')
ARCHIVE_VERSION = 'v003'
REFERENCE_VERSION = 'user-reference-v002'
REFERENCES = [
    ('coloring-three-rabbits', '三兔莲花藻井颜色参考.png'),
    ('coloring-grape-pomegranate', '葡萄石榴纹藻井颜色参考.png'),
    ('coloring-grape-lotus', '葡萄莲花纹藻井颜色参考.png'),
]


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def main() -> None:
    index_path = ROOT / 'src/content/assets.json'
    index_text = index_path.read_text()
    original_assets = json.loads(index_text)
    guarded_assets = [item for item in original_assets if item['id'].endswith(('-line', '-regions')) and item['id'].startswith('coloring-')]
    guarded_files = {ROOT / 'public' / item['path'].lstrip('/'): digest(ROOT / 'public' / item['path'].lstrip('/')) for item in guarded_assets}
    guarded_files.update({ROOT / f'src/content/levels/{level_id}.json': digest(ROOT / f'src/content/levels/{level_id}.json') for level_id, _ in REFERENCES})
    updated = []
    for level_id, filename in REFERENCES:
        archive = ROOT / 'art-source/levels' / level_id / ARCHIVE_VERSION
        original = archive / filename
        delivery = DELIVERY / filename
        source = delivery if delivery.exists() else original
        if not source.exists():
            raise RuntimeError(f'Missing supplied or archived reference: {filename}')
        source_hash = digest(source)
        if original.exists() and digest(original) != source_hash:
            raise RuntimeError(f'Archive differs; create a new version instead of overwriting: {original}')
        archive.mkdir(parents=True, exist_ok=True)
        if not original.exists():
            copy2(source, original)
        with Image.open(original) as incoming:
            image = ImageOps.exif_transpose(incoming).convert('RGB')
            width, height = image.size
        runtime = ROOT / 'public/assets/levels' / level_id / f'{level_id}-reference-v002.png'
        image.save(runtime, optimize=True)
        level = json.loads((ROOT / f'src/content/levels/{level_id}.json').read_text())
        assert level['referenceAssetId'] == level_id + '-reference'
        assert level['thumbnailAssetId'] == level_id + '-reference'
        note_path = archive / 'reference-update.json'
        record = {
            'date': str(date(2026, 10, 29)),
            'purpose': '用户替换配色参考和关卡封面；不更改线稿、区域图、作品版本或存档。',
            'originalFile': filename, 'deliveryPath': str(delivery),
            'originalSha256': source_hash, 'width': width, 'height': height,
            'archiveVersion': ARCHIVE_VERSION, 'runtimeReferenceVersion': REFERENCE_VERSION,
            'runtimePath': str(runtime.relative_to(ROOT)), 'runtimeSha256': digest(runtime),
            'processing': '完整保留构图；按EXIF方向规范化并转换RGB PNG；不缩放、不裁切、不调色、不改图。',
            'source': '开发者使用AI生成并重新交付的教学配色示意；非原壁画照片。',
            'pixelVerification': '运行PNG与方向规范化后的交付原稿RGB像素完全一致。',
            'unchanged': ['lineAssetId', 'regionsAssetId', 'artworkVersion', 'level configuration', 'stored works', 'completion progress'],
            'previousReference': f'art-source/levels/{level_id}/v001/{filename}',
        }
        note_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
        asset_id = level_id + '-reference'
        old_asset = next(item for item in original_assets if item['id'] == asset_id)
        asset = {**old_asset, 'path': '/' + str(runtime.relative_to(ROOT / 'public')), 'width': width, 'height': height,
                 'version': REFERENCE_VERSION,
                 'sourceNote': f'开发者2026-10-29重新交付的AI教学配色参考，完整原稿与参考更新记录见art-source/levels/{level_id}/v003/reference-update.json。完整保留尺寸与构图；仅格式转换，不改线稿、区域图和作品版本。'}
        # Replace only this object's text, preserving unrelated simultaneous index edits.
        pattern = re.compile(r'  \{\n    "id": "' + re.escape(asset_id) + r'",.*?\n  \}', re.S)
        block = json.dumps(asset, ensure_ascii=False, indent=2)
        block = '\n'.join('  ' + line for line in block.splitlines())
        current = index_path.read_text()
        current, count = pattern.subn(lambda _: block, current)
        if count != 1:
            raise RuntimeError(f'Expected one stable reference entry, found {count}: {asset_id}')
        index_path.write_text(current)
        with Image.open(runtime) as decoded:
            assert decoded.convert('RGB').tobytes() == image.tobytes()
        updated.append({'id': asset_id, 'size': [width, height], 'sha256': source_hash, 'runtime': str(runtime.relative_to(ROOT))})
    after_assets = json.loads(index_path.read_text())
    assert guarded_assets == [item for item in after_assets if item['id'].endswith(('-line', '-regions')) and item['id'].startswith('coloring-')]
    assert all(digest(path) == previous_hash for path, previous_hash in guarded_files.items()), 'Line art, region or level config changed'
    print(json.dumps({'updated': updated, 'protectedFilesUnchanged': len(guarded_files), 'pixelVerification': 'identical RGB'}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()

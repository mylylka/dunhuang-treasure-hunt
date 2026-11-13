#!/usr/bin/env python3
"""Register visually reviewed exact-image targets without changing any sticker pixels.

Build the active pool and a new v003 metadata snapshot from the immutable v002
pool. --check compares the generated metadata and every reviewed source PNG;
it never writes files. Historical pools and manifests are never overwritten.
"""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import io
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE_POOL = ROOT / 'art-source/shared/hidden-object-elements/v002/pool-v002.json'
ACTIVE_POOL = ROOT / 'src/content/hidden-object/pool.json'
ARCHIVE = ROOT / 'art-source/shared/hidden-object-elements/v003'
# Every listed source was inspected in the technical contact sheets on 2026-11-03.
# Names describe the visible drawing, never an attributed cave, date, or ritual use.
REVIEWED_GROUPS = [
    ('pipa', '琵琶', 'instruments', [1, 2, 3, 4], '梨形琴身、长颈与弦；保留原已登记组。'),
    ('drum', '鼓', 'instruments', [25, 26, 27, 28, 29, 30], '可见鼓面与鼓身；保留原已登记组。'),
    ('bell', '铃铛', 'instruments', [34, 35, 36], '悬环、钟形主体与下垂部件；保留原已登记组。'),
    ('flute', '笛子', 'instruments', [22, 23], '横向管身与明确指孔；不将未知竖管一并命名。'),
    ('panpipes', '排箫', 'instruments', [16, 17], '并列且长短渐变的多根管身。'),
    ('cymbals', '钹', 'instruments', [31, 32], '成对圆盘与中央握持部；一张PNG仍只计一个实例。'),
    ('ribbon', '飘带', 'clothing', [1, 2], '连续卷曲的长条织物轮廓。'),
    ('crown', '头冠', 'clothing', [13, 15], '拱形佩戴底边与向上冠饰。'),
    ('necklace', '项链', 'clothing', [19, 20], '弧形链条与垂饰；仅作外观名称。'),
    ('earring', '耳坠', 'clothing', [23, 24], '单件挂钩或挂环连下垂饰件。'),
    ('bracelet', '手镯', 'clothing', [30, 31], '明确中空的环形镯身。'),
    ('belt', '腰带', 'clothing', [33, 35], '横向环带、搭扣与下垂织物。'),
    ('boots', '靴子', 'clothing', [57, 58], '鞋底、鞋尖与高于脚踝的靴筒。'),
    ('deer', '鹿', 'animals', [1, 2], '四足、鹿角及斑点；不据配色认定物种或故事身份。'),
    ('peacock', '孔雀', 'animals', [7, 8], '冠羽与具有眼斑的长尾或开屏尾。'),
    ('rabbit', '兔子', 'animals', [19, 20], '长耳、兔形头与后足。'),
    ('horse', '马', 'animals', [22, 23], '马形头、鬃毛、蹄与长尾；排除带翼变体。'),
    ('camel', '骆驼', 'animals', [25, 26], '长颈与驼峰；站立或卧姿仍按任务精确图片判定。'),
    ('ox', '牛', 'animals', [28, 29], '牛形口鼻、角、蹄与躯干。'),
    ('lion', '狮子', 'animals', [34, 35], '狮形头部、鬃毛与四足；不认定宗教或神兽身份。'),
    ('fish', '鱼', 'animals', [46, 47], '鱼鳍、鳞片与尾鳍。'),
    ('lotus', '莲花', 'plants', [1, 2], '多层尖瓣、中心花心与下部花托。'),
    ('seedpod', '莲蓬', 'plants', [4, 5], '多孔蓬面与杯状主体。'),
    ('lotus-leaf', '荷叶', 'plants', [7, 8], '展开或折曲叶面与放射叶脉。'),
    ('flower', '花形', 'plants', [16, 17], '放射状多瓣花形；不推断具体植物品种。'),
    ('leaf', '叶片', 'plants', [22, 24], '单片尖端叶形与叶脉；不推断具体植物品种。'),
    ('round-pattern', '圆纹', 'patterns', [1, 2], '完整圆形边界及内部装饰；不认定纹样学名。'),
    ('diamond-pattern', '菱纹', 'patterns', [4, 5], '明确菱形外边界及内部装饰。'),
    ('flame-pattern', '火焰纹', 'patterns', [13, 15], '向上尖出的火焰形轮廓；不附会象征意义。'),
    ('incense-burner', '香炉', 'ritual', [1, 3], '带盖、足与烟气的炉形器物；仅命名图示外观。'),
    ('candleholder', '烛台', 'ritual', [21, 22], '可见蜡烛、火焰和承托台座。'),
    ('bowl', '碗', 'ritual', [34, 35], '敞口、中空碗身；不认定具体供奉用途。'),
    ('scroll', '卷轴', 'ritual', [47, 50], '卷起或展开的纸面与轴端。'),
    ('bead-string', '珠串', 'ritual', [51, 52], '连续成串的圆珠和流苏；不认定宗教用途。'),
]


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def preserve_or_write(path: Path, data: bytes, check: bool) -> None:
    if check or path.exists():
        assert path.read_bytes() == data, f'Existing file differs; preserve it and create a new version: {path}'
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('xb') as stream:
        stream.write(data)


def main(check: bool) -> None:
    source = SOURCE_POOL.read_bytes()
    assert digest(source) == '3532d684b304c7178dbc8821d2620d4b541fca64a7c2a9ca1b3b79ec57f51aef'
    pool = json.loads(source)
    sprites = {sprite['id']: sprite for sprite in pool['sprites']}
    assert len(sprites) == 520
    membership: dict[str, str] = {}
    groups, reviews = [], []
    reviewed_sources = []
    for group_id, label, category, numbers, rationale in REVIEWED_GROUPS:
        ids = [f'ho-{category}-{number:03d}' for number in numbers]
        groups.append({'id': group_id, 'label': label})
        reviews.append({'id': group_id, 'label': label, 'categoryId': category,
                        'spriteIds': ids, 'visualRationale': rationale, 'status': 'reviewed-for-exact-image-matching'})
        for sprite_id in ids:
            assert sprite_id not in membership, f'A sprite must not ambiguously belong to two task groups: {sprite_id}'
            sprite = sprites[sprite_id]
            assert sprite['categoryId'] == category
            membership[sprite_id] = group_id
            path = ROOT / 'public' / sprite['path'].lstrip('/')
            data = path.read_bytes()
            with Image.open(io.BytesIO(data)) as image:
                assert image.size == (sprite['width'], sprite['height'])
                assert max(image.size) <= 512
                assert image.mode == 'RGBA'
            reviewed_sources.append({'spriteId': sprite_id, 'runtimePath': sprite['path'], 'sha256': digest(data)})
    for sprite in pool['sprites']:
        old_groups = sprite['groupIds']
        group = membership.get(sprite['id'])
        sprite['groupIds'] = [group] if group else []
        if old_groups:
            assert sprite['groupIds'] == old_groups, 'Original target classifications must remain unchanged'
    pool['groups'] = groups
    active = json_bytes(pool)
    # Reproducible technical contact sheet: source thumbnails, no repainting or color changes.
    columns, tile_w, tile_h = 9, 140, 148
    sheet = Image.new('RGB', (columns * tile_w, ((len(membership) + columns - 1) // columns) * tile_h), '#fbf7ec')
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=13)
    for index, sprite_id in enumerate(membership):
        sprite = sprites[sprite_id]
        x, y = (index % columns) * tile_w, (index // columns) * tile_h
        draw.rectangle((x, y, x + tile_w - 1, y + tile_h - 1), outline='#c7bca6')
        with Image.open(ROOT / 'public' / sprite['path'].lstrip('/')) as original:
            image = original.copy()
        image.thumbnail((124, 119))
        sheet.paste(image, (x + (tile_w - image.width) // 2, y + 5 + (119 - image.height) // 2), image)
        draw.text((x + 6, y + 127), sprite_id.replace('ho-', ''), fill='#302a25', font=font)
    buffer = io.BytesIO()
    sheet.save(buffer, format='PNG')
    review_sheet = buffer.getvalue()
    review = {'schemaVersion': 1, 'reviewDate': '2026-11-03', 'reviewer': 'Codex visual inspection',
              'scope': '精确图片任务的可见外形分类，不是器物考据或历史身份鉴定；未列入的图片不推定为反例。',
              'reviewInputs': [f'work/hidden-target-review-{category}-01.png' for category in
                               ('instruments', 'clothing', 'animals', 'plants', 'patterns', 'ritual')],
              'groups': reviews}
    manifest = {'schemaVersion': 1, 'version': 'v003', 'poolId': pool['id'],
                'sourcePool': SOURCE_POOL.relative_to(ROOT).as_posix(), 'sourcePoolSha256': digest(source),
                'activePool': ACTIVE_POOL.relative_to(ROOT).as_posix(), 'activePoolSha256': digest(active),
                'spriteCount': len(sprites), 'targetGroupCount': len(groups), 'targetCandidateCount': len(membership),
                'targetCandidatesByCategory': dict(Counter(sprites[sprite_id]['categoryId'] for sprite_id in membership)),
                'pixelPolicy': '仅扩展目标分类元数据，520张贴纸继续引用v002原字节；不重画、不改色、不镜像、不修改尺寸或命中点。',
                'namingPolicy': '名称仅描述图示可见外形；不声称真实洞窟、年代、器物用途、植物学或宗教身份。',
                'reviewSheet': 'target-review.png', 'reviewSheetSha256': digest(review_sheet), 'sources': reviewed_sources}
    readme = '''# 找物目标目检 v003

本轮仅扩展三章九关使用的目标分类。75张候选/34组由技术缩略图逐组目检；原琵琶、鼓、铃铛组与全部既有素材ID保留。具体图号及可见形状依据见`target-groups.json`，总览见`target-review.png`。名称只用于任务外形观察，不构成历史或文化鉴定。

`pool-v003.json`是新的活跃池快照，仍引用v002的520张运行贴纸原字节，不覆盖v001/v002池或manifest。未选入目标的图片仍可作为各关允许库中的干扰，按精确素材ID匹配，不能因名称近似被判对。

重建：`python3 scripts/import-hidden-object-targets-v003.py`；只读验证：同命令加`--check`。新归档文件若与重建内容不同会拒绝覆盖；活跃池是经授权更新的正式索引。
'''.encode('utf-8')
    files = {ARCHIVE / 'target-groups.json': json_bytes(review), ARCHIVE / 'pool-v003.json': active,
             ARCHIVE / 'manifest.json': json_bytes(manifest), ARCHIVE / 'target-review.png': review_sheet,
             ARCHIVE / 'README.md': readme}
    for path, data in files.items():
        preserve_or_write(path, data, check)
    if check:
        assert ACTIVE_POOL.read_bytes() == active, 'Active pool differs from reviewed v003'
    else:
        ACTIVE_POOL.write_bytes(active)
    print(json.dumps({'groups': len(groups), 'candidateSprites': len(membership),
                      'activePoolSha256': digest(active), 'targetCandidatesByCategory': manifest['targetCandidatesByCategory']}, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    main(parser.parse_args().check)

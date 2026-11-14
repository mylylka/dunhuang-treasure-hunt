"""Archive the supplied geometry pair and import its four repeated difference types.

Only copies existing B pixels into approved motif areas. Pillow is used for
deterministic technical compositing, never for generating or repainting art.
Normal game builds do not require Python.
"""
from __future__ import annotations

import argparse
from hashlib import sha256
import json
from math import hypot
from pathlib import Path
from shutil import copy2

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
LEVEL_ID = 'patterns-geometry'
VERSION = 'user-geometry-v001'


def rect(box: tuple[int, int, int, int], feather: int = 3) -> dict:
    return {'box': list(box), 'shape': 'rectangle', 'inwardFeatherPixels': feather}


def pearl(x: int, y: int, clip: tuple[int, int, int, int]) -> dict:
    box = [max(x - 17, clip[0]), max(y - 17, clip[1]),
           min(x + 18, clip[2]), min(y + 18, clip[3])]
    return {'box': box, 'shape': 'circle-interior', 'center': [x, y],
            'radiusPixels': 14, 'inwardFeatherPixels': 2}


def targets() -> list[dict]:
    # Main regions coincide with the user's representative locations. Remaining
    # copies are associated regions of the SAME target, not extra objectives.
    diamonds = [rect((389, 235, 461, 273))]
    diamonds += [rect((x - 36, 235, x + 36, 273)) for x in [330, 525, 625, 725, 825, 923]]
    diamonds += [rect((x - 36, 975, x + 36, 1009)) for x in [324, 426, 525, 625, 725, 825, 923]]
    for x in [256, 992]:
        diamonds += [rect((x - 18, y - 28, x + 18, y + 28)) for y in [327, 424, 522, 620, 718, 818, 918]]
    diamonds += [rect(box) for box in [(241, 240, 281, 280), (968, 240, 1007, 280),
                                        (239, 968, 280, 1008), (968, 968, 1007, 1008)]]

    pearls = [pearl(201, 483, (180, 179, 221, 1063))]
    for x, y in [(202, 200), (273, 200), (343, 200), (413, 200), (483, 200), (553, 200),
                 (624, 200), (694, 200), (764, 200), (835, 200), (905, 200), (976, 200), (1047, 200)]:
        pearls.append(pearl(x, y, (180, 179, 1064, 221)))
    for x in [198, 268, 338, 408, 479, 549, 620, 691, 761, 832, 903, 974, 1046]:
        pearls.append(pearl(x, 1044, (180, 1027, 1064, 1063)))
    for y in [273, 343, 413, 483, 553, 623, 693, 763, 833, 903, 974]:
        x = 202 - round((y - 200) * 4 / 844)
        if (x, y) != (201, 483):
            pearls.append(pearl(x, y, (180, 179, 221, 1063)))
        pearls.append(pearl(1047, y, (1028, 179, 1065, 1063)))
    # Alternating half-pearls belong to the same band. Clip their interior masks
    # at the band edges so the adjacent small beads cannot change or be hit.
    for index in range(12):
        top_x = round(238 + index * 70.3)
        bottom_x = round(233 + index * 70.6)
        for y in [181, 219]:
            pearls.append(pearl(top_x, y, (180, 180, 1064, 221)))
        for y in [1027, 1062]:
            pearls.append(pearl(bottom_x, y, (180, 1027, 1064, 1063)))
        side_y = round(238 + index * 70)
        for x in [181, 219]:
            pearls.append(pearl(x, side_y, (180, 179, 221, 1063)))
        for x in [1029, 1064]:
            pearls.append(pearl(x, side_y, (1028, 179, 1065, 1063)))

    leaves = [rect(box) for box in [(379, 376, 872, 410), (379, 410, 413, 836),
                                    (838, 410, 872, 836), (379, 836, 872, 870)]]

    flowers = [rect((456, 325, 515, 363), 2)]
    flowers += [rect((x - 30, 325, x + 30, 363), 2) for x in [625, 765]]
    flowers += [rect(box, 2) for box in [(330, 329, 371, 366), (877, 329, 920, 366),
                                        (330, 880, 371, 920), (877, 880, 920, 920)]]
    flowers += [rect((x - 30, 881, x + 30, 919), 2) for x in [483, 625, 767]]
    for x in [346, 902]:
        flowers += [rect((x - 18, y - 30, x + 18, y + 30), 2) for y in [482, 619, 758]]
    for x in [414, 555, 695, 835]:
        flowers += [rect((x - 18, y, x + 18, y + 12), 2) for y in [325, 353, 883, 909]]
    for y in [413, 552, 691, 830]:
        flowers += [rect((x, y - 18, x + 12, y + 18), 2) for x in [329, 355, 884, 909]]

    return [
        {'id': 'diamond-inlay', 'pieces': diamonds,
         'hint': '比较红色菱形边框里的蓝绿色纹样。',
         'detailHint': '看上方红色菱形内：A 的几何形较规整，B 的花瓣更细碎；四边同类纹样任意一处均可点击，只计一次。'},
        {'id': 'orange-pearl', 'pieces': pearls,
         'hint': '沿橙色大圆珠，观察圆珠内部的花纹。',
         'detailHint': '看左侧橙色圆珠：A 的放射花纹较简单，B 增加了绿色和橙色细节；四边同类圆珠任意一处均可点击，只计一次。'},
        {'id': 'pale-leaf-border', 'pieces': leaves,
         'hint': '比较中央方框周围的浅绿色花叶边框。',
         'detailHint': '看中央方框上方：A 的浅绿色叶片较大、简洁，B 的叶脉和小花瓣更细密；四边任意一段均可点击，只计一次。'},
        {'id': 'red-ground-flower', 'pieces': flowers,
         'hint': '留意红色底上的八角花纹。',
         'detailHint': '看上方偏左的八角花纹：A 偏几何星形，B 更像层叠小花；四边同类花纹任意一处均可点击，只计一次。'},
    ]


def normalized(box: list[int], size: tuple[int, int]) -> dict:
    x, y, right, bottom = box
    return {'x': x / size[0], 'y': y / size[1],
            'width': (right - x) / size[0], 'height': (bottom - y) / size[1]}


def piece_mask(piece: dict) -> Image.Image:
    x, y, right, bottom = piece['box']
    width, height = right - x, bottom - y
    values = bytearray(width * height)
    for yy in range(y, bottom):
        for xx in range(x, right):
            if piece['shape'] == 'circle-interior':
                cx, cy = piece['center']
                distance = piece['radiusPixels'] - hypot(xx - cx, yy - cy)
            else:
                distance = min(xx - x, yy - y, right - 1 - xx, bottom - 1 - yy)
            weight = max(0, min(1, distance / piece['inwardFeatherPixels']))
            values[(yy - y) * width + xx - x] = round(255 * weight * weight * (3 - 2 * weight))
    return Image.frombytes('L', (width, height), bytes(values))


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--delivery', type=Path, help='Folder containing the original 连珠与几何A/B.png files; omitted to rebuild from archives')
    delivery = parser.parse_args().delivery
    archive = ROOT / 'art-source/levels' / LEVEL_ID / 'v001'
    runtime = ROOT / 'public/assets/levels' / LEVEL_ID
    archive.mkdir(parents=True, exist_ok=True)
    runtime.mkdir(parents=True, exist_ok=True)
    originals = []
    for side in ['A', 'B']:
        filename = f'连珠与几何{side}.png'
        destination = archive / filename
        if delivery:
            source = delivery / filename
            if destination.exists() and source.read_bytes() != destination.read_bytes():
                raise RuntimeError('原稿已存在且内容不同；请另建版本，不能覆盖原稿。')
            if not destination.exists():
                copy2(source, destination)
        digest = sha256(destination.read_bytes()).hexdigest()
        originals.append({'filename': filename, 'path': destination.relative_to(ROOT).as_posix(), 'sha256': digest})
    reference, raw_edit = [Image.open(archive / item['filename']).convert('RGB') for item in originals]
    if reference.size != (1254, 1254) or raw_edit.size != reference.size:
        raise RuntimeError('原稿应为同尺寸1254×1254；更换尺寸须复核所有标注。')
    specs = targets()
    composite = reference.copy()
    union = Image.new('L', reference.size)
    total_mask = Image.new('L', reference.size)
    definitions, records = [], []
    for target in specs:
        mask = Image.new('L', reference.size)
        for piece in target['pieces']:
            box = piece['box']
            if not (0 <= box[0] < box[2] <= reference.width and 0 <= box[1] < box[3] <= reference.height):
                raise RuntimeError(f"目标越界：{target['id']}: {box}")
            local = Image.new('L', reference.size)
            local.paste(piece_mask(piece), box[:2])
            mask = ImageChops.lighter(mask, local)
            union.paste(255, box)
        composite.paste(raw_edit, (0, 0), mask)
        total_mask = ImageChops.lighter(total_mask, mask)
        regions = [normalized(piece['box'], reference.size) for piece in target['pieces']]
        definitions.append({'id': target['id'], 'region': regions[0], 'additionalRegions': regions[1:],
                            'hint': target['hint'], 'detailHint': target['detailHint']})
        records.append({'id': target['id'], 'pieceCount': len(target['pieces']), 'pieces': target['pieces']})
    delta = ImageChops.difference(reference, composite)
    outside = Image.composite(Image.new('RGB', reference.size), delta, union)
    if outside.getbbox() is not None:
        raise RuntimeError('确认区域之外出现变化。')
    for target, record in zip(specs, records):
        # Catch accidentally empty crops: every accepted copy must contain an
        # actual visible pixel change, rather than giving credit for a dummy box.
        for piece in target['pieces']:
            if delta.crop(piece['box']).getbbox() is None:
                raise RuntimeError(f"目标没有实际变化：{target['id']}: {piece['box']}")
        record['everyPieceContainsChangedPixels'] = True
    for side, image in [('a', reference), ('b', composite)]:
        image.save(runtime / f'{LEVEL_ID}-{side}-v001.png', optimize=True)
    total_mask.save(archive / 'difference-mask.png', optimize=True)
    level = {'schemaVersion': 1, 'id': LEVEL_ID, 'themeId': 'patterns', 'gameType': 'spot-difference',
             'title': '联珠与几何：寻找四类变化', 'subtitle': '纹样与色彩 · AI 教学示意',
             'objective': '比较菱形嵌饰、圆珠、花叶与八角花纹，寻找四类变化；同类纹样点击任意一处，只计一次。',
             'difficulty': '细察', 'estimatedMinutes': 5, 'thumbnailAssetId': f'{LEVEL_ID}-a',
             'baseAssetId': f'{LEVEL_ID}-a', 'editedAssetId': f'{LEVEL_ID}-b',
             'teachingNote': '开发者提供的 AI 教学示意，用于比较重复纹样的形状与细节；不是原壁画照片或历史原貌复原。',
             'source': {'title': '敦煌研究院文化资料（延伸阅读）', 'url': 'https://www.dha.ac.cn/',
                        'note': '四类观察目标来自开发者提供的两张图与差异说明；延伸资料不作为本图具体洞窟、年代或历史配色的认定依据。'},
             'differences': definitions}
    write_json(ROOT / f'src/content/levels/{LEVEL_ID}.json', level)
    catalog_path = ROOT / 'src/content/assets.json'
    assets = json.loads(catalog_path.read_text(encoding='utf-8'))
    for side in ['a', 'b']:
        asset = {'id': f'{LEVEL_ID}-{side}', 'path': f'/assets/levels/{LEVEL_ID}/{LEVEL_ID}-{side}-v001.png',
                 'width': reference.width, 'height': reference.height, 'kind': 'level', 'placeholder': False,
                 'version': VERSION, 'sourceNote': '开发者交付的 AI 教学示意，原稿完整归档；不声称对应特定洞窟或历史原貌。'
                 + (' A保持原稿像素与完整比例。' if side == 'a' else ' 以A为底，仅合入四类已确认纹样的原B像素，内向羽化；关联区域之外与A完全一致。')}
        existing = next((i for i, value in enumerate(assets) if value['id'] == asset['id']), None)
        if existing is None:
            assets.append(asset)
        else:
            assets[existing] = asset
    write_json(catalog_path, assets)
    write_json(archive / 'source-notes.json', {
        'version': VERSION, 'receivedOn': '2026-10-30', 'creator': '开发者', 'originals': originals,
        'sourceSize': list(reference.size), 'runtimeSize': list(reference.size),
        'cultureStatus': '用户交付的教学美术；沿用项目AI教学示意标注，不推断具体洞窟、年代或真实历史配色。',
        'displayTitle': '联珠与几何', 'originalFilenamePrefix': '连珠与几何',
        'processing': '原稿逐字节归档。A按原尺寸转换为RGB PNG，像素不变；B不做几何变换，以A为底，仅复制原B中登记的四类纹样局部。矩形使用内向smoothstep羽化3像素（八角花2像素），圆珠仅复制半径14像素内部并在外缘2像素过渡。半圆珠蒙版裁在所在边带内。蒙版不越出点击区域。未裁切画幅、放大、调色、生成或重画内容。',
        'mask': (archive / 'difference-mask.png').relative_to(ROOT).as_posix(), 'targets': records,
        'checks': {'outsideRegionChangedPixels': 0, 'everyAcceptedPieceContainsChangedPixels': True,
                   'referencePixelsMatchOriginalA': ImageChops.difference(reference, Image.open(archive / originals[0]['filename']).convert('RGB')).getbbox() is None},
        'runtime': [{'path': path.relative_to(ROOT).as_posix(), 'sha256': sha256(path.read_bytes()).hexdigest()}
                    for path in sorted(runtime.glob('*-v001.png'))],
    })
    print(f'{LEVEL_ID}: 1254x1254, 4 categories, {[len(t["pieces"]) for t in specs]} regions, outside-region changes: 0')


if __name__ == '__main__':
    main()

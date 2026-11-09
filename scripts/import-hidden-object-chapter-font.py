#!/usr/bin/env python3
"""Build a deterministic local Regular font subset for the reviewed hidden-object chapter labels.

No downloads, font installation, synthetic glyph modification, or edits to the
archived v001 font/title subset. Use --check for a read-only rebuild comparison.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path

import fontTools
from fontTools import subset
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source/shared/fonts/v001/lxgw-wenkai-source.ttf'
SOURCE_NOTES = ROOT / 'art-source/shared/fonts/v001/source-notes.json'
LICENSE = ROOT / 'art-source/shared/fonts/v001/ofl.txt'
ARCHIVE = ROOT / 'art-source/shared/fonts/v003'
OUTPUT = ROOT / 'public/assets/shared/fonts/dunhuang-labels-v002.woff'
POOL = ROOT / 'src/content/hidden-object/pool.json'
LABELS = [group['label'] for group in json.loads(POOL.read_text())['groups']]
CHAPTER_TITLES = sorted({json.loads(path.read_text()).get('chapter', {}).get('title', '')
                         for path in (ROOT / 'src/content/levels').glob('music-hidden-objects*.json')})
READY_TEXT = '本局寻找开始寻找秒共件第章关·：×0123456789'
CHARACTERS = ''.join(sorted(set(''.join(LABELS + CHAPTER_TITLES) + READY_TEXT), key=ord))
FAMILY = 'Dunhuang Labels'


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def preserve_or_write(path: Path, data: bytes) -> None:
    if path.exists():
        if path.read_bytes() != data:
            raise ValueError(f'Existing derivative differs; preserve it and create a new version: {path}')
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('xb') as stream:
        stream.write(data)


def build_bytes() -> bytes:
    font = TTFont(SOURCE, recalcTimestamp=False)
    missing = [character for character in CHARACTERS if ord(character) not in font.getBestCmap()]
    if missing:
        raise ValueError(f'The archived source is missing required glyphs: {missing}')
    if font['OS/2'].usWeightClass != 400:
        raise ValueError('Expected the archived Regular source at weight 400')
    options = subset.Options()
    options.flavor = 'woff'
    options.name_IDs = ['*']
    options.name_legacy = True
    options.name_languages = ['*']
    options.recalc_timestamp = False
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=CHARACTERS)
    subsetter.subset(font)
    names = {
        1: FAMILY, 2: 'Regular', 3: 'DunhuangLabels-Subset-v002',
        4: FAMILY, 6: 'DunhuangLabels-Regular',
        16: FAMILY, 17: 'Regular', 18: FAMILY, 21: FAMILY, 22: 'Regular',
    }
    for name_id, value in names.items():
        font['name'].removeNames(nameID=name_id)
        font['name'].setName(value, name_id, 3, 1, 0x409)
        font['name'].setName(value, name_id, 1, 0, 0)
    font.recalcTimestamp = False
    font.flavor = 'woff'
    output = io.BytesIO()
    font.save(output, reorderTables=True)
    font.close()
    return output.getvalue()


def verify_font(data: bytes) -> dict:
    with TTFont(io.BytesIO(data), recalcTimestamp=False) as font:
        cmap = font.getBestCmap()
        assert all(ord(character) in cmap for character in CHARACTERS), 'Required cmap entry missing'
        assert set(cmap) == {ord(character) for character in CHARACTERS}, 'Unexpected characters in label subset'
        assert font.flavor == 'woff'
        for name_id in (1, 4, 16, 18, 21):
            assert {record.toUnicode() for record in font['name'].names if record.nameID == name_id} == {FAMILY}
        assert font['OS/2'].usWeightClass == 400, 'Regular must not be presented as a real Bold face'
        assert not font['head'].macStyle & 1, 'Regular must not have the Bold flag'
        assert not font['OS/2'].fsSelection & (1 << 5), 'Regular must not have the Bold selection flag'
        assert font['name'].getDebugName(0), 'Original copyright must remain'
        assert font['name'].getDebugName(13), 'Original license must remain'
        assert len(data) < 64 * 1024, 'The small label subset should remain below 64 KiB'
        return {'characters': len(cmap), 'glyphs': font['maxp'].numGlyphs, 'weight': font['OS/2'].usWeightClass}


def main(check_only: bool) -> None:
    source_data = SOURCE.read_bytes()
    license_data = LICENSE.read_bytes()
    old_notes = json.loads(SOURCE_NOTES.read_text())
    assert digest(source_data) == old_notes['originalSha256'], 'v001 original source SHA has changed'
    data = build_bytes()
    # Explicitly exercise deterministic reconstruction, including preserved head timestamps.
    assert data == build_bytes(), 'Two in-memory builds differ'
    info = verify_font(data)
    notes = {
        'family': FAMILY,
        'internalFamilyNames': {'1': FAMILY, '4': FAMILY, '16': FAMILY, '18': FAMILY, '21': FAMILY},
        'postScriptName': 'DunhuangLabels-Regular',
        'originalFamily': old_notes['originalFamily'],
        'originalVersion': old_notes['originalVersion'],
        'projectUrl': old_notes['projectUrl'],
        'sourceReference': SOURCE.relative_to(ROOT).as_posix(),
        'sourceNotesReference': SOURCE_NOTES.relative_to(ROOT).as_posix(),
        'originalSha256': digest(source_data),
        'license': old_notes['license'],
        'licenseReference': LICENSE.relative_to(ROOT).as_posix(),
        'licenseSha256': digest(license_data),
        'labelSourceReference': POOL.relative_to(ROOT).as_posix(),
        'labelSourceScope': 'groups.label only; no pixel or game-rule changes',
        'targetGroupCount': len(LABELS),
        'targetLabels': LABELS,
        'chapterTitles': CHAPTER_TITLES,
        'readyText': READY_TEXT,
        'subsetCharacters': CHARACTERS,
        'subsetCodepoints': [f'U+{ord(character):04X}' for character in CHARACTERS],
        'output': OUTPUT.relative_to(ROOT).as_posix(),
        'outputBytes': len(data),
        'outputSha256': digest(data),
        'fontToolsVersion': fontTools.__version__,
        'weight': 400,
        'style': 'Regular',
        'boldPolicy': '源字体仅Regular；本文件不含真实Bold字形。界面700加粗须明确通过CSS font-synthesis: weight完成。',
        'processing': '仅从v001本地母字体提取所列字符并重命名内部字族，WOFF/zlib编码；保留原版权与OFL记录，固定原head时间戳，不修改轮廓、不下载或安装系统字体。',
        'checks': info,
    }
    notes_data = (json.dumps(notes, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    readme = f'''# 找物章节目标字体 v003

运行字族仍为`Dunhuang Labels`。本轮从v001已归档霞鹜文楷Regular原TTF中提取{len(CHARACTERS)}个唯一字符，覆盖34个目标组名称、三章标题、准备页固定文案、乘号与0至9数字。具体字集和输入名称见`source-notes.json`及`subset-characters.txt`。

新运行文件为`public/assets/shared/fonts/dunhuang-labels-v002.woff`；v001母字体、OFL、首页五字字体及v002归档/运行dunhuang-labels-v001.woff全部保留。没有下载、安装系统字体、改动原字形或制作新的Bold字形。

字体真实为Regular（weight400）；界面700仍通过已声明的CSS `font-synthesis: weight`合成。内部字族名称与旧版一致，子集唯一标识更新到v002，保留原版权和许可。

重建：`python3 scripts/import-hidden-object-chapter-font.py`；只读验证：加`--check`。脚本在内存重建两次并逐字节比较，核对cmap完整且仅含所列字符、真实Regular标记、字族、版权许可、固定head时间戳及输出大小。任何已存在且不同的新归档/派生文件均拒绝覆盖，须另建版本。
'''.encode('utf-8')
    files = {
        OUTPUT: data,
        ARCHIVE / 'source-notes.json': notes_data,
        ARCHIVE / 'subset-characters.txt': (CHARACTERS + '\n').encode('utf-8'),
        ARCHIVE / 'ofl.txt': license_data,
        ARCHIVE / 'README.md': readme,
    }
    for path, content in files.items():
        if check_only:
            assert path.read_bytes() == content, f'Existing output differs from deterministic rebuild: {path}'
        else:
            preserve_or_write(path, content)
    print(json.dumps({'family': FAMILY, 'bytes': len(data), 'sha256': digest(data), 'cmapCharacters': info['characters'], 'weight': info['weight'], 'deterministic': True}, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Rebuild in memory and compare every output without writing')
    main(parser.parse_args().check)

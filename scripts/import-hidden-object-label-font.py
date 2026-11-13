#!/usr/bin/env python3
"""Build a deterministic local Regular font subset for hidden-object labels.

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
ARCHIVE = ROOT / 'art-source/shared/fonts/v002'
OUTPUT = ROOT / 'public/assets/shared/fonts/dunhuang-labels-v001.woff'
CHARACTERS = '琵琶鼓铃铛×0123456789'
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
        1: FAMILY, 2: 'Regular', 3: 'DunhuangLabels-Subset-v001',
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
    readme = '''# 找物标签手写字体

运行字族为`Dunhuang Labels`，从v001已归档的霞鹜文楷Regular母字体提取16个字符：`琵琶鼓铃铛×0123456789`。原字体、原许可与首页五字WOFF保留。来源引用、原SHA、字集、输出SHA与具体变换见`source-notes.json`。

本文件是真实Regular（weight 400），没有制作或声称提供独立Bold字形。准备页的700加粗由界面显式启用`font-synthesis: weight`处理。PostScript名称按字体格式要求使用不含空格的`DunhuangLabels-Regular`，字族与显示名称为`Dunhuang Labels`。

重建：`python3 scripts/import-hidden-object-label-font.py`。只读验证：`python3 scripts/import-hidden-object-label-font.py --check`。脚本在内存重建两次并逐字节比较，验证cmap、字族、Regular标记、版权许可及输出大小；不覆盖内容不同的既有派生文件。
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

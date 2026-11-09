"""Tile the approved entrance scrollwork over the actual door surfaces."""

import json
import runpy
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parent.parent
PRIOR = 'scripts/prepare-mogao-exhibit-entrance-v001.py'
TOOLS = runpy.run_path(str(ROOT / PRIOR))
REVISION = 'mogao-exhibit/v007'
SCALE = TOOLS['SCALE']


def main():
    tile = TOOLS['sign'](1.52, .88)
    motif = TOOLS['gold_scroll']()
    motif.thumbnail((round(1.13 * SCALE), round(.35 * SCALE)), Image.Resampling.LANCZOS)
    motif.putalpha(motif.getchannel('A').point(lambda value: round(value * .57)))
    for row, y in enumerate((tile.height // 4, tile.height * 3 // 4)):
        ink = ImageOps.mirror(motif) if row else motif
        center = tile.width // 2 if row == 0 else 0
        for x in (center - tile.width, center, center + tile.width):
            tile.alpha_composite(ink, (x - ink.width // 2, y - ink.height // 2))
    TOOLS['publish'](tile, REVISION, 'entrance-scrollwork')
    (ROOT / 'art-source/world' / REVISION / 'source-manifest.json').write_text(json.dumps({
        'source': PRIOR,
        'runtime': f'{REVISION}/entrance-scrollwork.webp',
        'tileMeters': [1.52, .88],
        'surfaces': ['A 厅外门楣', 'B 厅临门顶板底面'],
    }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()

"""Derive the small illustrations used by the music gallery reward reader."""

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'public/assets/world'
PAPER = ASSETS / 'music-gallery-paper/v001'


def encode(source: Path, name: str, longest_edge: int) -> int:
    output = PAPER / f'{name}.webp'
    with Image.open(source) as image:
        image.thumbnail((longest_edge, longest_edge), Image.Resampling.LANCZOS)
        image.save(output, quality=72, method=6)
    return output.stat().st_size


def main():
    chapter_config = ROOT / 'src/content/world/flying-history-art-v001.json'
    chapters = json.loads(chapter_config.read_text(encoding='utf-8'))
    PAPER.mkdir(parents=True, exist_ok=True)

    total = 0
    for chapter in chapters:
        source = ASSETS / chapter['path']
        total += encode(source, source.stem, 240)
    for source in sorted((ASSETS / 'music-instrument-display/v001/images').glob('*.webp')):
        total += encode(source, f'instrument-{source.stem}', 240)
    for source in sorted((ASSETS / 'music-guide/v001').glob('*.webp')):
        total += encode(source, f'outfit-{source.stem}', 240)

    panorama = ROOT / 'art-source/world/music-three-wall-mural/v001/panorama-master.png'
    total += encode(panorama, 'dance-panorama', 920)
    print(f'Music gallery illustrations: {total:,} bytes')


if __name__ == '__main__':
    main()

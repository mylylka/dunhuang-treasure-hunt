"""Derive directly painted entrance signs and the relocated Fire House title."""

import json
import runpy
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps


ROOT = Path(__file__).resolve().parent.parent
OLD = runpy.run_path(str(ROOT / 'scripts/prepare-mogao-hall-a-v001.py'))
FONT = OLD['HEITI']
SCALE = 560


def sign(width, height):
    return Image.new('RGBA', (round(width * SCALE), round(height * SCALE)))


def gold_scroll():
    raw = Image.new('RGBA', (765, 445))
    OLD['scrollwork'](ImageDraw.Draw(raw), (25, 340), 8, 1)
    alpha = raw.crop(raw.getbbox()).getchannel('A')
    ornament = Image.new('RGBA', alpha.size, '#ab804d')
    ornament.putalpha(alpha.point(lambda value: round(value * .87)))
    return ornament


def entrance(name):
    image = sign(5.52, .70)
    label = OLD['ink'](name, FONT, round(.53 * SCALE), '#e5c68c')
    image.alpha_composite(label, ((image.width - label.width) // 2, (image.height - label.height) // 2))
    ornament = gold_scroll()
    ornament.thumbnail((round(1.55 * SCALE), round(.49 * SCALE)), Image.Resampling.LANCZOS)
    inset = round(.26 * SCALE)
    y = (image.height - ornament.height) // 2
    image.alpha_composite(ornament, (inset, y))
    image.alpha_composite(ImageOps.mirror(ornament), (image.width - inset - ornament.width, y))
    return image


def jamb():
    image = sign(.25, 1.37)
    ornament = gold_scroll().transpose(Image.Transpose.ROTATE_90)
    ornament.thumbnail((image.width, round(.65 * SCALE)), Image.Resampling.LANCZOS)
    x = (image.width - ornament.width) // 2
    y = (image.height - 2 * ornament.height - 14) // 2
    image.alpha_composite(ornament, (x, y))
    image.alpha_composite(ornament.rotate(180), (x, y + ornament.height + 14))
    return image


def fire_house():
    image = sign(1.80, .80)
    title = OLD['ink']('火宅喻', FONT, round(.45 * SCALE), '#e8d2a2')
    source = OLD['ink']('莫高窟第61窟 · 五代', FONT, round(.17 * SCALE), '#d1b98e')
    top = round(.065 * SCALE)
    image.alpha_composite(title, (0, top))
    image.alpha_composite(source, (0, top + title.height + round(.08 * SCALE)))
    assert image.getbbox()[3] < image.height
    return image


def publish(image, revision, name):
    source = ROOT / 'art-source/world' / revision
    assets = ROOT / 'public/assets/world' / revision
    source.mkdir(parents=True, exist_ok=True)
    assets.mkdir(parents=True, exist_ok=True)
    image.save(source / f'{name}.png', optimize=True)
    image.thumbnail((1120, 1120), Image.Resampling.LANCZOS)
    image.save(assets / f'{name}.webp', lossless=True, method=6)


if __name__ == '__main__':
    entrances, fire_house_revision = 'mogao-exhibit/v006', 'mogao-hall-a/v002'
    publish(entrance('绘世厅'), entrances, 'entrance-hall-a')
    publish(entrance('佛法厅'), entrances, 'entrance-hall-b')
    publish(jamb(), entrances, 'entrance-jamb')
    publish(fire_house(), fire_house_revision, 'title-burning-house')
    for revision, entries in (
        (entrances, {'entrance-hall-a': '绘世厅', 'entrance-hall-b': '佛法厅', 'entrance-jamb': '暗金卷草'}),
        (fire_house_revision, {'title-burning-house': '火宅喻与出处两行左齐'}),
    ):
        manifest = {'typeface': OLD['heiti'](FONT, 32).getname()[0], 'source': 'scripts/prepare-mogao-hall-a-v001.py', 'signs': entries}
        (ROOT / 'art-source/world' / revision / 'source-manifest.json').write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

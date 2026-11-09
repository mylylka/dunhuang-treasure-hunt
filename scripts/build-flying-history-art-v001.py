"""Compose supplied flying-apsara photographs into nine 4:3 wall panels."""
from argparse import ArgumentParser
from dataclasses import dataclass
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
import shutil

import numpy as np
from PIL import Image, ImageChops, ImageCms, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source/world/flying-history/v001/art'
RUNTIME = ROOT / 'public/assets/world/flying-history/v001/art'
EVIDENCE = ROOT / 'work/world/flying-history-v001/art'
METADATA = ROOT / 'src/content/world/flying-history-art-v001.json'
FONT = ROOT / 'art-source/shared/fonts/v001/lxgw-wenkai-source.ttf'
SIZE = (1440, 1080)
FULL = (54, 129, 1332, 862)
SPEC = '飞天壁画设计.txt'


@dataclass(frozen=True)
class Exhibit:
    cave: str
    period: str
    filename: str
    # Allowed image slot as x, y, width, height. The source is contained.
    slot: tuple[int, int, int, int] = FULL
    # Only the printed paper surrounding the Chapter 6 scan is cropped.
    crop: tuple[int, int, int, int] | None = None


CHAPTERS = [
    ('北凉：飞天初现', [Exhibit('275', '北凉', '275飞天-北凉.jpg')]),
    ('西魏：中西交融', [Exhibit('249', '西魏', '249窟中西双飞天-西魏.jpg')]),
    ('北周：造型探索', [Exhibit('428', '北周', '428窟飞天-北周.png')]),
    ('隋代：姿态丰富', [Exhibit('206', '隋代', '206窟飞天-隋朝.jpg')]),
    ('初唐至盛唐：自由飞翔', [
        Exhibit('321', '初唐', '321窟双飞天初唐.jpg', (51, 131, 579, 864)),
        Exhibit('320', '盛唐', '320窟四飞天盛唐.webp', (651, 127, 734, 372)),
        Exhibit('172', '盛唐', '172窟龛顶飞天-盛唐.PNG', (651, 572, 734, 426)),
    ]),
    ('中唐至晚唐：风格转变', [
        Exhibit('158', '中唐', '158窟飞天中唐.jpg', (50, 130, 1340, 863), (12, 18, 2160, 1324)),
    ]),
    ('五代与宋：唐风延续', [
        Exhibit('61', '五代', '61窟散花飞天-五代.PNG', (49, 136, 568, 864)),
        Exhibit('76', '宋代', '76窟捧宝珠双飞天-宋.jpg', (640, 136, 749, 864)),
    ]),
    ('西夏与回鹘：多元延续', [
        Exhibit('327', '西夏', '327窟-飞天-西夏.jpg', (49, 135, 745, 865)),
        Exhibit('97', '回鹘重绘', '97窟飞天-西夏.jpg', (816, 132, 574, 868)),
    ]),
    ('元代：飞天余韵', [
        Exhibit('3', '元代', '3窟飞天-元代.png', (51, 130, 1025, 403)),
        Exhibit('3', '元代', '3窟飞天2-元代.png', (363, 596, 1025, 403)),
    ]),
]


def archive(source: Path | None) -> None:
    names = [item.filename for _, items in CHAPTERS for item in items] + [SPEC]
    for name in names:
        destination = SOURCE / name
        if source is None:
            if not destination.is_file():
                raise FileNotFoundError(destination)
            continue
        supplied = source / name
        if destination.exists():
            if supplied.read_bytes() != destination.read_bytes():
                raise ValueError(f'Archived original differs: {destination}')
        else:
            shutil.copy2(supplied, destination)


def plaster(seed: int) -> Image.Image:
    random = np.random.default_rng(seed)
    width, height = SIZE
    values = np.zeros((height, width), dtype=np.float32)
    for columns, rows, strength in [(5, 4, 13), (17, 13, 9), (62, 47, 6), (245, 184, 4)]:
        low = Image.fromarray(random.integers(0, 256, (rows, columns), dtype=np.uint8))
        variation = np.asarray(low.resize(SIZE, Image.Resampling.BICUBIC), dtype=np.float32) / 255 - .5
        values += variation * strength
    values += random.normal(0, 1.4, values.shape)
    colors = np.clip(np.array([235, 219, 192])[None, None, :] + values[:, :, None], 0, 255).astype(np.uint8)
    wall = Image.fromarray(colors)
    draw = ImageDraw.Draw(wall, 'RGBA')
    for _ in range(104):
        x, y = (int(random.integers(8, extent - 8)) for extent in SIZE)
        size = int(random.choice([1, 1, 2, 3]))
        draw.ellipse((x, y, x + size * 2, y + size), fill=(111, 78, 47, int(random.integers(12, 40))))
    for _ in range(13):
        x, y = (int(random.integers(30, extent - 105)) for extent in SIZE)
        direction = int(random.choice([-1, 1]))
        points = [(x, y)]
        for _ in range(int(random.integers(2, 6))):
            x += direction * int(random.integers(5, 25))
            y += int(random.integers(-8, 12))
            points.append((x, y))
        draw.line(points, fill=(120, 89, 57, int(random.integers(12, 30))), width=1)
    return wall


def chip_mask(width: int, height: int, random: np.random.Generator, depth: int = 15) -> Image.Image:
    """Uneven loss at the extreme edges only. The photograph interior stays intact."""
    def edge(length: int) -> list[tuple[int, int]]:
        points = [(depth, int(random.integers(1, depth // 2 + 1)))]
        distance = depth
        while distance < length - depth - 13:
            distance = min(length - depth, distance + int(random.integers(17, 58)))
            bite = int(random.integers(1, depth))
            points.append((distance, bite))
        points.append((length - depth, int(random.integers(1, depth // 2 + 1))))
        return points

    polygon = edge(width)
    polygon += [(width - 1 - bite, y) for y, bite in edge(height)]
    polygon += [(width - 1 - x, height - 1 - bite) for x, bite in edge(width)]
    polygon += [(bite, height - 1 - y) for y, bite in edge(height)]
    mask = Image.new('L', (width, height))
    ImageDraw.Draw(mask).polygon(polygon, fill=255)
    return mask.filter(ImageFilter.GaussianBlur(.53))


def place_mural(wall: Image.Image, photo: Image.Image, x: int, y: int, random: np.random.Generator) -> None:
    width, height = photo.size
    inset = 11
    damaged = chip_mask(width, height, random)
    rim_mask = Image.new('L', (width + 2 * inset, height + 2 * inset))
    rim_mask.paste(damaged, (inset, inset))
    lip = ImageChops.subtract(rim_mask.filter(ImageFilter.MaxFilter(17)), rim_mask)
    shade = ImageChops.subtract(rim_mask.filter(ImageFilter.MaxFilter(5)), rim_mask)
    wall.paste((248, 230, 202), (x - inset, y - inset, x + width + inset, y + height + inset), lip.point(lambda a: a * .68))
    wall.paste((122, 84, 56), (x - inset, y - inset, x + width + inset, y + height + inset), shade.point(lambda a: a * .31))
    wall.paste(photo, (x, y), damaged)


def ink(text: str, font: ImageFont.FreeTypeFont, random: np.random.Generator, weathering: float) -> Image.Image:
    left, top, right, bottom = font.getbbox(text, stroke_width=1)
    mask = Image.new('L', (right - left + 4, bottom - top + 4))
    ImageDraw.Draw(mask).text((2 - left, 2 - top), text, font=font, fill=255, stroke_width=1)
    alpha = np.asarray(mask, dtype=np.float32)
    aged = random.random(alpha.shape) < weathering
    alpha[aged] *= .60
    return Image.fromarray(np.round(alpha).astype(np.uint8))


def photograph(item: Exhibit) -> tuple[Image.Image, tuple[int, int], str | None]:
    with Image.open(SOURCE / item.filename) as original:
        photo = ImageOps.exif_transpose(original)
        size = photo.size
        profile = photo.info.get('icc_profile')
        photo = photo.convert('RGB')
    profile_name = None
    if profile:
        source_profile = ImageCms.ImageCmsProfile(BytesIO(profile))
        profile_name = ImageCms.getProfileName(source_profile).strip()
        photo = ImageCms.profileToProfile(photo, source_profile, ImageCms.createProfile('sRGB'), outputMode='RGB')
    if item.crop:
        photo = photo.crop(item.crop)
    return photo, size, profile_name


def place_label(wall: Image.Image, title: str, cave: str, center: int, top: int,
                font: ImageFont.FreeTypeFont, random: np.random.Generator) -> dict:
    label = ink(title, font, random, .014)
    width, height = label.width + 36, label.height + 18
    x = min(max(center - width // 2, 33), SIZE[0] - width - 33)
    y = min(top, SIZE[1] - height - 13)
    plate = chip_mask(width, height, random, 6).point(lambda a: a * .88)
    wall.paste((249, 233, 206), (x, y, x + width, y + height), plate)
    wall.paste((72, 47, 33), (x + 18, y + 9, x + 18 + label.width, y + 9 + label.height), label)
    return {
        'cave': cave, 'x': round(x / SIZE[0], 6), 'y': round(y / SIZE[1], 6),
        'w': round(width / SIZE[0], 6), 'h': round(height / SIZE[1], 6),
    }


def build() -> None:
    panels = []
    sheet = Image.new('RGB', (1512, 1152), '#d0b898')
    title_font = ImageFont.truetype(str(FONT), 77)
    label_font = ImageFont.truetype(str(FONT), 45)
    records = []
    for chapter, (title, exhibits) in enumerate(CHAPTERS, 1):
        random = np.random.default_rng(7080 + chapter)
        wall = plaster(6601)
        heading = ink(title, title_font, random, .038)
        wall.paste((76, 51, 36), (54, 32, 54 + heading.width, 32 + heading.height), heading)
        ImageDraw.Draw(wall, 'RGBA').polygon([(55, 113), (389, 112), (363, 115), (56, 117)], fill=(162, 103, 67, 117))
        labels = []
        for item in exhibits:
            photo, dimensions, profile = photograph(item)
            left, top, width, height = item.slot
            placed = ImageOps.contain(photo, (width, height), Image.Resampling.LANCZOS)
            x = left + (width - placed.width) // 2
            y = top + (height - placed.height) // 2
            place_mural(wall, placed, x, y, random)
            labels.append(place_label(wall, f'莫高窟第{item.cave}窟 · {item.period}', item.cave,
                                      x + placed.width // 2, y + placed.height + 10, label_font, random))
            records.append({
                'chapter': chapter, 'cave': item.cave, 'period': item.period, 'filename': item.filename,
                'sha256': sha256((SOURCE / item.filename).read_bytes()).hexdigest(),
                'sourceSize': dimensions, 'sourceProfile': profile, 'crop': item.crop,
                'placedRectPx': [x, y, placed.width, placed.height],
            })
        name = f'chapter-{chapter:02d}.webp'
        wall.save(RUNTIME / name, 'WEBP', quality=88, method=6)
        panels.append({'title': title, 'path': f'flying-history/v001/art/{name}', 'labels': labels})
        col, row = (chapter - 1) % 3, (chapter - 1) // 3
        sheet.paste(wall.resize((480, 360), Image.Resampling.LANCZOS), (12 + col * 504, 12 + row * 384))
    METADATA.write_text(json.dumps(panels, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (SOURCE / 'manifest.json').write_text(json.dumps({
        'design': {'filename': SPEC, 'sha256': sha256((SOURCE / SPEC).read_bytes()).hexdigest()},
        'outputSize': SIZE, 'records': records,
        'outputs': [{
            'path': panel['path'], 'bytes': (RUNTIME / Path(panel['path']).name).stat().st_size,
            'sha256': sha256((RUNTIME / Path(panel['path']).name).read_bytes()).hexdigest(),
        } for panel in panels],
    }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    sheet.save(EVIDENCE / 'chapter-contact.jpg', quality=92)


if __name__ == '__main__':
    parser = ArgumentParser()
    parser.add_argument('--source', type=Path, help='Folder containing the 14 supplied originals and design notes.')
    options = parser.parse_args()
    for directory in (SOURCE, RUNTIME, EVIDENCE):
        directory.mkdir(parents=True, exist_ok=True)
    archive(options.source)
    build()

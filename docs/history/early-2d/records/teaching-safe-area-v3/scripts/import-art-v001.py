"""Preserve user originals and derive runtime PNGs without generating artwork.

Run manually with an existing Pillow installation. Normal development/building
does not require Python. Archived sources are immutable; a changed delivery must
use a new version rather than replace v001.
"""
from hashlib import sha256
import json
from pathlib import Path
from shutil import copy2

from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DELIVERY = Path('/Users/liujing/Downloads/游戏第一版本图样')
VERSION = 'user-art-v001'
MAPPING = {
    'bg-landscape': ('U01.png', 'shared/bg-landscape', (1600, 900)),
    'bg-portrait': ('U02.png', 'shared/bg-portrait', (900, 1600)),
    'panel': ('U03.png', 'shared/panel', (1024, 1024)),
    'button-primary': ('U04.png', 'shared/button-primary', (1024, 256)),
    'button-secondary': ('U05.png', 'shared/button-secondary', (1024, 256)),
    'icon-back': ('U06-back.png', 'shared/icon-back', (256, 256)),
    'icon-hint': ('U06-hint.png', 'shared/icon-hint', (256, 256)),
    'icon-restart': ('U06-retry.png', 'shared/icon-restart', (256, 256)),
    'icon-locked': ('U06-lock.png', 'shared/icon-locked', (256, 256)),
    'icon-completed': ('U06-complete.png', 'shared/icon-completed', (256, 256)),
    'cover-patterns': ('T01.png', 'themes/patterns', (1200, 800)),
    'cover-music': ('T02.png', 'themes/music', (1200, 800)),
    'cover-stories': ('T03.png', 'themes/stories', (1200, 800)),
    'patterns-intro-a': ('L01第一关 A 图.png', 'levels/patterns-intro', (1200, 800)),
    'patterns-intro-b': ('L02.png', 'levels/patterns-intro', (1200, 800)),
}


def archive(asset_id, source, folder):
    target = ROOT / 'art-source' / folder / 'v001' / f'{asset_id}-source.png'
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        if sha256(target.read_bytes()).digest() != sha256(source.read_bytes()).digest():
            raise RuntimeError(f'原稿版本已存在且内容不同，需创建下一版本：{target}')
    else:
        copy2(source, target)
    return target


def normalize_button(image):
    image = image.convert('RGBA')
    # Trim only almost invisible outer padding, preserve the visible ornament.
    bounds = image.getchannel('A').point(lambda alpha: 255 if alpha >= 16 else 0).getbbox()
    if bounds is None:
        raise RuntimeError('按钮没有可见内容')
    bounds = (max(0, bounds[0] - 8), max(0, bounds[1] - 8),
              min(image.width, bounds[2] + 8), min(image.height, bounds[3] + 8))
    fitted = ImageOps.contain(image.crop(bounds), (1024, 256), Image.Resampling.LANCZOS)
    result = Image.new('RGBA', (1024, 256))
    result.alpha_composite(fitted, ((1024 - fitted.width) // 2, (256 - fitted.height) // 2))
    return result, list(bounds)


def edge_mask(size, feather=10):
    """Feather wholly inside the configured rectangle; outside stays identical to A."""
    width, height = size
    feather = min(feather, width // 5, height // 5)
    mask = Image.new('L', size)
    draw = ImageDraw.Draw(mask)
    for inset in range(feather):
        draw.rounded_rectangle((inset, inset, width - 1 - inset, height - 1 - inset),
                               radius=max(0, feather - inset),
                               fill=round(255 * inset / max(1, feather - 1)))
    return mask


def target_mask(difference, box):
    """Use object masks for small edits; a rectangle alone is only a hit target."""
    size = (box[2] - box[0], box[3] - box[1])
    if difference['id'] == 'buddha-composition':
        return edge_mask(size)
    mask = Image.new('L', size)
    draw = ImageDraw.Draw(mask)
    scale = 1200 / 1536
    def point(x, y):
        return (round(x * scale) - box[0], round(y * scale) - box[1])
    if difference['id'] == 'bead-colors':
        # Only the six visibly turquoise bead centres, not the adjacent Buddhas.
        for x, y in [(202, 992), (224, 970), (250, 946), (314, 885), (334, 868), (351, 852)]:
            cx, cy = point(x, y)
            radius = 8 * scale
            draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=255)
        return mask.filter(ImageFilter.GaussianBlur(0.6))
    polygons = {
        'harp-added': [(538, 90), (608, 65), (628, 75), (618, 143), (563, 147)],
        'pipa-added': [(875, 478), (931, 441), (972, 424), (994, 424), (971, 460),
                       (956, 474), (952, 502), (929, 530), (898, 530), (879, 509)],
        'leaf-outline': [(1050, 203), (1097, 198), (1147, 199), (1146, 220),
                         (1119, 242), (1098, 251), (1072, 239)],
    }
    draw.polygon([point(x, y) for x, y in polygons[difference['id']]], fill=255)
    return mask.filter(ImageFilter.GaussianBlur(1.6))


def main():
    assets_path = ROOT / 'src/content/assets.json'
    assets = json.loads(assets_path.read_text())
    level = json.loads((ROOT / 'src/content/levels/patterns-intro.json').read_text())
    images, manifest = {}, []
    for asset_id, (filename, folder, size) in MAPPING.items():
        incoming = DELIVERY.parent / filename if asset_id == 'patterns-intro-a' else DELIVERY / filename
        source = ROOT / 'art-source' / folder / 'v001' / f'{asset_id}-source.png'
        if incoming.exists():
            source = archive(asset_id, incoming, folder)
        elif not source.exists():
            raise FileNotFoundError(incoming)
        image = Image.open(source)
        record = {'id': asset_id, 'deliveryName': filename, 'source': str(source.relative_to(ROOT)),
                  'sha256': sha256(source.read_bytes()).hexdigest(), 'sourceSize': list(image.size),
                  'alpha': 'A' in image.getbands()}
        if asset_id.startswith('button-'):
            image, record['trimBox'] = normalize_button(image)
        else:
            image = image.resize(size, Image.Resampling.LANCZOS)
        images[asset_id] = image
        manifest.append(record)

    reference = images['patterns-intro-a'].convert('RGB')
    edited = reference.copy()
    raw_edit = images['patterns-intro-b'].convert('RGB')
    for difference in level['differences']:
        region = difference['region']
        box = (round(region['x'] * reference.width), round(region['y'] * reference.height),
               round((region['x'] + region['width']) * reference.width),
               round((region['y'] + region['height']) * reference.height))
        mask = target_mask(difference, box)
        edited.paste(raw_edit.crop(box), box[:2], mask)
    images['patterns-intro-b'] = edited

    for asset in assets:
        asset_id = asset['id']
        if asset_id not in images:
            continue
        image = images[asset_id]
        section = 'levels/patterns-intro' if asset['kind'] == 'level' else 'themes' if asset['kind'] == 'cover' else 'shared'
        path = f'/assets/{section}/{asset_id}-v001.png'
        target = ROOT / 'public' / path.lstrip('/')
        target.parent.mkdir(parents=True, exist_ok=True)
        image.save(target, optimize=True)
        asset.update(path=path, width=image.width, height=image.height, placeholder=False, version=VERSION,
                     sourceNote='开发者在 ChatGPT 网页端生成并交付的 AI 教学美术；原稿按 v001 保存，不是原壁画照片或历史原貌复原。')
        if asset_id == 'panel':
            asset['slice'] = {'top': 310, 'right': 318, 'bottom': 310, 'left': 318}
        elif asset_id.startswith('button-'):
            asset['slice'] = {'top': 64, 'right': 220, 'bottom': 64, 'left': 220}
        if asset_id == 'patterns-intro-b':
            asset['sourceNote'] += ' 以 L01 为底，仅在五个配置区域用局部蒙版合入 L02，边缘轻微过渡；区域外像素与 A 相同。'
    assets_path.write_text(json.dumps(assets, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'art-source/delivery-v001.json').write_text(json.dumps({
        'version': VERSION, 'date': '2026-10-28', 'assetCount': len(manifest),
        'processing': 'PNG尺寸规范化；按钮按alpha可见范围裁透明留白、等比居中；B以A底在配置区域内用物象蒙版合成L02，右上大像区域内羽化10px，其他物象边缘模糊1.6px，六个圆心边缘0.6px。未生成或重画美术内容。',
        'assets': manifest,
    }, ensure_ascii=False, indent=2) + '\n')
    print(f'已保存 {len(manifest)} 项原稿并导出运行 PNG，更新素材索引。')


if __name__ == '__main__':
    main()

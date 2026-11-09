"""Archive the supplied caisson images and prepare reading-size folio artwork."""

import argparse
from pathlib import Path

from PIL import Image, ImageOps

from asset_intake import AssetIntake, image_size, read_json, write_json

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'art-source/world/first-gallery-folio/v001'
PUBLIC = ROOT / 'public/assets'
OUTPUT = PUBLIC / 'world/first-gallery-folio/v001'

SUPPLIED = {
    'rabbits-full': ('三兔飞天藻井.JPG', 'https://www.dha.ac.cn/info/1425/3569.htm'),
    'rabbits-detail': ('三兔飞天藻井_中心部分.jpg', 'https://www.dha.ac.cn/info/1425/3569.htm'),
    'fruit-209': ('葡萄石榴藻井.JPG', 'https://www1.xinhuanet.com/politics/20261003/621786abc78c4b58be17b23abadccfc1/c.html'),
}

LESSON = 'lessons/patterns'
EXISTING = {
    'flat-ceiling': f'{LESSON}/lesson-user-254-ceiling-v001.png',
    'niche': f'{LESSON}/lesson-254-niche-v001.png',
    'lotus-329': f'{LESSON}/lesson-329-center-v002.png',
    'interior-329': f'{LESSON}/lesson-329-interior-v001.png',
    'beads-401': f'{LESSON}/lesson-401-ceiling-v001.png',
    'camellia-201': f'{LESSON}/lesson-201-ceiling-v001.png',
    'mural': 'world/first-gallery/v001/mural-full.jpg',
    'easel': 'levels/coloring-feitian-lotus/coloring-feitian-lotus-reference-v001.png',
}


def encode_webp(source: Path, destination: Path, limit: int) -> None:
    with Image.open(source) as raw:
        image = ImageOps.exif_transpose(raw).convert('RGB')
        image.thumbnail((limit, limit), Image.Resampling.LANCZOS)
        image.save(destination, 'WEBP', quality=76, method=6)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--import-from', type=Path, help='User-supplied caisson image directory')
    args = parser.parse_args()
    intake = AssetIntake(ROOT)
    with intake.transaction():
        prepare_folio(intake, args.import_from)


def prepare_folio(intake: AssetIntake, attachments: Path | None) -> None:
    notes_path = ARCHIVE / 'manifest.json'
    previous = read_json(notes_path, {})
    results = {row['id']: row for row in previous.get('images', [])}
    inputs = {key: (PUBLIC / file, None, None) for key, file in EXISTING.items()}
    for key, (filename, reference) in SUPPLIED.items():
        inputs[key] = (ARCHIVE / filename, reference, attachments / filename if attachments else None)

    for key, (path, reference, local) in inputs.items():
        old = results.get(key, {})
        original = intake.original(old.get('source', str(path.relative_to(ROOT))),
                                   expected=old.get('sourceSha256'), local=local)
        destination = OUTPUT / f'{key}.webp'
        runtime_reference = str(destination.relative_to(ROOT))
        if old and old['output'] != runtime_reference:
            raise ValueError(f'Unexpected registered runtime path: {destination}')
        limit = 960 if key == 'mural' else 560
        recipe = {'orientation': 'EXIF', 'mode': 'RGB', 'thumbnail': [limit, limit],
                  'resampling': 'LANCZOS', 'quality': 76, 'method': 6}
        result = intake.derive(original, destination, 'WEBP', recipe,
                               lambda source, output: encode_webp(source, output, limit),
                               prior=old.get('derivation'), legacy_size=old.get('size'),
                               legacy_bytes=old.get('bytes'))
        results[key] = {**old, 'source': original.reference} if old else {
            'id': key,
            'source': original.reference,
            'sourceSha256': original.sha256,
            'sourceSize': list(image_size(original.path, orient=True)),
            'reference': reference,
            'output': runtime_reference,
            'size': list(result.size),
            'bytes': result.bytes,
            'derivation': result.provenance(),
        }
    manifest = {'note': '供图保留原字节与水印。网页仅用于核对构图、窟号和年代。运行图仅等比缩放和编码。',
                **previous, 'images': list(results.values())}
    write_json(notes_path, manifest, existing=previous)
    print(f'{len(results)} illustrations, {sum(item["bytes"] for item in results.values()):,} bytes')


if __name__ == '__main__':
    main()

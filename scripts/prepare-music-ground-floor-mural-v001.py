#!/usr/bin/env python3
"""Archive the supplied originals and make the full-size game textures.

Usage: python3 scripts/prepare-music-ground-floor-mural-v001.py [/path/to/attachments]
Existing files are never replaced with different content.
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageOps

from asset_intake import AssetIntake, read_json, write_json

ROOT = Path(__file__).resolve().parents[1]
ORIGINALS = ROOT / 'art-source/world/music-ground-floor-mural/v001'
RUNTIME = ROOT / 'public/assets/world/music-ground-floor-mural/v001'
ITEMS = (
    ('1-照片-1.jpg', 'wall-front', '入门正对墙'),
    ('2-照片-2.jpg', 'wall-left', '入门左墙'),
    ('3-照片-3.jpg', 'ceiling', '一楼大厅顶面'),
)


def encode_webp(source: Path, destination: Path) -> None:
    with Image.open(source) as image:
        ImageOps.exif_transpose(image).convert('RGB').save(destination, 'WEBP', quality=88, method=6)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('attachments', type=Path, nargs='?')
    args = parser.parse_args()
    intake = AssetIntake(ROOT)
    with intake.transaction():
        prepare_murals(intake, args.attachments)


def prepare_murals(intake: AssetIntake, attachments: Path | None) -> None:
    notes_path = ORIGINALS / 'manifest.json'
    previous = read_json(notes_path, [])
    manifest = {row['providedFilename']: row for row in previous}
    for original_name, stem, use in ITEMS:
        old = manifest.get(original_name, {})
        archive_path = ORIGINALS / f'{stem}-source.jpg'
        texture_path = RUNTIME / f'{stem}.webp'
        runtime_reference = str(texture_path.relative_to(ROOT))
        if old and old['runtime'] != runtime_reference:
            raise ValueError(f'Unexpected registered runtime path: {texture_path}')
        original = intake.original(old.get('original', str(archive_path.relative_to(ROOT))),
                                   expected=old.get('originalSha256'),
                                   local=attachments / original_name if attachments else None)
        result = intake.derive(original, texture_path, 'WEBP',
                               {'orientation': 'EXIF', 'mode': 'RGB', 'quality': 88, 'method': 6}, encode_webp,
                               prior=old.get('derivation'), legacy_size=old.get('dimensions'),
                               legacy_bytes=old.get('runtimeBytes'), legacy_sha=old.get('runtimeSha256'))
        manifest[original_name] = {**old, 'original': original.reference} if old else {
            'use': use, 'providedFilename': original_name,
            'original': original.reference,
            'runtime': runtime_reference,
            'dimensions': list(result.size), 'originalBytes': original.path.stat().st_size,
            'runtimeBytes': result.bytes, 'originalSha256': original.sha256,
            'runtimeSha256': result.sha256,
            'processing': 'EXIF orientation applied; RGB WebP quality 88, method 6; no crop or resize',
            'derivation': result.provenance(),
        }
    write_json(notes_path, list(manifest.values()), existing=previous)
    print(f'{len(manifest)} mural images verified')


if __name__ == '__main__':
    main()

"""Register the supplied traveler GLB and publish a verified APFS clone for play.

Usage: python3 scripts/import-caisson-traveler-v004.py /path/to/source.glb
"""
from __future__ import annotations

import json
import struct
import subprocess
import sys
from pathlib import Path

from asset_intake import AssetIntake, digest, publish_file, read_json, staged_path, write_json

ROOT = Path(__file__).resolve().parents[1]
SOURCE_SHA256 = 'b7a6c5c7725d147f92594206775e53994574edd5d61eb7f7321ae4cf0318a183'
RUNTIME = ROOT / 'public/assets/world/traveler-tripo/v004/traveler.glb'
MANIFEST = ROOT / 'art-source/world/traveler-tripo/v004/source-manifest.json'


def validate(path: Path) -> None:
    with path.open('rb') as stream:
        header = stream.read(20)
        if len(header) != 20:
            raise ValueError('Incomplete GLB header')
        magic, version, size, json_size, kind = struct.unpack('<4sIII4s', header)
        if (magic, version, size, kind) != (b'glTF', 2, path.stat().st_size, b'JSON') or json_size > size - 28:
            raise ValueError('Invalid GLB header')
        document = json.loads(stream.read(json_size))
        binary_size, binary_kind = struct.unpack('<I4s', stream.read(8))
        if binary_kind != b'BIN\x00' or size != 28 + json_size + binary_size:
            raise ValueError('Invalid GLB payload')
        if not document.get('skins') or not document.get('meshes'):
            raise ValueError('The traveler must contain a rigged mesh')
        names = {clip.get('name') for clip in document.get('animations', [])}
        if not {'standing_relax.001', 'walk.001', 'run.001', 'look_around.001'} <= names:
            raise ValueError('The traveler is missing a source animation')


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    supplied = Path(sys.argv[1]).expanduser().resolve()
    intake = AssetIntake(ROOT)
    with intake.transaction():
        original = intake.original('vault:sha256:' + SOURCE_SHA256, expected=SOURCE_SHA256, local=supplied, validate=validate)
        RUNTIME.parent.mkdir(parents=True, exist_ok=True)
        with staged_path(RUNTIME.parent) as staged:
            # A copy-on-write clone shares storage without tying later edits to the original.
            subprocess.run(['cp', '-c', str(original.path), str(staged)], check=True)
            if digest(staged) != original.sha256:
                raise ValueError('Published traveler differs from the supplied original')
            validate(staged)
            publish_file(staged, RUNTIME, original.sha256)
        manifest = {
            'version': 'v004',
            'original': original.reference,
            'originalSha256': original.sha256,
            'suppliedFile': supplied.name,
            'bytes': original.path.stat().st_size,
            'runtime': str(RUNTIME.relative_to(ROOT)),
            'runtimeSha256': original.sha256,
            'runtimeMethod': 'APFS copy-on-write clone; original mesh, materials, rig and animation preserved',
        }
        previous = read_json(MANIFEST)
        if previous is not None and previous != manifest:
            raise ValueError('Traveler registration differs; use a new version')
        write_json(MANIFEST, manifest, existing=previous)
        print('Traveler original registered and runtime GLB verified.')


if __name__ == '__main__':
    main()

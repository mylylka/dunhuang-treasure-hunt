"""Verify or restore the three-gallery archive at the registered paths."""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

from asset_intake import AssetIntake, VAULT_PREFIX, digest, lock, publish_file, read_json, regular_file, staged_path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'art-source/archives/3d-world-v001.json'
GIT_ENV = {**os.environ, 'GIT_NO_LAZY_FETCH': '1'}


def verify_bytes(path: Path, size: int, sha256: str) -> None:
    if path.stat().st_size != size or digest(path) != sha256:
        raise ValueError(f'File differs from the archive record: {path}')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--check', action='store_true', help='Verify the recorded bytes in the asset library.')
    mode.add_argument('--restore', action='store_true', help='Copy verified files back to their original paths.')
    mode.add_argument('--import-from-git', action='store_true', help='Repopulate the library from local Git objects.')
    parser.add_argument('paths', nargs='*', metavar='PATH', help='Repository-relative file or directory.')
    args = parser.parse_args()

    manifest = read_json(MANIFEST)
    if manifest is None:
        # The manifest can be outside the patterns of a sparse checkout.
        result = subprocess.run(
            ['git', 'show', f'HEAD:{MANIFEST.relative_to(ROOT)}'],
            cwd=ROOT, capture_output=True, env=GIT_ENV,
        )
        if result.returncode != 0:
            raise FileNotFoundError(f'Cannot read archive manifest: {MANIFEST}')
        manifest = json.loads(result.stdout)
    revision = manifest['sourceCommit']
    if not re.fullmatch(r'[0-9a-f]{40}', revision):
        raise ValueError('Invalid archive source commit.')
    paths = {path.rstrip('/') for path in args.paths}
    matched = set()
    assets = []
    for record in manifest['assets']:
        path = record['path']
        selectors = {selector for selector in paths if path == selector or path.startswith(selector + '/')}
        if paths and not selectors:
            continue
        matched.update(selectors)
        relative = Path(path)
        destination = ROOT / relative
        if relative.is_absolute() or '..' in relative.parts or destination.resolve() != destination:
            raise ValueError(f'Unsafe archive path: {path}')
        assets.append((record, destination))
    if paths - matched:
        parser.error(f'No archived files for {", ".join(sorted(paths - matched))}')

    intake = AssetIntake(ROOT)
    if args.import_from_git:
        intake.prepare_vault()
        with lock(intake.vault):
            for record, _ in assets:
                sha256 = record['sha256']
                if intake.existing(VAULT_PREFIX + sha256):
                    continue
                with staged_path(intake.vault) as staged:
                    with staged.open('wb') as output:
                        subprocess.run(
                            ['git', 'cat-file', 'blob', f'{revision}:{record["path"]}'],
                            cwd=ROOT, stdout=output, check=True, env=GIT_ENV,
                        )
                    verify_bytes(staged, record['bytes'], sha256)
                    intake.store(staged, sha256)

    copies = []
    for record, destination in assets:
        sha256 = record['sha256']
        original = intake.existing(VAULT_PREFIX + sha256)
        if original is None:
            raise FileNotFoundError(f'Missing archive object for {record["path"]}')
        if original.path.stat().st_size != record['bytes']:
            raise ValueError(f'Archive size differs for {record["path"]}')
        if args.restore:
            if regular_file(destination):
                verify_bytes(destination, record['bytes'], sha256)
            else:
                copies.append((original, destination, record['bytes']))

    for original, destination, size in copies:
        with staged_path(destination.parent) as staged:
            shutil.copyfile(original.path, staged)
            staged.chmod(0o644)
            verify_bytes(staged, size, original.sha256)
            publish_file(staged, destination, original.sha256)

    size = sum(record['bytes'] for record, _ in assets)
    print(f'Verified {len(assets)} archived files ({size:,} bytes). Restored {len(copies)} files.')


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        sys.exit(str(error))

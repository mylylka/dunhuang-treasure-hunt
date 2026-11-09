#!/usr/bin/env python3
"""Read-only APFS private-space and clone-ID check for terrain v001–v013.

Examples:
  python3 scripts/measure-apfs-private.py --file outputs/terrain/v002/assets/world/example.glb --compare outputs/terrain/v001/assets/world/example.glb
  python3 scripts/measure-apfs-private.py --manifest /tmp/terrain-duplicates.json
  python3 scripts/measure-apfs-private.py --journal /tmp/terrain-dedup.jsonl

The manifest is produced by `node scripts/audit-terrain-duplicates.mjs --json`.
The journal is JSONL; successful records must contain event="replaced", path,
and source, with paths relative to outputs/terrain. Only ordinary files under
the 13 named versions are read. The command never modifies or removes files.
It compares clone IDs, not file content; SHA-256 verification remains separate.
"""
from __future__ import annotations

import argparse
import ctypes
import json
import os
from pathlib import Path
import stat
import struct
import sys


REPOSITORY = Path(__file__).resolve().parent.parent
TERRAIN = REPOSITORY / 'outputs' / 'terrain'
VERSIONS = {f'v{i:03d}' for i in range(1, 14)}
FSOPT_ATTR_CMN_EXTENDED = 0x20
FSOPT_NOFOLLOW_ANY = 0x800
ATTR_CMNEXT_PRIVATESIZE = 0x8
ATTR_CMNEXT_CLONEID = 0x100
ATTR_CMNEXT_CLONE_REFCNT = 0x1000


class AttrList(ctypes.Structure):
    _fields_ = [
        ('bitmapcount', ctypes.c_uint16), ('reserved', ctypes.c_uint16),
        ('commonattr', ctypes.c_uint32), ('volattr', ctypes.c_uint32),
        ('dirattr', ctypes.c_uint32), ('fileattr', ctypes.c_uint32),
        ('forkattr', ctypes.c_uint32),
    ]


def contained_file(value: str) -> Path:
    """Reject symlinks and anything outside the approved terrain versions."""
    p = Path(value)
    if not p.is_absolute():
        p = (REPOSITORY / p) if p.parts[:2] == ('outputs', 'terrain') else (TERRAIN / p)
    p = Path(os.path.abspath(p))
    try:
        rel = p.relative_to(TERRAIN)
    except ValueError as error:
        raise ValueError('path is outside outputs/terrain') from error
    if len(rel.parts) < 2 or rel.parts[0] not in VERSIONS:
        raise ValueError('path is outside terrain v001–v013')
    current = TERRAIN
    if current.resolve(strict=True) != current:
        raise ValueError('terrain root is not a real directory')
    for part in rel.parts:
        current = current / part
        st = current.lstat()
        if stat.S_ISLNK(st.st_mode):
            raise ValueError('symlinks are not allowed')
    if not stat.S_ISREG(st.st_mode):
        raise ValueError('path is not a regular file')
    if st.st_dev != TERRAIN.stat().st_dev:
        raise ValueError('file is on a different filesystem')
    return current


def apfs_info(path: Path) -> tuple[int, int, int, int]:
    if sys.platform != 'darwin':
        raise OSError('APFS measurement requires macOS')
    attrs = AttrList(5, 0, 0, 0, 0, 0,
                     ATTR_CMNEXT_PRIVATESIZE | ATTR_CMNEXT_CLONEID | ATTR_CMNEXT_CLONE_REFCNT)
    lib = ctypes.CDLL(None, use_errno=True)
    lib.getattrlist.argtypes = [ctypes.c_char_p, ctypes.POINTER(AttrList), ctypes.c_void_p,
                               ctypes.c_size_t, ctypes.c_ulong]
    lib.getattrlist.restype = ctypes.c_int
    buf = ctypes.create_string_buffer(64)
    rc = lib.getattrlist(os.fsencode(path), ctypes.byref(attrs), buf, len(buf),
                         FSOPT_ATTR_CMN_EXTENDED | FSOPT_NOFOLLOW_ANY)
    if rc:
        raise OSError(ctypes.get_errno(), 'getattrlist failed')
    if struct.unpack_from('=I', buf.raw, 0)[0] < 24:
        raise OSError('filesystem did not return the requested clone attributes')
    private, clone_id, refs = struct.unpack_from('=qQI', buf.raw, 4)
    if private < 0:
        raise OSError('filesystem returned an invalid private size')
    return private, clone_id, refs, path.stat().st_size


def manifest_pairs(path: Path, threshold: int):
    with path.open(encoding='utf-8') as file:
        data = json.load(file)
    for group in data['groups']:
        if group['bytesPerFile'] < threshold:
            continue
        paths = group['paths']
        if len(paths) < 2:
            continue
        for target in paths[1:]:
            yield target, paths[0]


def journal_pairs(path: Path):
    with path.open(encoding='utf-8') as file:
        for line in file:
            if not line.strip():
                continue
            record = json.loads(line)
            if record.get('event') == 'replaced':
                yield record['path'], record['source']


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    choice = parser.add_mutually_exclusive_group(required=True)
    choice.add_argument('--file', help='one file inside outputs/terrain/v001–v013')
    choice.add_argument('--manifest', type=Path, help='read-only audit JSON')
    choice.add_argument('--journal', type=Path, help='deduplication JSONL journal')
    parser.add_argument('--compare', help='optional source file for --file')
    parser.add_argument('--min-bytes', type=int, default=1024 * 1024)
    parser.add_argument('--json', action='store_true', help='emit compact JSON summary')
    args = parser.parse_args()
    if args.compare and not args.file:
        parser.error('--compare requires --file')
    if args.min_bytes < 0:
        parser.error('--min-bytes must be nonnegative')
    try:
        if args.file:
            pairs = [(args.file, args.compare)]
        elif args.manifest:
            pairs = manifest_pairs(args.manifest, args.min_bytes)
        else:
            pairs = journal_pairs(args.journal)
        totals = {'files': 0, 'logicalBytes': 0, 'privateBytes': 0,
                  'sameCloneId': 0, 'differentCloneId': 0, 'zeroPrivate': 0}
        for target_value, source_value in pairs:
            target = contained_file(target_value)
            private, clone_id, refs, size = apfs_info(target)
            totals['files'] += 1
            totals['logicalBytes'] += size
            totals['privateBytes'] += private
            totals['zeroPrivate'] += int(private == 0)
            if source_value:
                source = contained_file(source_value)
                _, source_id, _, _ = apfs_info(source)
                totals['sameCloneId' if clone_id == source_id else 'differentCloneId'] += 1
        if args.json:
            print(json.dumps(totals, ensure_ascii=False))
        else:
            print(f"Files: {totals['files']}; logical: {totals['logicalBytes'] / 1048576:.2f} MiB; "
                  f"APFS private: {totals['privateBytes'] / 1048576:.2f} MiB")
            print(f"Same clone ID: {totals['sameCloneId']}; different clone ID: {totals['differentCloneId']}; "
                  f"zero private bytes: {totals['zeroPrivate']}")
            print('Private bytes are filesystem-reported and do not guarantee a matching change in df.')
        return 0
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError) as error:
        print(f'APFS measurement failed: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())

"""Verify and reuse registered originals before publishing new immutable assets."""

from __future__ import annotations

import fcntl
import hashlib
import json
import os
import re
import shutil
import stat
import subprocess
import tempfile
import urllib.request
from collections.abc import Callable
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit

from PIL import Image, ImageOps, __version__ as pillow_version, features


VAULT_PREFIX = 'vault:sha256:'
SHA256 = re.compile(r'[0-9a-f]{64}')
MAX_DOWNLOAD_BYTES = 128 * 1024 * 1024
VAULT_RULES = b'''# Dunhuang Asset Library

`objects/<first-two-digits>/<sha256>` holds immutable source bytes.
`sources/<url-sha256>.json` maps an approved download URL to its object.
The project's art-source manifests record provenance and use.
Back up this library with the project. Keep objects used by any recorded version.
'''


def digest(path: Path) -> str:
    sha256 = hashlib.sha256()
    with path.open('rb') as file:
        while chunk := file.read(1024 * 1024):
            sha256.update(chunk)
    return sha256.hexdigest()


def read_json(path: Path, default=None):
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else default


@contextmanager
def lock(directory: Path):
    fd = os.open(directory, os.O_RDONLY)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        yield
    finally:
        os.close(fd)


@contextmanager
def staged_path(directory: Path):
    directory.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix='.asset-intake-', suffix='.tmp', dir=directory)
    os.close(fd)
    path = Path(name)
    try:
        yield path
    finally:
        path.unlink(missing_ok=True)


def regular_file(path: Path) -> bool:
    try:
        mode = path.lstat().st_mode
    except FileNotFoundError:
        return False
    if not stat.S_ISREG(mode):
        raise ValueError(f'Expected a regular asset file: {path}')
    return True


def publish_file(staged: Path, destination: Path, sha256: str) -> None:
    # Publish the staged inode atomically, with no ability to replace a destination.
    with staged.open('rb') as file:
        os.fsync(file.fileno())
    try:
        os.link(staged, destination)
    except FileExistsError:
        if not regular_file(destination) or digest(destination) != sha256:
            raise FileExistsError(f'Existing asset differs; use a new version: {destination}') from None


def write_json(path: Path, value, *, existing=None) -> None:
    if existing == value and regular_file(path):
        return
    data = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
    with staged_path(path.parent) as staged:
        staged.write_bytes(data)
        if regular_file(path):
            if read_json(path) != existing:
                raise ValueError(f'Asset registration changed during import: {path}')
            staged.chmod(stat.S_IMODE(path.stat().st_mode))
            with staged.open('rb') as file:
                os.fsync(file.fileno())
            os.replace(staged, path)
        else:
            publish_file(staged, path, hashlib.sha256(data).hexdigest())


def image_size(path: Path, format_name: str | None = None, *, orient: bool = False) -> tuple[int, int]:
    with Image.open(path) as image:
        if format_name is not None and image.format != format_name:
            raise ValueError(f'Unexpected image format: {path}')
        image.load()
        return ImageOps.exif_transpose(image).size if orient else image.size


def validate_mp4(path: Path) -> None:
    result = subprocess.run([
        'ffprobe', '-v', 'error', '-select_streams', 'v:0', '-of', 'json',
        '-show_entries', 'format=format_name:stream=codec_name,width,height', str(path),
    ], capture_output=True, check=True, timeout=30)
    metadata = json.loads(result.stdout)
    streams = metadata.get('streams', [])
    formats = metadata.get('format', {}).get('format_name', '').split(',')
    if ('mp4' not in formats or len(streams) != 1 or not streams[0].get('codec_name')
            or streams[0].get('width', 0) <= 0 or streams[0].get('height', 0) <= 0):
        raise ValueError(f'Invalid MP4 video: {path}')


def download_image(url: str, path: Path) -> None:
    location = urlsplit(url)
    if location.scheme not in ('https', 'http') or not location.hostname or location.username is not None:
        raise ValueError('Image download must use an HTTP(S) source without embedded credentials.')
    with urllib.request.urlopen(url, timeout=40) as response, path.open('wb') as file:
        length = response.headers.get('Content-Length')
        if length is not None and not 0 <= int(length) <= MAX_DOWNLOAD_BYTES:
            raise ValueError('Image download exceeds the asset intake size limit.')
        while chunk := response.read(1024 * 1024):
            if file.tell() + len(chunk) > MAX_DOWNLOAD_BYTES:
                raise ValueError('Image download exceeds the asset intake size limit.')
            file.write(chunk)
        if length is not None and file.tell() != int(length):
            raise ValueError('Image download did not match its advertised size.')


@dataclass(frozen=True)
class Original:
    path: Path
    reference: str
    sha256: str


@dataclass(frozen=True)
class Derivative:
    size: tuple[int, int]
    bytes: int
    sha256: str
    fingerprint: str

    def provenance(self) -> dict:
        return {'fingerprint': self.fingerprint, 'sha256': self.sha256}


def manifest_rows(value):
    if isinstance(value, dict):
        yield value
        for item in value.values():
            yield from manifest_rows(item)
    elif isinstance(value, list):
        for item in value:
            yield from manifest_rows(item)


class AssetIntake:
    def __init__(self, root: Path, vault: Path | None = None):
        self.root = root.resolve()
        default_vault = Path.home() / 'Documents/DunhuangAssetLibrary'
        self.vault = (vault or Path(os.environ.get('DUNHUANG_ASSET_LIBRARY') or default_vault)).expanduser().resolve()
        if self.vault.is_relative_to(self.root) or self.root.is_relative_to(self.vault):
            raise ValueError('DUNHUANG_ASSET_LIBRARY must be outside the project workspace.')
        if any(os.path.lexists(directory / '.git') for directory in (self.vault, *self.vault.parents)):
            raise ValueError('DUNHUANG_ASSET_LIBRARY must be outside every Git workspace.')
        self._sources = None

    def transaction(self):
        return lock(self.root)

    def object_path(self, sha256: str) -> Path:
        if not SHA256.fullmatch(sha256):
            raise ValueError('Invalid asset SHA-256.')
        return self.vault_path('objects', sha256[:2], sha256)

    def vault_path(self, *parts: str) -> Path:
        path = self.vault.joinpath(*parts)
        if path.resolve() != path:
            raise ValueError(f'Asset library paths must not use symlinks: {path}')
        return path

    def resolve_reference(self, reference: str) -> Path:
        if reference.startswith(VAULT_PREFIX):
            return self.object_path(reference.removeprefix(VAULT_PREFIX))
        path = self.root / reference
        if not path.resolve().is_relative_to(self.root):
            raise ValueError(f'Asset reference is outside the project: {reference}')
        return path

    def existing(self, reference: str, expected: str | None = None) -> Original | None:
        path = self.resolve_reference(reference)
        if reference.startswith(VAULT_PREFIX):
            vault_hash = reference.removeprefix(VAULT_PREFIX)
            if expected is not None and expected != vault_hash:
                raise ValueError(f'Vault reference disagrees with its recorded SHA-256: {path}')
            expected = vault_hash
        if not regular_file(path):
            return None
        actual = digest(path)
        if expected and expected != actual:
            raise ValueError(f'Existing source failed SHA-256 verification: {path}')
        return Original(path, reference, actual)

    def registered_sources(self):
        if self._sources is None:
            self._sources = []
            for path in (self.root / 'art-source').rglob('*.json'):
                if path.name not in ('manifest.json', 'source-manifest.json', 'source-notes.json') or path.is_symlink():
                    continue
                for row in manifest_rows(read_json(path)):
                    reference = row.get('originalPath') or row.get('original') or row.get('source')
                    sha256 = row.get('originalSha256') or row.get('sourceSha256') or row.get('sha256')
                    if (isinstance(reference, str) and reference.startswith(('art-source/', VAULT_PREFIX))
                            and isinstance(sha256, str) and SHA256.fullmatch(sha256)):
                        self._sources.append((reference, sha256, row.get('imageUrl')))
        return self._sources

    def registered(self, *, sha256=None, url=None) -> Original | None:
        if not (sha256 or url):
            return None
        if sha256:
            original = self.existing(VAULT_PREFIX + sha256, sha256)
            if original:
                return original
        selected = None
        for reference, recorded_sha, recorded_url in self.registered_sources():
            if (sha256 and sha256 == recorded_sha) or (url and url == recorded_url and not sha256):
                original = self.existing(reference, recorded_sha)
                if original and sha256:
                    return original
                if original and selected and original.sha256 != selected.sha256:
                    raise ValueError('Multiple different assets are recorded for this URL; specify the source SHA-256.')
                selected = selected or original
        return selected

    def prepare_vault(self) -> None:
        rules = self.vault_path('README.md')
        if regular_file(rules):
            if rules.read_bytes() != VAULT_RULES:
                raise ValueError(f'Unexpected asset library layout rules: {rules}')
            return
        with staged_path(self.vault) as staged:
            staged.write_bytes(VAULT_RULES)
            publish_file(staged, rules, hashlib.sha256(VAULT_RULES).hexdigest())

    def store(self, staged: Path, sha256: str) -> Original:
        destination = self.object_path(sha256)
        destination.parent.mkdir(parents=True, exist_ok=True)
        publish_file(staged, destination, sha256)
        return Original(destination, VAULT_PREFIX + sha256, sha256)

    def original(self, reference: str, *, expected=None, local: Path | None = None, url=None,
                 validate: Callable[[Path], object] | None = None) -> Original:
        if validate is not None and url is not None:
            raise ValueError('Custom asset validation is available for local originals only.')
        original = self.existing(reference, expected)
        local_sha = digest(local) if local is not None and regular_file(local) else None
        expected = expected or (original.sha256 if original else None)
        if expected and local_sha and expected != local_sha:
            raise ValueError(f'Supplied source differs from this version: {local}')
        original = original or self.registered(sha256=expected or local_sha, url=url)
        if original:
            if validate is not None:
                validate(original.path)
            return original
        if not (local_sha or url):
            raise FileNotFoundError(f'No verified source available: {reference}')

        self.prepare_vault()
        with lock(self.vault):
            # The URL index is private, content-addressed by the complete URL, and
            # consulted only after checked-in provenance and any supplied bytes.
            alias = self.vault_path('sources', hashlib.sha256(url.encode()).hexdigest() + '.json') if url else None
            recorded = read_json(alias) if alias else None
            if recorded:
                recorded_sha = recorded['sha256']
                if (expected or local_sha) and recorded_sha != (expected or local_sha):
                    raise ValueError('Recorded URL content differs; use a new source version.')
                original = self.registered(sha256=recorded_sha)
                if original:
                    return original
                expected = recorded_sha

            with staged_path(self.vault) as staged:
                if local_sha:
                    shutil.copyfile(local, staged)
                    expected = local_sha
                else:
                    download_image(url, staged)
                sha256 = digest(staged)
                if expected and sha256 != expected:
                    raise ValueError('Acquired source failed SHA-256 verification.')
                (validate or image_size)(staged)
                original = self.registered(sha256=sha256) or self.store(staged, sha256)
            if alias and not recorded:
                write_json(alias, {'sha256': sha256})
            return original

    def derive(self, original: Original, destination: Path, format_name: str, recipe: dict, encode, *,
               prior: dict | None = None, legacy_size=None, legacy_bytes=None, legacy_sha=None) -> Derivative:
        codec = {'PNG': 'zlib', 'WEBP': 'webp'}[format_name]
        inputs = [original.sha256, format_name, recipe, pillow_version, features.version(codec)]
        fingerprint = hashlib.sha256(json.dumps(inputs, sort_keys=True).encode()).hexdigest()
        if prior and prior['fingerprint'] != fingerprint:
            raise ValueError(f'Asset derivation changed; use a new version: {destination}')
        expected = prior['sha256'] if prior else legacy_sha
        if regular_file(destination) and (expected or legacy_size):
            sha256 = digest(destination)
            size = image_size(destination, format_name)
            byte_count = destination.stat().st_size
            if ((expected and sha256 != expected) or (legacy_size and size != tuple(legacy_size))
                    or (legacy_bytes is not None and byte_count != legacy_bytes)):
                raise ValueError(f'Existing runtime image failed verification: {destination}')
            return Derivative(size, byte_count, sha256, fingerprint)

        with staged_path(destination.parent) as staged:
            encode(original.path, staged)
            if digest(original.path) != original.sha256:
                raise ValueError(f'Source changed during asset conversion: {original.path}')
            sha256 = digest(staged)
            size = image_size(staged, format_name)
            byte_count = staged.stat().st_size
            if ((expected and sha256 != expected) or (legacy_size and size != tuple(legacy_size))
                    or (legacy_bytes is not None and byte_count != legacy_bytes)):
                raise ValueError(f'Rebuilt runtime image differs from its record: {destination}')
            publish_file(staged, destination, sha256)
            return Derivative(size, byte_count, sha256, fingerprint)

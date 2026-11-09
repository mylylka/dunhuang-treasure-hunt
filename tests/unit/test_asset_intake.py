import importlib.util
import io
import json
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

from PIL import Image, UnidentifiedImageError

SCRIPTS = Path(__file__).resolve().parents[2] / 'scripts'
sys.path.insert(0, str(SCRIPTS))

from asset_intake import AssetIntake, digest, download_image


def load_script(filename):
    spec = importlib.util.spec_from_file_location(filename, SCRIPTS / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class AssetIntakeTest(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory(prefix='dunhuang-asset-test-')
        self.addCleanup(directory.cleanup)
        self.base = Path(directory.name).resolve()
        self.root = self.base / 'project'
        self.vault = self.base / 'library'
        self.root.mkdir()
        self.intake = AssetIntake(self.root, self.vault)

    def fixture(self, name='input.png'):
        path = self.base / name
        Image.new('RGB', (11, 9), (202, 145, 83)).save(path, 'PNG')
        return path

    def test_existing_registered_source_is_verified_and_reused(self):
        archive = self.root / 'art-source/old'
        archive.mkdir(parents=True)
        original = archive / 'existing.png'
        original.write_bytes(self.fixture().read_bytes())
        reference = 'art-source/old/existing.png'
        sha256 = digest(original)
        url = 'https://example.test/existing.png'
        (archive / 'source-notes.json').write_text(json.dumps({'references': [
            {'originalPath': reference, 'sha256': sha256, 'imageUrl': url},
        ]}))

        with patch('asset_intake.download_image', side_effect=AssertionError('must reuse archive')):
            found = self.intake.original('art-source/new/elsewhere.png', url=url)
        self.assertEqual((found.path, found.reference, found.sha256), (original, reference, sha256))
        self.assertFalse(self.vault.exists())

    def test_failed_and_concurrent_downloads_publish_only_verified_bytes(self):
        url = 'https://example.test/new.png'
        reference = 'art-source/new/input.png'
        with patch('asset_intake.download_image', side_effect=lambda _, path: path.write_bytes(b'broken')):
            with self.assertRaises(UnidentifiedImageError):
                self.intake.original(reference, url=url)
        self.assertTrue((self.vault / 'README.md').exists())
        self.assertFalse((self.vault / 'sources').exists())
        self.assertFalse((self.vault / 'objects').exists())
        self.assertFalse(list(self.vault.glob('.asset-intake-*')))

        data = self.fixture().read_bytes()
        with patch('asset_intake.download_image', side_effect=lambda _, path: path.write_bytes(data)) as transfer:
            with ThreadPoolExecutor(max_workers=2) as pool:
                originals = list(pool.map(lambda _: AssetIntake(self.root, self.vault).original(reference, url=url), range(2)))
            self.assertEqual(transfer.call_count, 1)
            self.assertEqual(originals[0], originals[1])
            other = self.intake.original('art-source/new/a-different-name.png', local=self.fixture('other.png'))
            self.assertEqual(other, originals[0])
        self.assertEqual(originals[0].path.read_bytes(), data)
        self.assertEqual(len(list((self.vault / 'objects').glob('*/*'))), 1)

    def test_incomplete_download_is_rejected(self):
        class TruncatedResponse(io.BytesIO):
            headers = {'Content-Length': '10'}

        with patch('asset_intake.urllib.request.urlopen', return_value=TruncatedResponse(b'short')):
            with self.assertRaisesRegex(ValueError, 'advertised size'):
                download_image('https://example.test/incomplete.png', self.base / 'stage')

    def test_vault_cannot_be_inside_a_git_worktree(self):
        another = self.base / 'another'
        another.mkdir()
        (another / '.git').write_text('gitdir: /example')
        with self.assertRaisesRegex(ValueError, 'outside every Git workspace'):
            AssetIntake(self.root, another / 'vault')

    def test_derivation_uses_fingerprint_and_checks_existing_bytes(self):
        original = self.intake.original('art-source/new/input.png', local=self.fixture())
        output = self.root / 'public/assets/sample.png'

        def encode(source, destination):
            with Image.open(source) as image:
                image.save(destination, 'PNG')

        result = self.intake.derive(original, output, 'PNG', {'version': 1}, encode)
        before = output.stat().st_mtime_ns
        self.assertEqual(self.intake.derive(original, output, 'PNG', {'version': 1}, None,
                                            prior=result.provenance()), result)
        self.assertEqual(output.stat().st_mtime_ns, before)
        with self.assertRaisesRegex(ValueError, 'derivation changed'):
            self.intake.derive(original, output, 'PNG', {'version': 2}, None, prior=result.provenance())
        Image.new('RGB', (11, 9), 'black').save(output)
        with self.assertRaisesRegex(ValueError, 'failed verification'):
            self.intake.derive(original, output, 'PNG', {'version': 1}, None, prior=result.provenance())

    def test_pilot_importers_repeat_without_downloading_encoding_or_writing(self):
        src = self.root / 'src/content'
        src.mkdir(parents=True)
        (src / 'assets.json').write_text('[]\n')
        fixtures = self.base / 'fixtures'
        fixtures.mkdir()
        data = self.fixture().read_bytes()
        (fixtures / 'image.png').write_bytes(data)
        common = {'original': 'image.png', 'imageUrl': 'https://example.test/shared.png',
                  'publisher': 'Fixture', 'verification': 'Fixture'}

        v1 = load_script('import-pattern-lesson-references.py')
        v2 = load_script('import-pattern-lesson-references-v002.py')
        mural = load_script('prepare-music-ground-floor-mural-v001.py')
        folio = load_script('prepare-first-gallery-folio-v001.py')
        public = self.root / 'public/assets'
        configurations = (
            (v1, {'ROOT': self.root, 'ARCHIVE': self.root / 'art-source/patterns/v001', 'RUNTIME': public / 'lessons/patterns',
                  'REFERENCES': [{**common, 'id': 'sample', 'file': 'missing.png'}]},
             lambda: v1.import_references(self.intake), 'encode_png'),
            (v2, {'ROOT': self.root, 'ARCHIVE': self.root / 'art-source/patterns/v002', 'RUNTIME': public / 'lessons/patterns',
                  'REFERENCES': [{**common, 'workFile': 'missing.png', 'exports': [{'id': 'sample', 'crop': [1, 1, 5, 6]}]}]},
             lambda: v2.import_references(self.intake), 'encode_png'),
            (mural, {'ROOT': self.root, 'ORIGINALS': self.root / 'art-source/mural', 'RUNTIME': public / 'mural',
                     'ITEMS': [('image.png', 'wall', 'Fixture')]},
             lambda: mural.prepare_murals(self.intake, fixtures), 'encode_webp'),
            (folio, {'ROOT': self.root, 'ARCHIVE': self.root / 'art-source/folio', 'OUTPUT': public / 'folio',
                     'PUBLIC': public, 'EXISTING': {'lesson': 'lessons/patterns/sample-v002.png'},
                     'SUPPLIED': {'new': ('image.png', 'Fixture')}},
             lambda: folio.prepare_folio(self.intake, fixtures), 'encode_webp'),
        )

        with redirect_stdout(io.StringIO()):
            with patch('asset_intake.download_image', side_effect=lambda _, path: path.write_bytes(data)) as transfer:
                for module, options, command, _ in configurations:
                    with patch.multiple(module, **options), self.intake.transaction():
                        command()
                self.assertEqual(transfer.call_count, 1)

            def state():
                return {path: (path.stat().st_ino, path.stat().st_mtime_ns, digest(path))
                        for directory in (self.root, self.vault) for path in directory.rglob('*') if path.is_file()}

            before = state()
            with patch('asset_intake.download_image', side_effect=AssertionError('must reuse source')):
                for module, options, command, encoder in configurations:
                    with patch.multiple(module, **options), patch.object(module, encoder, side_effect=AssertionError('must reuse runtime')), self.intake.transaction():
                        command()
        self.assertEqual(state(), before)
        self.assertEqual(len(list((self.vault / 'objects').glob('*/*'))), 1)
        self.assertFalse((self.root / 'art-source/patterns/v001/image.png').exists())
        self.assertEqual(json.loads((src / 'assets.json').read_text())[0]['version'], 'reference-v002')


if __name__ == '__main__':
    unittest.main()

#!/usr/bin/env python3
"""Add-ons plugin ZIP: reproducible bytes, exact allowlist, fixed metadata, matches the sources."""
import pathlib, subprocess, sys, tempfile, unittest, zipfile
ROOT = pathlib.Path(__file__).resolve().parents[1]
PLUGIN = 'meister-product-addons'
class PackageTests(unittest.TestCase):
    def test_reproducible_zip_contents_and_metadata(self):
        with tempfile.TemporaryDirectory(dir=ROOT / 'wordpress') as directory:
            first, second = pathlib.Path(directory) / 'a.zip', pathlib.Path(directory) / 'b.zip'
            for path in (first, second):
                p = subprocess.run([sys.executable, str(ROOT / 'wordpress/build-zip.py'), '--plugin', PLUGIN, '--output', str(path)], capture_output=True, text=True)
                self.assertEqual(p.returncode, 0, p.stderr)
            self.assertEqual(first.read_bytes(), second.read_bytes())
            self.assertEqual(first.read_bytes(), (ROOT / f'wordpress/dist/{PLUGIN}-1.0.0.zip').read_bytes(), 'committed ZIP is stale: rebuild it')
            with zipfile.ZipFile(first) as archive:
                expected = [f'{PLUGIN}/' + p.name for p in sorted((ROOT / 'wordpress' / PLUGIN).iterdir()) if p.suffix == '.php' or p.name == 'readme.txt']
                self.assertEqual(archive.namelist(), expected)
                self.assertEqual(len(expected), 6)
                for info in archive.infolist():
                    self.assertEqual(info.date_time, (2020, 1, 1, 0, 0, 0))
                    self.assertEqual(info.compress_type, zipfile.ZIP_STORED)
                    self.assertEqual(info.external_attr >> 16, 0o100644)
                    self.assertNotIn('..', info.filename)
                    self.assertEqual(archive.read(info), (ROOT / 'wordpress' / info.filename).read_bytes())
if __name__ == '__main__':
    unittest.main()

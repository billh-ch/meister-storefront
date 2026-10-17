#!/usr/bin/env python3
"""Reproducibility, path allowlist, PHP syntax via SSH, no network writes."""
import hashlib
import pathlib
import subprocess
import sys
import tempfile
import unittest
import zipfile
ROOT = pathlib.Path(__file__).resolve().parents[1]
class PackageTests(unittest.TestCase):
    def test_reproducible_zip_contents_and_metadata(self):
        with tempfile.TemporaryDirectory(dir=ROOT / 'wordpress') as directory:
            first, second = pathlib.Path(directory)/'a.zip', pathlib.Path(directory)/'b.zip'
            for path in (first, second):
                p = subprocess.run([sys.executable, str(ROOT/'wordpress/build-zip.py'), '--output', str(path)], capture_output=True, text=True)
                self.assertEqual(p.returncode, 0, p.stderr)
            self.assertEqual(first.read_bytes(), second.read_bytes())
            with zipfile.ZipFile(first) as archive:
                names = archive.namelist()
                expected=['meister-product-translations/'+p.name for p in sorted((ROOT/'wordpress/meister-product-translations').iterdir()) if p.suffix=='.php' or p.name=='readme.txt']
                self.assertEqual(names, expected)
                self.assertGreaterEqual(len(names), 8)
                for info in archive.infolist():
                    self.assertEqual(info.date_time,(2020,1,1,0,0,0))
                    self.assertEqual(info.compress_type,zipfile.ZIP_STORED)
                    self.assertEqual(info.external_attr >> 16,0o100644)
                    self.assertEqual(info.extra,b'')
                    self.assertNotIn('..',info.filename)
                    self.assertEqual(archive.read(info), (ROOT/'wordpress'/info.filename).read_bytes())
if __name__=='__main__': unittest.main()

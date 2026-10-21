#!/usr/bin/env python3
"""Build identical bytes across machines (stored ZIP, fixed metadata, allowlist)."""
import argparse
import hashlib
import pathlib
import zipfile
ROOT = pathlib.Path(__file__).resolve().parent

def build(output):
    source = ROOT / 'meister-product-translations'
    files = sorted(path for path in source.iterdir() if path.suffix == '.php' or path.name == 'readme.txt')
    if len(files) != 8 or any(path.is_symlink() or not path.is_file() for path in files):
        raise ValueError('Expected seven regular PHP files and readme.txt; review packaging allowlist')
    output = pathlib.Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_STORED) as archive:
        for path in files:
            info = zipfile.ZipInfo('meister-product-translations/' + path.name, date_time=(2020,1,1,0,0,0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            info.compress_type = zipfile.ZIP_STORED
            archive.writestr(info, path.read_bytes())
    print(hashlib.sha256(output.read_bytes()).hexdigest() + '  ' + str(output))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', default=str(ROOT/'dist/meister-product-translations-1.0.0.zip'))
    build(parser.parse_args().output)

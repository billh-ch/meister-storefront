#!/usr/bin/env python3
"""Build identical bytes across machines (stored ZIP, fixed metadata, allowlist).

    python3 wordpress/build-zip.py                                  # meister-product-translations
    python3 wordpress/build-zip.py --plugin meister-product-addons
"""
import argparse
import hashlib
import pathlib
import zipfile
ROOT = pathlib.Path(__file__).resolve().parent

# Exact allowlist per plugin: the PHP files plus readme.txt, nothing else.
PLUGINS = {
    'meister-product-translations': {'version': '1.0.0', 'php_files': 7},
    'meister-product-addons': {'version': '1.0.0', 'php_files': 5},
}

def build(output, plugin='meister-product-translations'):
    spec = PLUGINS[plugin]
    source = ROOT / plugin
    files = sorted(path for path in source.iterdir() if path.suffix == '.php' or path.name == 'readme.txt')
    if len(files) != spec['php_files'] + 1 or any(path.is_symlink() or not path.is_file() for path in files):
        raise ValueError(f"Expected {spec['php_files']} regular PHP files and readme.txt; review packaging allowlist")
    output = pathlib.Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_STORED) as archive:
        for path in files:
            info = zipfile.ZipInfo(plugin + '/' + path.name, date_time=(2020,1,1,0,0,0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            info.compress_type = zipfile.ZIP_STORED
            archive.writestr(info, path.read_bytes())
    print(hashlib.sha256(output.read_bytes()).hexdigest() + '  ' + str(output))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--plugin', default='meister-product-translations', choices=sorted(PLUGINS))
    parser.add_argument('--output', default=None)
    args = parser.parse_args()
    spec = PLUGINS[args.plugin]
    build(args.output or str(ROOT / 'dist' / f"{args.plugin}-{spec['version']}.zip"), args.plugin)

#!/usr/bin/env python3
"""Run isolated PHP tests locally or via SSH stdin; never loads WordPress/database."""
import argparse, base64, pathlib, shutil, subprocess, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser()
p.add_argument('--ssh', default=None, help='SSH target when local PHP is unavailable')
a = p.parse_args()
bundle = {}
for path in (ROOT / 'wordpress/meister-product-translations').glob('*.php'):
    bundle[path.name] = base64.b64encode(path.read_bytes()).decode()
fixture = base64.b64encode((ROOT / 'wordpress/fixtures/product-translations-canonical.json').read_bytes()).decode()
payload = '<?php\n$bundle=json_decode(base64_decode("' + base64.b64encode(__import__('json').dumps(bundle).encode()).decode() + '"),true);\n$fixtures=json_decode(base64_decode("' + fixture + '"),true);\n' + (ROOT / 'tests/product-translations-php.test.php').read_text().removeprefix('<?php')
command = ['ssh','-o','BatchMode=yes',a.ssh,'php'] if a.ssh else ['php']
if not a.ssh and not shutil.which('php'):
    sys.exit('No local php; pass --ssh pi@100.101.255.74 (stdin only; no remote files).')
result = subprocess.run(command, input=payload, text=True)
if result.returncode:
    sys.exit(result.returncode)
bootstrap = payload[:payload.index('error_reporting(E_ALL);')] + (ROOT / 'tests/product-translations-php-bootstrap.test.php').read_text().removeprefix('<?php')
result = subprocess.run(command, input=bootstrap, text=True, capture_output=True)
print(result.stdout, end='')
print(result.stderr, end='', file=sys.stderr)
sys.exit(result.returncode or (0 if 'PASS early WP CLI' in result.stdout else 1))

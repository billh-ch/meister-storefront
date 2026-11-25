#!/usr/bin/env python3
"""Run the add-ons plugin PHP tests locally or via SSH stdin; never loads WordPress or a database.

    python3 tests/product-addons-php-run.py                       # local php
    python3 tests/product-addons-php-run.py --ssh user@host [-i key]  # remote php, stdin only, no files written
"""
import argparse, base64, json, pathlib, shutil, subprocess, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser()
p.add_argument('--ssh', default=None, help='SSH target when local PHP is unavailable')
p.add_argument('-i', dest='identity', default=None, help='SSH identity file')
a = p.parse_args()
bundle = {path.name: base64.b64encode(path.read_bytes()).decode() for path in (ROOT / 'wordpress/meister-product-addons').glob('*.php')}
fixture = (ROOT / 'wordpress/fixtures/product-addons-contract.json').read_text()
payload = ('<?php\n$bundle=json_decode(base64_decode("' + base64.b64encode(json.dumps(bundle).encode()).decode() + '"),true);\n'
           '$fixture=json_decode(base64_decode("' + base64.b64encode(fixture.encode()).decode() + '"),true);\n'
           + (ROOT / 'tests/product-addons-php.test.php').read_text().removeprefix('<?php'))
if a.ssh:
    command = ['ssh', '-o', 'BatchMode=yes'] + (['-i', a.identity] if a.identity else []) + [a.ssh, 'php']
elif shutil.which('php'):
    command = ['php']
else:
    sys.exit('No local php; pass --ssh user@host (stdin only; no remote files).')
result = subprocess.run(command, input=payload, text=True, capture_output=True)
print(result.stdout, end=''); print(result.stderr, end='', file=sys.stderr)
sys.exit(result.returncode or (0 if 'PHP checks passed' in result.stdout else 1))

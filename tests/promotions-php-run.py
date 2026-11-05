#!/usr/bin/env python3
"""Run real PHP promotion tests, using local PHP or the managed Docker daemon."""
import pathlib,shutil,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[1]
php=shutil.which('php')
command=[php] if php else ['docker','run','--rm','-v',str(root)+':/app:ro','-w','/app','php:8.3-cli','php']
for file in sorted((root/'wordpress/meister-promotions').glob('*.php')):
    subprocess.run(command+['-l',str(file) if php else '/app/'+str(file.relative_to(root))],check=True)
subprocess.run(command+['tests/promotions-engine.php'],cwd=root,check=True)

#!/usr/bin/env python3
"""Deterministic promotions ZIP with an explicit production-only allowlist."""
import argparse,hashlib,pathlib,zipfile
ROOT=pathlib.Path(__file__).resolve().parent
FILES=('admin.php','api.php','attempts.php','cart.php','cli.php','engine.php','meister-promotions.php','newsletter.php','readme.txt','store.php')
def build(output):
    source=ROOT/'meister-promotions';output=pathlib.Path(output)
    if sorted(p.name for p in source.iterdir())!=sorted(FILES):raise ValueError('Unexpected plugin files: review the packaging allowlist')
    output.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_STORED) as archive:
        for name in sorted(FILES):
            p=source/name
            if p.is_symlink() or not p.is_file():raise ValueError('Regular source files required')
            info=zipfile.ZipInfo('meister-promotions/'+name,date_time=(2020,1,1,0,0,0));info.create_system=3;info.external_attr=0o100644<<16;info.compress_type=zipfile.ZIP_STORED
            archive.writestr(info,p.read_bytes())
    print(hashlib.sha256(output.read_bytes()).hexdigest()+'  '+str(output))
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',default=str(ROOT/'dist/meister-promotions-1.0.0.zip'));build(parser.parse_args().output)

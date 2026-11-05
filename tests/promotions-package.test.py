#!/usr/bin/env python3
import importlib.util,pathlib,tempfile,zipfile,sys
sys.dont_write_bytecode=True
root=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('promotions_zip',root/'wordpress/build-promotions-zip.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
with tempfile.TemporaryDirectory() as directory:
    a=pathlib.Path(directory)/'a.zip';b=pathlib.Path(directory)/'b.zip';module.build(a);module.build(b)
    assert a.read_bytes()==b.read_bytes(),'Builds must be byte identical'
    with zipfile.ZipFile(a) as archive:
        assert set(archive.namelist())=={'meister-promotions/'+name for name in module.FILES}
        assert all(not n.endswith(('.json','.env','.pem')) and '..' not in n for n in archive.namelist())
print('Promotion package reproducible; production files only.')

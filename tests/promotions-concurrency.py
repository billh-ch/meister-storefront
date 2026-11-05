#!/usr/bin/env python3
"""Independent PHP processes contend for native Woo coupon AND stock capacity."""
import concurrent.futures,json,subprocess
prefix=['docker','exec','meister-promotions-wp','wp']
def run(key):
    p=subprocess.run(prefix+['eval-file','/code/tests/helpers/promotions-concurrent-worker.php',key],capture_output=True,text=True,check=True)
    return json.loads(p.stdout[p.stdout.index('{'):])
for kind in ['coupon','email','stock','both']:
    subprocess.run(prefix+['eval-file','/code/tests/helpers/promotions-concurrent-seed.php',kind],check=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(run,['a','b']))
    assert sum(r['ok'] for r in results)==1,(kind,results)
    winner=next(i for i,r in enumerate(results) if r['ok'])
    again=run(['a','b'][winner]);assert again['orderId']==results[winner]['orderId'],(again,results)
    print('PASS simultaneous '+kind+' reservation; retry reuses winner order.')

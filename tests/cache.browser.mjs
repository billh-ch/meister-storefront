import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { openSync, closeSync } from 'node:fs'
import { createHmac } from 'node:crypto'
import { chromium } from 'playwright'
const baseline = process.env.CACHE_BASELINE === 'true'
let price = '80', deleted = false, count = 0, variable = false
const product = () => ({ id: 501, slug: encodeURIComponent('πέδιλα'), name: 'Cache Fins', price, regular_price: price, sale_price: '', price_html: price, type: variable ? 'variable' : 'simple', status: 'publish', on_sale: false, stock_status: 'instock', stock_quantity: 5, images: [], categories: [{id:86,name:'Πέδιλα',slug:'πέδιλα'}], attributes: variable ? [{name:'Size',options:['M'],variation:true,visible:true}] : [], description: '<p>Cache description.</p>', short_description:'',sku:'CACHE-501' })
const backend = createServer((request, response) => {
 count++; response.setHeader('Content-Type','application/json'); response.setHeader('X-WP-TotalPages','1')
 const url = new URL(request.url,'http://localhost')
 if(url.pathname === '/wp-json/wc/v3/products/501/variations') response.end(JSON.stringify([{id:601,price,regular_price:price,on_sale:false,stock_status:'instock',attributes:[{name:'Size',option:'M'}]}]))
 else if(url.pathname === '/wp-json/wc/v3/products') response.end(JSON.stringify(deleted ? [] : [product()]))
 else if(url.pathname === '/wp-json/wc/v3/products/501') {response.statusCode=deleted?404:200;response.end(JSON.stringify(deleted?{}:product()))}
 else {response.statusCode=404;response.end('{}')}
})
backend.listen(0,'127.0.0.1'); await once(backend,'listening')
const base = 'http://127.0.0.1:3003', secret = 'local-fixture-webhook-secret-only'
const env = {...process.env, NEXT_PUBLIC_WC_URL:`http://127.0.0.1:${backend.address().port}`, WC_CONSUMER_KEY:'fixture', WC_CONSUMER_SECRET:'fixture', WC_WEBHOOK_SECRET:secret, NEXT_PUBLIC_USE_MOCK_DATA:'false', VERCEL_ENV:'production', NODE_USE_ENV_PROXY:'1', NO_PROXY:`${process.env.NO_PROXY||''},127.0.0.1,localhost`}
let app, browser
async function run(args, logFile) {const log=openSync(logFile,'w'); const child=spawn(process.execPath,['node_modules/next/dist/bin/next',...args],{cwd:new URL('../',import.meta.url),env,stdio:['ignore',log,log]}); child.once('exit',()=>closeSync(log)); return child}
const build = await run(['build'],'/tmp/meister-cache-build.log'); await once(build,'exit'); assert.equal(build.exitCode,0,'Build failed: /tmp/meister-cache-build.log')
try {
 app=await run(['start','--hostname','127.0.0.1','--port','3003'],'/tmp/meister-cache-start.log')
 for(let i=0;i<100;i++){try{if((await fetch(base+'/robots.txt')).ok)break}catch{} await new Promise(r=>setTimeout(r,150))}
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']}); const page=await browser.newPage()
 const path='/products/'+encodeURIComponent('πέδιλα')
 const visit = async () => {const start=performance.now();const response=await page.goto(base+path,{waitUntil:'load'});return {status:response.status(),ms:Math.round(performance.now()-start),schemas:await page.locator('script[type="application/ld+json"]').evaluateAll(nodes=>nodes.flatMap(n=>JSON.parse(n.textContent)))}}
 count=0; const cold=await visit();const coldRequests=count; const warm=await visit();const warmRequests=count-coldRequests
 price='125';const stale=await visit();assert.equal(stale.schemas.find(s=>s['@type']==='Product').offers.price,80)
 console.log(JSON.stringify({baseline,coldMs:cold.ms,warmMs:warm.ms,coldRequests,warmRequests,stalePrice:80}))
 assert.equal(warmRequests,0,'Repeated product visits should reuse the Data Cache')
 if(!baseline){
  const send = async(event='updated',signature=true)=>{const raw=JSON.stringify({id:501,slug:encodeURIComponent('πέδιλα')});return fetch(base+'/api/webhooks/woocommerce',{method:'POST',headers:{'content-type':'application/json','x-wc-webhook-resource':'product','x-wc-webhook-event':event,'x-wc-webhook-signature':signature?createHmac('sha256',secret).update(raw).digest('base64'):'invalid'},body:raw})}
  assert.equal((await send('updated',false)).status,401);assert.equal((await visit()).schemas.find(s=>s['@type']==='Product').offers.price,80)
  variable=true;assert.equal((await send()).status,200); assert.equal((await send()).status,200)
  const fresh=await visit(); assert.equal(fresh.schemas.find(s=>s['@type']==='Product').offers.lowPrice,125)
  await page.goto(base+'/shop');assert.match(await page.locator('body').innerText(),/125/)
  const sitemap=await fetch(base+'/sitemap.xml');assert.equal(sitemap.status,200);assert.equal(sitemap.headers.get('cache-control'),'no-store')
  await page.context().addCookies([{name:'mm_cart',value:Buffer.from(JSON.stringify([{productId:'501',variationId:'601',quantity:1}])).toString('base64url'),url:base}])
  price='130';await page.goto(base+'/cart',{waitUntil:'load'});assert.match(await page.locator('body').innerText(),/130/)
  price='140';await page.goto(base+'/cart',{waitUntil:'load'});assert.match(await page.locator('body').innerText(),/140/)
  console.log('PASS: cart re-resolves current variation prices before webhook delivery')
  await page.context().clearCookies()
  assert.equal((await send()).status,200)
  assert.equal((await visit()).schemas.find(s=>s['@type']==='Product').offers.lowPrice,140)
  deleted=true;assert.equal((await send('deleted')).status,200);assert.equal((await visit()).status,404)
  assert.doesNotMatch(await (await fetch(base+'/sitemap.xml')).text(),/products\//)
  console.log('PASS: invalid signature preserves cache; signed duplicate updates refresh product schema/shop; deletion clears product and sitemap')
 }
} finally {await browser?.close();if(app&&app.exitCode===null){const done=once(app,'exit');app.kill('SIGTERM');await done}backend.close();await once(backend,'close')}

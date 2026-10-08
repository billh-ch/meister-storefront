import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { openSync, closeSync, readFileSync } from 'node:fs'
import { once } from 'node:events'
import { chromium } from 'playwright'

// A local WooCommerce fixture exercises real-data code paths without reading
// store/customer records, changing Vercel configuration or placing orders.
const products = Array.from({ length: 25 }, (_, index) => ({
  id: index + 1, slug: index === 0 ? encodeURIComponent('πέδιλα') : `fins-${index + 1}`,
  name: index === 0 ? 'Πέδιλα Meister' : `Fins ${index + 1}`,
  price: '80', regular_price: '80', sale_price: '', price_html: '80',
  type: 'simple', status: 'publish', on_sale: false, stock_status: 'instock', stock_quantity: 5,
  images: [], categories: [{ id: 86, name: 'Πέδιλα', slug: 'πέδιλα' }], attributes: [],
  description: '<p>&gt;Multiple dive modes<br>&gt;Wide variety of alarms</p>', short_description: '<p>Fins &amp; suits.</p>', sku: `FINS-${index + 1}`,
}))
products[1] = { ...products[1], type: 'variable', price: '60', price_html: '60–95',
  attributes: [{ name: 'Size', options: ['M', 'L'], variation: true, visible: true }] }
const variations = [
  { id: 101, status: 'publish', price: '60', regular_price: '70', on_sale: true, stock_status: 'outofstock', attributes: [{ name: 'Size', option: 'M' }] },
  { id: 102, status: 'publish', price: '95', regular_price: '95', on_sale: false, stock_status: 'onbackorder', attributes: [{ name: 'Size', option: '' }] },
]
variations.push({ id: 103, status: 'private', price: '999', regular_price: '999', on_sale: false, stock_status: 'instock', attributes: [{ name: 'Size', option: 'internal-only' }] })
const backend = createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost')
  const id = url.pathname.match(/^\/wp-json\/wc\/v3\/products\/(\d+)$/)?.[1]
  const product = id ? products.find(product => product.id === Number(id)) : undefined
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('X-WP-TotalPages', '1')
  response.setHeader('X-WP-Total', String(products.length))
  if (url.pathname === '/wp-json/wc/v3/products/2/variations') { response.end(JSON.stringify(variations)) }
  else if (id) {
    response.statusCode = product ? 200 : 404
    response.end(JSON.stringify(product || { message: 'Not found' }))
  } else if (url.pathname === '/wp-json/wc/v3/products') {
    const slug = url.searchParams.get('slug')
    response.end(JSON.stringify(slug ? products.filter(product => decodeURIComponent(product.slug) === slug) : products))
  } else { response.statusCode = 404; response.end('{}') }
})
backend.listen(0, '127.0.0.1')
await once(backend, 'listening')
const fixtureURL = `http://127.0.0.1:${backend.address().port}`
const baseURL = 'http://127.0.0.1:3004'
const canonical = 'https://meister-storefront.vercel.app'
let browser, server, log

async function start(mode) {
  log = openSync(`/tmp/meister-agents-${mode}.log`, 'w')
  const env = { ...process.env, VERCEL_ENV: mode, NEXT_PUBLIC_SITE_URL: canonical, NEXT_PUBLIC_USE_MOCK_DATA: 'false',
    NEXT_PUBLIC_WC_URL: fixtureURL, WC_CONSUMER_KEY: 'fixture-key', WC_CONSUMER_SECRET: 'fixture-secret',
    NODE_USE_ENV_PROXY: '1', NO_PROXY: `${process.env.NO_PROXY || ''},127.0.0.1,localhost` }
  const production = process.env.AGENTS_PRODUCTION === 'true'
  if (production) {
    const buildLog = openSync('/tmp/meister-agents-build.log','w')
    const build = spawn(process.execPath,['node_modules/next/dist/bin/next','build'],{cwd:new URL('../',import.meta.url),env,stdio:['ignore',buildLog,buildLog]})
    try { await once(build,'exit'); assert.equal(build.exitCode,0,'Inspect /tmp/meister-agents-build.log') } finally {closeSync(buildLog)}
    const manifest=JSON.parse(readFileSync(new URL('../.next/routes-manifest.json',import.meta.url),'utf8'))
    for(const path of ['/','/about','/contact','/privacy','/docs','/docs/agents','/docs/mcp','/docs/auth']){
      const header=manifest.headers.find(rule=>rule.source===path)?.headers.find(header=>header.key.toLowerCase()==='vary')
      assert.match(header?.value||'',/\bAccept\b/,'Deployment routing manifest must retain Accept for static HTML')
      assert.match(header.value,/\brsc\b/i,'Keep the framework cache variations')
    }
  }
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', production ? 'start' : 'dev', '--hostname', '127.0.0.1', '--port', '3004'], {
    cwd: new URL('../', import.meta.url), stdio: ['ignore', log, log], env,
  })
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error(`Next exited; inspect /tmp/meister-agents-${mode}.log`)
    try { if ((await fetch(`${baseURL}/robots.txt`, { signal: AbortSignal.timeout(1500) })).ok) return } catch { /* Server is starting. */ }
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  throw new Error(`Next did not start; inspect /tmp/meister-agents-${mode}.log`)
}
async function stop() {
  if (server && server.exitCode === null) { const exited = once(server, 'exit'); server.kill('SIGTERM'); await exited }
  if (log !== undefined) closeSync(log)
  server = undefined; log = undefined
}
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false })
  await start('production')
  const html = await fetch(baseURL+'/',{headers:{accept:'text/html'}})
  assert.equal(html.status,200);assert.match(html.headers.get('content-type'),/text\/html/);assert.match(html.headers.get('vary'),/accept/i)
  const raw=await html.text()
  const { parseDocument, DomUtils } = await import('htmlparser2')
  const document=parseDocument(raw)
  for(const node of DomUtils.findAll(n=>['script','style'].includes(n.name),document.children))DomUtils.removeElement(node)
  const meaningful=DomUtils.textContent(document).replace(/\s+/g,' ').trim()
  const ratio=meaningful.length/DomUtils.getOuterHTML(document).length
  assert.ok(meaningful.length>=500);assert.ok(ratio>=0.05)
  console.log(JSON.stringify({meaningfulHomepageChars:meaningful.length,contentRatioWithoutScripts:Math.round(ratio*10000)/100}))
  await page.goto(baseURL+'/',{waitUntil:'load'})
  assert.equal(await page.locator('h1').count(),1)
  const headings=await page.locator('h1,h2,h3,h4,h5,h6').evaluateAll(nodes=>nodes.map(n=>Number(n.tagName[1])))
  for(let i=1;i<headings.length;i++)assert.ok(headings[i]<=headings[i-1]+1,'Heading sequence must not skip levels')
  assert.ok(await page.locator('a[href="/docs"]').count())
  const identities=await page.locator('script[type="application/ld+json"]').evaluateAll(nodes=>nodes.flatMap(n=>JSON.parse(n.textContent)))
  assert.ok(identities.some(value=>value['@type']==='Organization'&&value.name==='Meister'))
  const organization=identities.find(value=>value['@type']==='Organization')
  assert.equal(organization.contactPoint.email,'info@dive-meister.com');assert.equal(organization.contactPoint.telephone,'+302105317549');assert.equal(organization.address.postalCode,'12243')
  assert.ok(await page.locator('footer a[href="mailto:info@dive-meister.com"]').count());assert.ok(await page.locator('footer a[href="tel:+302105317549"]').count())
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false)
  const markdown=await fetch(baseURL+'/',{headers:{accept:'text/markdown'}})
  assert.equal(markdown.status,200);assert.match(markdown.headers.get('content-type'),/^text\/markdown/);assert.match(markdown.headers.get('vary'),/accept/i);assert.match(await markdown.text(),/^# Meister/)
  const htmlAgain=await fetch(baseURL+'/',{headers:{accept:'text/html'}});assert.match(htmlAgain.headers.get('content-type'),/text\/html/)
  for(const path of ['/__ora-404-regression','/products/missing']){
    const md=await fetch(baseURL+path,{headers:{accept:'text/markdown'}});assert.equal(md.status,404);assert.match(md.headers.get('content-type'),/^text\/markdown/);assert.match(await md.text(),/\[Meister documentation\]/)
    assert.equal((await fetch(baseURL+path,{headers:{accept:'text/html'}})).status,404)
  }
  for(const path of ['/about','/contact','/privacy','/docs','/docs/agents','/docs/mcp','/docs/auth']){
    await page.goto(baseURL+path,{waitUntil:'load'});assert.ok((await page.locator('article').innerText()).length>=500)
    const response=await fetch(baseURL+path,{headers:{accept:'text/markdown'}});assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/^text\/markdown/);assert.ok((await response.text()).length>=500)
  }
  for(const path of ['/shop','/fins','/products/'+products[0].slug]){
    const response=await fetch(baseURL+path,{headers:{accept:'text/markdown'}});assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/^text\/markdown/);assert.ok((await response.text()).length>100)
  }
  const asset=await fetch(baseURL+'/window.svg',{headers:{accept:'text/markdown'}});assert.equal(asset.status,200);assert.match(asset.headers.get('content-type'),/image\/svg/);assert.match(await asset.text(),/<svg/)
  const discovery=await fetch(baseURL+'/llms.txt');assert.equal(discovery.status,200);assert.match(discovery.headers.get('content-type'),/text\/plain/);const llms=await discovery.text();assert.match(llms,/^# Meister/);assert.match(llms,/## When to use/)
  for(const [,href] of llms.matchAll(/\]\((https:\/\/[^)]+)\)/g)){
    const url=new URL(href);assert.equal(url.origin,canonical)
    const response=await fetch(baseURL+url.pathname)
    assert.equal(response.status,url.pathname==='/.well-known/mcp'?405:200,'Published llms link: '+url.pathname)
  }
  const {Client}=await import('@modelcontextprotocol/sdk/client/index.js')
  const {StreamableHTTPClientTransport}=await import('@modelcontextprotocol/sdk/client/streamableHttp.js')
  const client=new Client({name:'endpoint-regression',version:'1.0.0'})
  try{
    await client.connect(new StreamableHTTPClientTransport(new URL(baseURL+'/.well-known/mcp')))
    const tools=await client.listTools();assert.deepEqual(tools.tools.map(t=>t.name),['search_products','get_product'])
    const result=await client.callTool({name:'search_products',arguments:{query:'Fins',limit:1}});assert.equal(result.isError,undefined)
    const detail=await client.callTool({name:'get_product',arguments:{slug:products[0].slug}});assert.equal(detail.isError,undefined);assert.match(detail.content[0].text,/Πέδιλα Meister/)
    const variable=await client.callTool({name:'get_product',arguments:{slug:'fins-2'}});assert.doesNotMatch(variable.content[0].text,/internal-only|999/);assert.deepEqual(JSON.parse(variable.content[0].text).product.variants.map(variant=>variant.id),['101','102'])
    const variantMarkdown=await fetch(baseURL+'/products/fins-2',{headers:{accept:'text/markdown'}});assert.doesNotMatch(await variantMarkdown.text(),/internal-only|999/)
  }finally{await client.close()}
  const origin=await fetch(baseURL+'/.well-known/mcp',{headers:{origin:'https://evil.example'}});assert.equal(origin.status,403)
  assert.match((await fetch(baseURL+'/cart',{headers:{accept:'text/markdown'}})).headers.get('content-type'),/text\/html/)
  const account=await fetch(baseURL+'/account',{headers:{accept:'text/markdown'},redirect:'manual'});assert.ok([302,307].includes(account.status));assert.match(account.headers.get('location'),/sign-in/)
  console.log('PASS: every public info/discovery endpoint, HTML/Markdown negotiation and 404, no-JS content/headings, schema, MCP handshake/tools and private-route boundaries')
} finally {
  await browser?.close()
  await stop()
  backend.close()
  await once(backend,'close')
}

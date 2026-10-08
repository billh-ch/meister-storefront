import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
const { fetchProductById } = await import('../lib/woocommerce/queries/get-product-by-id.ts')
const { fetchVariations } = await import('../lib/woocommerce/queries/get-product-by-slug.ts')
const { wcFetch } = await import('../lib/woocommerce/client.ts')
test('cart price/stock lookups and private API responses explicitly bypass shared caches',async()=>{
 const originalFetch=globalThis.fetch
 const saved=Object.fromEntries(['NEXT_PUBLIC_WC_URL','WC_CONSUMER_KEY','WC_CONSUMER_SECRET'].map(key=>[key,process.env[key]]))
 const calls=[]
 try{
  process.env.NEXT_PUBLIC_WC_URL='https://fixture.example';process.env.WC_CONSUMER_KEY='fixture';process.env.WC_CONSUMER_SECRET='fixture'
  globalThis.fetch=async(url,init)=>{calls.push({url,init});return Response.json(url.includes('variations')?[]:{id:501})}
  await fetchProductById('501');await fetchVariations(501,{fresh:true});await wcFetch('/customers/1')
  for(const call of calls)assert.equal(call.init.cache,'no-store')
  await fetchVariations(501)
  assert.equal(calls.at(-1).init.next.revalidate,30)
  assert.ok(calls.at(-1).init.next.tags.includes('product:501'))
 }finally{globalThis.fetch=originalFetch;for(const[key,value]of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value}}
})
test('sitemap does not retain an independent CDN copy after catalog invalidation',async()=>{
 const { sitemapResponse } = await import('../lib/seo/sitemap.ts')
 const response=await sitemapResponse(async()=>[{id:'501',slug:'fins'}],['fins'],{VERCEL_ENV:'production',NEXT_PUBLIC_USE_MOCK_DATA:'false'})
 assert.equal(response.status,200)
 assert.equal(response.headers.get('cache-control'),'no-store')
})

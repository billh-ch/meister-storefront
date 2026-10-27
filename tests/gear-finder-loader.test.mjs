import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { PRODUCTS } from '../lib/gear-finder/reference.ts'
const { loadGearCatalogue } = await import('../lib/gear-finder/load-catalogue.ts')
const raw={id:4781,slug:new URL(PRODUCTS[0].url).pathname.split('/').filter(Boolean).at(-1),name:'Wetsuit',price:'300',regular_price:'300',sale_price:'',on_sale:false,stock_status:'instock',price_html:'',images:[],categories:[{id:17}],attributes:[],type:'simple',status:'publish'}
async function withFetch(fetcher,fn){
 const keys=['NEXT_PUBLIC_WC_URL','WC_CONSUMER_KEY','WC_CONSUMER_SECRET'],saved=Object.fromEntries(keys.map(k=>[k,process.env[k]])),original=globalThis.fetch
 Object.assign(process.env,{NEXT_PUBLIC_WC_URL:'https://catalogue.example',WC_CONSUMER_KEY:'fixture',WC_CONSUMER_SECRET:'fixture'})
 globalThis.fetch=fetcher
 try{await fn()}finally{globalThis.fetch=original;for(const k of keys)if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k]}
}
test('guide catalogue bypasses stale-on-error data after a successful load and reports the outage',async()=>{
 let offline=false, cacheMode
 await withFetch(async(url,init)=>{
  cacheMode=init.cache
  return offline?new Response('{}',{status:503}):Response.json([raw],{headers:{'x-wp-totalpages':'1'}})
 },async()=>{
  assert.equal((await loadGearCatalogue('en'))?.suits.length,1)
  assert.equal(cacheMode,'no-store','strict guide must bypass stale-on-error data')
  offline=true
  assert.equal(await loadGearCatalogue('en'),null)
 })
})
test('unknown upstream stock status remains unavailable through the actual server mapper',async()=>{
 await withFetch(async()=>Response.json([{...raw,stock_status:'unrecognized'}]),async()=>{
  const catalogue=await loadGearCatalogue('en')
  assert.equal(catalogue.suits[0].stock,'out')
 })
})

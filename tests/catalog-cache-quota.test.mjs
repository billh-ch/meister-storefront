import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import createAdapter from '@vinext/cloudflare/cache/kv-data-adapter.runtime'
import {catalogCacheOptions} from '../lib/cache/catalog-policy.ts'

test('a failed KV refresh cannot keep an old public catalog entry for an hour',async()=>{
 const originalNow=Date.now;let now=originalNow(),writeQuota=false
 const entries=new Map()
 const get=key=>{const item=entries.get(key);return item&&item.expires>now?item.value:null}
 const kv={
  get:async key=>Array.isArray(key)?new Map(key.map(k=>[k,get(k)])):get(key),
  put:async(key,value,options)=>{if(writeQuota)throw Error('KV write quota exceeded');entries.set(key,{value,expires:now+(options?.expirationTtl??86400)*1000})},
  delete:async key=>entries.delete(key),
 }
 try {
  Date.now=()=>now
  const adapter=createAdapter({env:{VINEXT_KV_CACHE:kv},options:catalogCacheOptions})
  const value={kind:'FETCH',data:{headers:{},body:'W10=',status:200,url:'https://store.test/products'},revalidate:60}
  await adapter.set('catalog',value,{tags:['products'],revalidate:60})
  assert.ok(await adapter.get('catalog'))
  writeQuota=true
  await assert.rejects(adapter.set('catalog',value,{tags:['products'],revalidate:60}),/quota/)
  now+=180000
  assert.equal(await adapter.get('catalog'),null,'Stale data must physically expire despite rejected refresh writes')
 }finally{Date.now=originalNow}
})

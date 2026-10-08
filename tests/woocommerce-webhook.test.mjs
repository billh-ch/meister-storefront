import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
const signatureHelpers = await import('../lib/woocommerce/webhook-signature.ts').catch(()=>({}))
const handler = await import('../lib/woocommerce/product-webhook.ts').catch(()=>({}))
const secret = 'fixture-only-secret'
const sign = raw => createHmac('sha256',secret).update(raw).digest('base64')
const request = (raw, headers={}) => new Request('https://example.com/api/webhooks/woocommerce',{method:'POST',headers:{'content-type':'application/json','x-wc-webhook-resource':'product','x-wc-webhook-event':'updated','x-wc-webhook-signature':sign(raw),...headers},body:raw})
test('signature authenticates exact raw bytes and rejects missing/malformed/wrong secrets',()=>{
 assert.equal(typeof signatureHelpers.verifyWooCommerceWebhook,'function')
 const raw=Buffer.from('{ "id": 501 }\n')
 assert.equal(signatureHelpers.verifyWooCommerceWebhook(raw,sign(raw),secret),true)
 for(const signature of ['', 'invalid', sign(raw)+'=', sign(Buffer.from('{"id":501}'))]) assert.equal(signatureHelpers.verifyWooCommerceWebhook(raw,signature,secret),false)
 assert.equal(signatureHelpers.verifyWooCommerceWebhook(raw,sign(raw),''),false)
 assert.equal(signatureHelpers.verifyWooCommerceWebhook(raw,sign(raw),'wrong'),false)
})
test('signed update/delete retries expire catalog and numeric parent tags without storing payloads',async()=>{
 const tags=[]; const dependencies={secret,invalidate:tag=>tags.push(tag)}
 for(const event of ['updated','updated','deleted']) {
  assert.equal((await handler.handleProductWebhook(request(JSON.stringify({id:601,parent_id:501}),{'x-wc-webhook-event':event}),dependencies)).status,200)
 }
 assert.deepEqual(tags,['products','product:501','products','product:501','products','product:501'])
})
test('invalid signatures, malformed IDs and unsupported resources never invalidate',async()=>{
 const tags=[];const dependencies={secret,invalidate:tag=>tags.push(tag)}
 for(const [raw,headers,status] of [
  ['{"id":501}',{'x-wc-webhook-signature':'wrong'},401], ['{"id":"501"}',{},400],
  ['{"id":-1}',{},400], ['{"id":501}',{'x-wc-webhook-resource':'customer'},400],
  ['{"id":501}',{'x-wc-webhook-event':'unknown'},400], ['{bad',{},400],
 ]) assert.equal((await handler.handleProductWebhook(request(raw,headers),dependencies)).status,status)
 assert.equal((await handler.handleProductWebhook(request('{"id":501}'),{...dependencies,secret:''})).status,503)
 assert.deepEqual(tags,[])
})
test('oversized bodies are rejected even without Content-Length; activation ping cannot invalidate',async()=>{
 const tags=[]; const dependencies={secret,invalidate:tag=>tags.push(tag)}
 const huge=JSON.stringify({id:501,description:'x'.repeat(262144)})
 assert.equal((await handler.handleProductWebhook(request(huge),dependencies)).status,413)
 const ping=new Request('https://example.com/api/webhooks/woocommerce',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:'webhook_id=12'})
 assert.equal((await handler.handleProductWebhook(ping,dependencies)).status,200)
 assert.deepEqual(tags,[])
})

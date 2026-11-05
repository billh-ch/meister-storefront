import './helpers/typescript-imports.mjs'
import { registerHooks } from 'node:module'
import test from 'node:test'
import assert from 'node:assert/strict'
const boundary={
 '@/lib/cart/cookie':'export const getCart=async()=>[{productId:"1",quantity:2}]',
 '@/lib/stripe':'export const getStripe=()=>globalThis.promoFlow.stripe',
 '@/lib/url':'export const getBaseUrl=()=>"https://shop.fixture.example"',
}
registerHooks({resolve(specifier,context,next){
 let source=boundary[specifier]
 if(context.parentURL?.endsWith('/lib/promotions/checkout.ts')){
  if(specifier==='./session')source='export const ensurePromotionSession=async()=>globalThis.promoFlow.session;export const promotionCartKey=()=>"cart-key"'
  if(specifier==='./quote')source='export const promotionAddress=a=>({country:a.country,state:"",city:a.city,postcode:a.postcode,address_1:a.address1,address_2:a.address2??""});export const getPromotionQuoteInput=async()=>({items:[{productId:1,quantity:2,attributes:{}}],email:"buyer@fixture.invalid",customerId:0,coupon:"save"})'
  if(specifier==='./client')source='export const promotionsEnabled=()=>true;export const promotionHealth=async()=>globalThis.promoFlow.health;export const preparePromotion=async r=>globalThis.promoFlow.prepare(r);export const promotionBackend=async(p,b)=>globalThis.promoFlow.backend(p,b);export const readPromotionQuote=async()=>globalThis.promoFlow.attempt.quote'
 }
 return source?{url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true}:next(specifier,context)
}})
const {createPromotionsCheckout}=await import('../lib/promotions/checkout.ts')
const address={firstName:'Buyer',lastName:'Fixture',email:'buyer@fixture.invalid',country:'GR',city:'Athens',postcode:'10000',address1:'Fixture',phone:'1234567890'}
const input={address,reference:'11111111-1111-4111-8111-111111111111',expectedTotal:8300,deliveryMethodId:'flat_rate:1',locale:'en'}
async function fixture(run){
 const previous={...process.env};Object.assign(process.env,{STRIPE_EXPECTED_MODE:'test',STRIPE_CHECKOUT_ORIGIN:'https://shop.fixture.example',PROMOTIONS_STRIPE_ISOLATED:'true'});delete process.env.CHECKOUT_PAYMENTS_ENABLED
 const q={version:1,currency:'EUR',minorUnit:2,backendId:'backend',reference:input.reference,expiresAt:Math.floor(Date.now()/1000)+300,subtotal:10000,discount:2000,shipping:300,tax:0,total:8300,shippingId:'flat_rate:1',provisional:false,promotion:{type:'coupon',id:'1',label:'save',code:'save',version:'1',campaign:'',influencer:''},coupon:{code:'save',status:'applied'},methods:[{id:'flat_rate:1',wcMethodId:'flat_rate',title:'Courier',cost:300,isPickup:false}],lines:[{key:'a',productId:1,variationId:0,quantity:2,name:'Suit',subtotal:10000,total:8000}]}
 const a={attemptId:'a'.repeat(64),orderId:42,number:'42',quote:q,origin:'https://shop.fixture.example',locale:'en',mode:'test',state:'prepared',sessionId:'',expiresAt:Math.floor(Date.now()/1000)+3600,createdAt:Math.floor(Date.now()/1000),email:'buyer@fixture.invalid'}
 const sessions=new Map();const f={attempt:a,sessions,creates:[],events:[],session:{owner:'owner-111111111111',code:'save',save:async()=>{}},health:{backendId:'backend',health:{activated:true,transactionalTables:true,reconciledAt:Date.now()/1000}},prepare:async()=>a,backend:async(p,b)=>{if(p==='bind'){a.sessionId=b.sessionId;a.state='open'}if(p==='event')f.events.push(b);return{}},stripe:{checkout:{sessions:{create:async(params,options)=>{if(!sessions.has(options.idempotencyKey)){f.creates.push(params);sessions.set(options.idempotencyKey,{id:'cs_test_example',url:'https://checkout.stripe.com/test',livemode:false,status:'open',currency:'eur',amount_total:q.total,payment_status:'unpaid',payment_intent:null,metadata:params.metadata,expires_at:params.expires_at})}return sessions.get(options.idempotencyKey)},retrieve:async()=>[...sessions.values()][0]}}}}
 globalThis.promoFlow=f
 try{await run(f)}finally{for(const key of Object.keys(process.env))if(!(key in previous))delete process.env[key];Object.assign(process.env,previous);delete globalThis.promoFlow}
}
test('server snapshot charges merchandise discount plus unchanged delivery and no address metadata',()=>fixture(async f=>{
 assert.deepEqual(await createPromotionsCheckout(input),{url:'https://checkout.stripe.com/test'})
 const params=f.creates[0];assert.equal(params.line_items.reduce((s,l)=>s+l.quantity*l.price_data.unit_amount,0),8300);assert.equal(params.line_items.at(-1).price_data.unit_amount,300)
 assert.deepEqual(Object.keys(params.metadata).sort(),['attemptId','backendId','orderId','protocol','storefrontOrigin']);assert.equal(params.customer_email,'buyer@fixture.invalid')
 await createPromotionsCheckout(input);assert.equal(f.creates.length,1,'repeat preparation reuses bound session')
}))
test('ambiguous session creation retries with same Stripe idempotency key',()=>fixture(async f=>{
 const original=f.backend;let failed=false;f.backend=async(p,b)=>{if(p==='bind'&&!failed){failed=true;throw new Error('Lost bind')}return original(p,b)}
 await assert.rejects(createPromotionsCheckout(input));await createPromotionsCheckout(input);assert.equal(f.creates.length,1)
}))
test('changed total never produces a hosted payment',()=>fixture(async f=>{
 await assert.rejects(createPromotionsCheckout({...input,expectedTotal:8299}));assert.equal(f.creates.length,0)
}))
test('zero-payable order completes without pretending to create a Stripe charge',()=>fixture(async f=>{
 Object.assign(f.attempt.quote,{discount:10000,total:0,shipping:0,shippingId:''});f.attempt.quote.lines[0].total=0;f.attempt.quote.methods=[]
 const result=await createPromotionsCheckout({...input,expectedTotal:0,deliveryMethodId:'no_shipping'})
 assert.match(result.url,/attempt=aaaa/);assert.equal(f.creates.length,0);assert.equal(f.events[0].paymentStatus,'no_payment_required');assert.equal(f.events[0].amount,0)
}))
test('authoritatively expired attempt rotates checkout generation for an unchanged purchase',()=>fixture(async f=>{
 let oldKey;const original=f.attempt;f.prepare=async r=>{if(!oldKey)oldKey=r.attemptKey;return r.attemptKey===oldKey?{...original,state:'expired'}:{...original,attemptId:'b'.repeat(64)}}
 await createPromotionsCheckout(input);assert.equal(f.creates[0].metadata.attemptId,'b'.repeat(64))
}))
test('a browser delivery identifier cannot bypass canonical BOX NOW locker validation',()=>fixture(async f=>{
 f.attempt.quote.shippingId='box_now_delivery:7';f.attempt.quote.methods=[{id:'box_now_delivery:7',wcMethodId:'box_now_delivery',title:'BOX NOW',cost:300,isPickup:false}]
 await assert.rejects(createPromotionsCheckout(input));assert.equal(f.creates.length,0)
}))

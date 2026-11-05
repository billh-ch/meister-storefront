import './helpers/typescript-imports.mjs'
import { registerHooks } from 'node:module'
import test from 'node:test'
import assert from 'node:assert/strict'
registerHooks({resolve(s,c,next){let source
 if(s==='@/lib/stripe')source='export const getStripe=()=>globalThis.promoRunner.stripe'
 if(c.parentURL?.endsWith('/lib/promotions/reconcile.ts')&&s==='./client')source='export const promotionBackend=async(p,b)=>globalThis.promoRunner.backend(p,b)'
 return source?{url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true}:next(s,c)
}})
const {reconcilePromotions}=await import('../lib/promotions/reconcile.ts')
function attempt(id,extra={}){return{attemptId:id.repeat(64),email:'fixture@example.invalid',orderId:1,number:'1',origin:'https://shop.fixture.example',locale:'en',mode:'test',state:'open',sessionId:'cs_test_'+id,expiresAt:Math.floor(Date.now()/1000)+3600,createdAt:Math.floor(Date.now()/1000),quote:{version:1,currency:'EUR',minorUnit:2,backendId:'backend',reference:'11111111-1111-4111-8111-111111111111',expiresAt:2000000000,subtotal:100,discount:0,shipping:0,total:100,tax:0,shippingId:'',provisional:false,promotion:null,coupon:{code:'',status:'none'},methods:[],lines:[{key:'x',productId:1,variationId:0,quantity:1,name:'Fixture',subtotal:100,total:100}]},...extra}}
function session(a,extra={}){return{id:a.sessionId||'cs_test_recovered',status:'complete',payment_status:'paid',amount_total:100,currency:'eur',payment_intent:'pi_fixture',livemode:false,metadata:{protocol:'meister_promotions_v1',backendId:'backend',storefrontOrigin:a.origin,attemptId:a.attemptId},...extra}}
async function fixture(attempts,run){const old={...process.env};Object.assign(process.env,{PROMOTIONS_BACKEND_ID:'backend',STRIPE_CHECKOUT_ORIGIN:'https://shop.fixture.example',STRIPE_EXPECTED_MODE:'test'});const state={events:[],heartbeats:[],backend:async(p,b)=>{if(p==='pending')return attempts;if(p==='event')state.events.push(b);if(p==='heartbeat')state.heartbeats.push(b);return{}},stripe:{checkout:{sessions:{}},paymentIntents:{retrieve:async()=>({status:'processing'})}}};globalThis.promoRunner=state;try{await run(state)}finally{for(const k of Object.keys(process.env))if(!(k in old))delete process.env[k];Object.assign(process.env,old);delete globalThis.promoRunner}}
test('one broken attempt does not prevent a later paid order being reconciled',()=>fixture([attempt('a'),attempt('b')],async f=>{
 f.stripe.checkout.sessions.retrieve=async id=>{if(id==='cs_test_a')throw new Error('Unavailable');return session(attempt('b'))}
 await assert.rejects(reconcilePromotions());assert.equal(f.events.length,1);assert.equal(f.events[0].attemptId,'b'.repeat(64));assert.equal(f.heartbeats[0].healthy,false)
}))
test('runner releases processing holds after a missed authoritative async failure',()=>fixture([attempt('a',{state:'processing'})],async f=>{
 f.stripe.checkout.sessions.retrieve=async()=>session(attempt('a'),{payment_status:'unpaid'});f.stripe.paymentIntents.retrieve=async()=>({status:'requires_payment_method'})
 await reconcilePromotions();assert.equal(f.events[0].state,'failed');assert.equal(f.events[0].terminalConfirmed,true)
}))
test('lost-bind recovery searches the full possible session creation window',()=>{const created=Math.floor(Date.now()/1000)-7200;const a=attempt('a',{sessionId:'',createdAt:created,expiresAt:created+3600});return fixture([a],async f=>{
 f.stripe.checkout.sessions.list=async request=>({has_more:false,data:request.created.lte>=created+1805?[session(a)]:[]})
 await reconcilePromotions();assert.equal(f.events[0].state,'paid')
})})

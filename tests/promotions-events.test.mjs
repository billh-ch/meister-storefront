import test from 'node:test'
import assert from 'node:assert/strict'
import './helpers/typescript-imports.mjs'
const { promotionEventFacts } = await import('../lib/promotions/events.ts')
const session={id:'cs_test_example',livemode:false,currency:'eur',amount_total:900,payment_status:'paid',status:'complete',payment_intent:'pi_example',metadata:{protocol:'meister_promotions_v1',backendId:'backend',attemptId:'a'.repeat(64),storefrontOrigin:'https://shop.example'}}
test('verified promotion session produces exact backend facts',()=>{
 const value=promotionEventFacts('checkout.session.completed',session,{backendId:'backend',origin:'https://shop.example',mode:'test'})
 assert.equal(value.state,'paid');assert.equal(value.amount,900);assert.equal(value.paymentIntent,'pi_example')
})
test('foreign protocols environments origins and backends never complete our order',()=>{
 for(const changes of [{livemode:true},{metadata:{...session.metadata,backendId:'other'}},{metadata:{...session.metadata,storefrontOrigin:'https://other.example'}}])assert.throws(()=>promotionEventFacts('checkout.session.completed',{...session,...changes},{backendId:'backend',origin:'https://shop.example',mode:'test'}))
 assert.equal(promotionEventFacts('checkout.session.completed',{...session,metadata:{}},{backendId:'backend',origin:'https://shop.example',mode:'test'}),null)
})
test('unpaid completion remains processing while asynchronous success completes it',()=>{
 assert.equal(promotionEventFacts('checkout.session.completed',{...session,payment_status:'unpaid'},{backendId:'backend',origin:'https://shop.example',mode:'test'}).state,'processing')
 assert.equal(promotionEventFacts('checkout.session.async_payment_succeeded',session,{backendId:'backend',origin:'https://shop.example',mode:'test'}).state,'paid')
})
test('expiry must actually be terminal and zero-payment success needs no PaymentIntent',()=>{
 assert.throws(()=>promotionEventFacts('checkout.session.expired',{...session,status:'open',payment_status:'unpaid'},{backendId:'backend',origin:'https://shop.example',mode:'test'}))
 assert.equal(promotionEventFacts('checkout.session.completed',{...session,amount_total:0,payment_intent:null,payment_status:'no_payment_required'},{backendId:'backend',origin:'https://shop.example',mode:'test'}).state,'paid')
})

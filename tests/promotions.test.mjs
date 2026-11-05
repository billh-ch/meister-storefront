import test from 'node:test'
import assert from 'node:assert/strict'
import './helpers/typescript-imports.mjs'
const { promotionQuoteSchema, normalizeCoupon } = await import('../lib/promotions/schema.ts')
const { stripePromotionLines } = await import('../lib/promotions/stripe-lines.ts')
const quote={version:1,currency:'EUR',minorUnit:2,backendId:'backend',reference:'11111111-1111-4111-8111-111111111111',expiresAt:2000000000,subtotal:1000,discount:1,shipping:300,tax:0,total:1299,shippingId:'flat_rate:1',provisional:false,promotion:{type:'coupon',id:'1',label:'SAVE',code:'save',version:'1',campaign:'test',influencer:''},coupon:{code:'save',status:'applied'},methods:[{id:'flat_rate:1',wcMethodId:'flat_rate',title:'Delivery',cost:300,isPickup:false}],lines:[{key:'a',productId:1,variationId:0,quantity:3,name:'Suit',subtotal:1000,total:999}]}
test('rejects inconsistent or negative backend totals before payment',()=>{
 assert.equal(promotionQuoteSchema.safeParse(quote).success,true)
 for(const bad of [{...quote,total:1300},{...quote,discount:-1},{...quote,shipping:301},{...quote,lines:[{...quote.lines[0],total:1000}]}])assert.equal(promotionQuoteSchema.safeParse(bad).success,false)
})
test('discounted Stripe merchandise and separate delivery sum to exact cents',()=>{
 const lines=stripePromotionLines({...quote,lines:[{...quote.lines[0],total:998}],discount:2,total:1298})
 assert.deepEqual(lines.map(x=>[x.quantity,x.price_data.unit_amount]),[[2,333],[1,332],[1,300]])
 assert.equal(lines.reduce((s,x)=>s+x.quantity*x.price_data.unit_amount,0),1298)
})
test('zero price merchandise remains zero and delivery is not discounted',()=>{
 const lines=stripePromotionLines({...quote,discount:1000,total:300,lines:[{...quote.lines[0],total:0}]})
 assert.equal(lines.at(-1).price_data.unit_amount,300)
 assert.equal(lines[0].price_data.unit_amount,0)
})
test('one bounded code is normalized without accepting an array or control characters',()=>{
 assert.equal(normalizeCoupon('  Welcome-SAVE  '),'welcome-save')
 for(const bad of [['a','b'],'a\nb','x'.repeat(101)])assert.throws(()=>normalizeCoupon(bad))
})

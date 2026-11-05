import test from 'node:test'
import assert from 'node:assert/strict'
import './helpers/typescript-imports.mjs'
const { reconciliationEventType } = await import('../lib/promotions/reconciliation-state.ts')
test('missed async failure is distinguished from still-processing payment',()=>{
 assert.equal(reconciliationEventType({status:'complete',payment_status:'unpaid'},'requires_payment_method'),'checkout.session.async_payment_failed')
 assert.equal(reconciliationEventType({status:'complete',payment_status:'unpaid'},'canceled'),'checkout.session.async_payment_failed')
 assert.equal(reconciliationEventType({status:'complete',payment_status:'unpaid'},'processing'),'checkout.session.completed')
})
test('latest paid state wins over an older failure or expiry and open sessions retain capacity',()=>{
 assert.equal(reconciliationEventType({status:'complete',payment_status:'paid'},'succeeded'),'checkout.session.completed')
 assert.equal(reconciliationEventType({status:'expired',payment_status:'unpaid'},'canceled'),'checkout.session.expired')
 assert.equal(reconciliationEventType({status:'open',payment_status:'unpaid'},'requires_payment_method'),undefined)
})

import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
const {buildAgentNegotiationHeaders}=await import('../lib/agents/headers.ts').catch(()=>({}))
const {informationPages}=await import('../lib/agents/content.ts')
test('deployment route headers preserve Accept on every negotiated HTML page, including static artifacts',()=>{
 const routes=buildAgentNegotiationHeaders()
 for(const path of ['/',...Object.keys(informationPages),'/shop','/fins','/suits','/guns','/accessories','/merch','/products/:slug']){
  const rule=routes.find(rule=>rule.source===path)
  assert.ok(rule,`Missing deployed header rule for ${path}`)
  const vary=rule.headers.find(header=>header.key==='Vary')?.value.toLowerCase().split(/,\s*/)
  for(const token of ['accept','rsc','next-router-state-tree','next-router-prefetch','next-router-segment-prefetch'])assert.ok(vary.includes(token))
 }
 assert.ok(!routes.some(rule=>/^\/(?:api|account|cart|checkout|_next|\.well-known)(?:\/|$)/.test(rule.source)))
})

import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
const {CompareStore}=await import('../lib/compare/store.ts').catch(()=>({}))
const p=(id,category='fins')=>({id,name:`Product ${id}`,category})
function setup(raw='[]'){
 assert.equal(typeof CompareStore,'function')
 let value=raw
 const store=new CompareStore({read:()=>value,write:next=>{value=next}})
 store.hydrate();return {store,read:()=>JSON.parse(value)}
}
test('compare selection toggles and remembers at most four same-category products',()=>{
 const {store,read}=setup();for(const id of ['1','2','3','4'])store.toggle(p(id))
 store.toggle(p('5'));assert.equal(store.getSnapshot().items.length,4);assert.match(store.getSnapshot().message,/four/i)
 store.remove('4');store.toggle(p('9','suits'));assert.equal(store.getSnapshot().items.length,3);assert.match(store.getSnapshot().message,/same category/i)
 store.toggle(p('1'));assert.deepEqual(read().map(p=>p.id),['2','3']);store.clear();assert.deepEqual(read(),[])
})
test('restore filters corrupt, duplicate, oversized and mixed-category storage',()=>{
 const {store}=setup(JSON.stringify([p('1'),p('1'),p('2','suits'),{id:'../api',name:'Invalid',category:'fins'},p('3'),p('4'),p('5'),p('6')]))
 assert.deepEqual(store.getSnapshot().items.map(p=>p.id),['1','3','4','5'])
 const broken=setup('{bad');assert.deepEqual(broken.store.getSnapshot().items,[])
})
test('failed storage writes retain selection in memory and report persistence failure',()=>{
 assert.equal(typeof CompareStore,'function')
 const store=new CompareStore({read:()=> '[]',write:()=>{throw Error('Quota')}})
 store.hydrate();store.toggle(p('1'));store.hydrate()
 assert.deepEqual(store.getSnapshot().items.map(p=>p.id),['1']);assert.match(store.getSnapshot().error,/browser/i)
})
test('retry after a failed write merges another tab’s saves instead of replacing them',()=>{
 let value='[]',blocked=true
 const store=new CompareStore({read:()=>value,write:next=>{if(blocked)throw Error('Quota');value=next}})
 store.hydrate();store.toggle(p('1'));value=JSON.stringify([p('2')]);blocked=false;store.hydrate()
 assert.deepEqual(new Set(JSON.parse(value).map(p=>p.id)),new Set(['1','2']))
})
test('refreshed product categories update the category selection guard',()=>{
 const {store,read}=setup();store.toggle(p('1'));store.toggle(p('2'))
 assert.equal(typeof store.reconcile,'function')
 store.reconcile([p('1','suits'),p('2','suits')]);store.toggle(p('3','suits'))
 assert.deepEqual(read().map(p=>p.id),['1','2','3']);assert.ok(read().every(p=>p.category==='suits'))
})

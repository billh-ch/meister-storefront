import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
const { WishlistStore } = await import('../lib/wishlist/store.ts').catch(() => ({}))
function setup() {
  assert.equal(typeof WishlistStore, 'function')
  const local = new Map([['mm_wishlist_guest', JSON.stringify(['42','7'])]])
  let account = null, fail = false
  const accounts = new Map([[1, ['9','42']], [2, ['12']]])
  const store = new WishlistStore({
    read: key => local.get(key) ?? null,
    write: (key,value) => local.set(key,value),
    load: async () => ({customerId: account, ids: accounts.get(account) ?? []}),
    change: async (customerId, additions, removals) => {
      if (fail) throw Error('Offline')
      if (customerId !== account) throw Error('Account changed')
      const ids = [...new Set([...(accounts.get(account) ?? []), ...additions])].filter(id => !removals.includes(id))
      accounts.set(account, ids)
      return {customerId: account, ids}
    },
  })
  return {store,local,accounts,login: id => {account=id},fail: value=>{fail=value}}
}
test('guest saves persist and sign-in merges without duplicates', async () => {
  const s = setup(); await s.store.sync()
  s.store.toggle('12'); await s.store.sync()
  assert.deepEqual(JSON.parse(s.local.get('mm_wishlist_guest')), ['42','7','12'])
  s.login(1); await s.store.sync()
  assert.deepEqual(new Set(s.store.getSnapshot().ids), new Set(['9','42','7','12']))
  assert.deepEqual(JSON.parse(s.local.get('mm_wishlist_guest')), [])
})
test('failed merge preserves guest products and succeeds on retry', async () => {
  const s = setup(); s.login(1); s.fail(true); await s.store.sync()
  assert.deepEqual(JSON.parse(s.local.get('mm_wishlist_guest')), ['42','7'])
  assert.match(s.store.getSnapshot().error, /sync/i)
  s.fail(false); await s.store.sync()
  assert.deepEqual(JSON.parse(s.local.get('mm_wishlist_guest')), [])
})
test('pending removal survives a reload and is isolated from other accounts', async () => {
  const s = setup(); s.login(1); await s.store.sync(); s.fail(true)
  s.store.toggle('42'); await s.store.sync()
  assert.deepEqual(JSON.parse(s.local.get('mm_wishlist_pending_1')), {'42':false})
  s.login(2); await s.store.sync()
  assert.deepEqual(s.store.getSnapshot().ids, ['12'])
  assert.deepEqual(JSON.parse(s.local.get('mm_wishlist_pending_1')), {'42':false})
  s.login(1); s.fail(false); await s.store.sync()
  assert.equal(s.accounts.get(1).includes('42'),false)
  s.login(null); await s.store.sync()
  assert.deepEqual(s.store.getSnapshot().ids, [])
})
test('storage failure reports that guest saves cannot persist', async () => {
  assert.equal(typeof WishlistStore, 'function')
  const store = new WishlistStore({read:()=>null,write:()=>{throw Error('Denied')},load:async()=>({customerId:null,ids:[]}),change:async()=>{throw Error('Unexpected')}})
  await store.sync(); store.toggle('42')
  assert.match(store.getSnapshot().error, /browser/i)
})
test('a newer click survives acknowledgement of an in-flight change', async () => {
  let unblock, started
  const gate = new Promise(resolve => {unblock=resolve})
  const firstWrite = new Promise(resolve => {started=resolve})
  let ids=['42'], first=true
  const local=new Map()
  const store = new WishlistStore({read:key=>local.get(key)??null,write:(key,value)=>local.set(key,value),load:async()=>({customerId:1,ids}),change:async(customerId,additions,removals)=>{
    if(first){first=false;started();await gate}
    ids=[...new Set([...ids,...additions])].filter(id=>!removals.includes(id))
    return {customerId,ids}
  }})
  await store.sync(); store.toggle('42'); await firstWrite
  store.toggle('42'); unblock(); await store.sync()
  assert.deepEqual(store.getSnapshot().ids,['42'])
})
test('guest edits survive refresh attempts when reads work but storage writes fail', async () => {
  let writesFail=true
  const local=new Map([['mm_wishlist_guest','[]']])
  const store=new WishlistStore({read:key=>local.get(key)??null,write:(key,value)=>{if(writesFail)throw Error('Quota');local.set(key,value)},load:async()=>({customerId:null,ids:[]}),change:async()=>{throw Error('Unexpected')}})
  await store.sync();store.toggle('42');await store.sync()
  assert.deepEqual(store.getSnapshot().ids,['42'])
  assert.match(store.getSnapshot().error,/browser/i)
  writesFail=false;await store.sync()
  assert.deepEqual(JSON.parse(local.get('mm_wishlist_guest')),['42'])
})
test('guest saves added in another tab during merge survive acknowledgement', async () => {
  const local=new Map([['mm_wishlist_guest','["42"]']])
  let unblock, started
  const gate=new Promise(resolve=>{unblock=resolve}), firstWrite=new Promise(resolve=>{started=resolve})
  const store=new WishlistStore({read:key=>local.get(key)??null,write:(key,value)=>local.set(key,value),load:async()=>({customerId:1,ids:[]}),change:async(customerId,additions)=>{started();await gate;return {customerId,ids:additions}}})
  const sync=store.sync();await firstWrite
  local.set('mm_wishlist_guest','["42","7"]');unblock();await sync
  assert.deepEqual(JSON.parse(local.get('mm_wishlist_guest')),['7'])
})

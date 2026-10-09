import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
const model = await import('../lib/wishlist/model.ts').catch(() => ({}))

test('wishlist accepts only unique positive product IDs', () => {
  assert.equal(typeof model.normalizeIds, 'function')
  assert.deepEqual(model.normalizeIds(['42', '42', '7', '0', '-1', '../customers', 12, '1.5', '01']), ['42', '7'])
  assert.deepEqual(model.normalizeIds(null), [])
})
test('metadata reads only saved wishlist products and handles tombstones', () => {
  assert.equal(typeof model.readWishlistMetadata, 'function')
  assert.deepEqual(model.readWishlistMetadata([{ key:'other', value: true }, {key:'mm_wishlist_42',value:true},{key:'mm_wishlist_7',value:false},{key:'mm_wishlist_9',value:'true'},{key:'mm_wishlist_42',value:false}]), [])
})
test('wishlist writes change individual products without replacing account metadata', () => {
  assert.equal(typeof model.wishlistMetadata, 'function')
  assert.deepEqual(model.wishlistMetadata(['42','7'], true), [{key:'mm_wishlist_42',value:true},{key:'mm_wishlist_7',value:true}])
  assert.deepEqual(model.wishlistMetadata(['42'], false), [{key:'mm_wishlist_42',value:false}])
})
test('WordPress scalar boolean round-trip preserves saved products', () => {
  // WordPress usermeta returns non-serialized booleans as '1' and ''.
  assert.deepEqual(model.readWishlistMetadata([{key:'mm_wishlist_42',value:'1'},{key:'mm_wishlist_7',value:''},{key:'mm_wishlist_9',value:1},{key:'mm_wishlist_12',value:'0'}]), ['42','9'])
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { selectCartRecommendations } from '../lib/cart/recommendations.ts'
const product = (id, category, stockStatus = 'instock') => ({ id, category, stockStatus })
test('recommendations prioritize cart categories and exclude existing, sold-out and duplicate products', () => {
  const catalog = [product('a', 'fins'), product('b', 'suits'), product('c', 'fins', 'outofstock'), product('d', 'fins', 'onbackorder'), product('d', 'fins'), product('e', 'fins'), product('f', 'suits')]
  assert.deepEqual(selectCartRecommendations(catalog, ['a']).map(p => p.id), ['d', 'e', 'b', 'f'])
})
test('recommendations are bounded and absent for an empty cart or no available candidates', () => {
  assert.deepEqual(selectCartRecommendations([product('a', 'fins')], []), [])
  assert.deepEqual(selectCartRecommendations([product('a', 'fins')], ['a']), [])
  assert.equal(selectCartRecommendations(Array.from({ length: 12 }, (_, i) => product(String(i), 'fins')), ['0']).length, 6)
})

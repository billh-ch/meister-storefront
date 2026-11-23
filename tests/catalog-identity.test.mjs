import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
const { mapCategorySlug } = await import('../lib/woocommerce/mappers/category-map.ts')
const { mapBrand } = await import('../lib/woocommerce/mappers/map-brand.ts')
const { connectCatalogue } = await import('../lib/gear-finder/catalogue.ts')

test('new catalog: top-level category slugs decide the section, IDs are ignored', () => {
  assert.equal(mapCategorySlug([{ id: 900, slug: 'fins' }, { id: 901, slug: 'carbon-blades' }]), 'fins')
  assert.equal(mapCategorySlug([{ id: 17, slug: 'merch' }]), 'merch', 'a slug match wins over a legacy ID that would say suits')
  assert.equal(mapCategorySlug([{ id: 5, slug: 'suits' }, { id: 6, slug: 'accessories' }]), 'accessories', 'existing priority still applies')
  assert.equal(mapCategorySlug([{ id: 5, slug: 'FINS' }]), 'fins')
})

test('legacy Pi catalog: numeric IDs still map when no section slug is present', () => {
  assert.equal(mapCategorySlug([{ id: 104, slug: 'πτερύγια' }]), 'fins')
  assert.equal(mapCategorySlug([104]), 'fins')
  assert.equal(mapCategorySlug([{ id: 99999, slug: 'unknown' }]), 'accessories')
  assert.equal(mapCategorySlug([]), 'accessories')
})

test('brand: built-in WooCommerce Brands first, legacy attribute second', () => {
  const legacy = [{ id: 1, name: 'Εταιρία', slug: 'pa_εταιρία', variation: false, visible: true, options: ['Mares'] }]
  assert.equal(mapBrand(legacy, [{ name: 'Meister' }]), 'Meister')
  assert.equal(mapBrand(legacy, []), 'Mares')
  assert.equal(mapBrand(legacy, [{ name: '  ' }]), 'Mares')
  assert.equal(mapBrand(undefined, undefined), null)
})

const product = (over) => ({ id: '1', slug: 'evo', name: 'Evo', price: 300, category: 'fins', image: '', stockStatus: 'instock', priceFrom: false, ...over })

test('gear finder: the meister_gear_finder field binds a model regardless of product ID', () => {
  const tagged = connectCatalogue([product({ id: '77', slug: 'evo-fins', gearKey: 'fins:evo' })])
  assert.equal(tagged.fins.find(m => m.id === 'evo')?.commerce.href, '/products/evo-fins')
  const legacy = connectCatalogue([product({ id: '4608', slug: 'evo-legacy' })])
  assert.equal(legacy.fins.find(m => m.id === 'evo')?.commerce.href, '/products/evo-legacy')
  const dup = connectCatalogue([product({ id: '77', slug: 'a', gearKey: 'fins:evo' }), product({ id: '78', slug: 'b', gearKey: 'fins:evo' })])
  assert.equal(dup.fins.find(m => m.id === 'evo'), undefined, 'two products claiming one model fail closed')
  const wrongSection = connectCatalogue([product({ id: '77', slug: 'evo', category: 'suits', gearKey: 'fins:evo' })])
  assert.equal(wrongSection.fins.find(m => m.id === 'evo'), undefined)
})

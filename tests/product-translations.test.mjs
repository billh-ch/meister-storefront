import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
const { productSourceHash, resolveProductTranslation } = await import('../lib/product-content/translations.ts')
const source = { name: 'Carbon πέδιλα', short_description: '<p>Λείο\r\nCarbon</p>', description: '<p>50 cm &amp; 2 mm</p>' }
const translated = { name: 'Πέδιλα Carbon', short_description: '<p>Σύντομη περιγραφή</p>', description: '<p>Περιγραφή</p>' }
const metadata = (entry = {}) => ({ version: 1, el: { status: 'published', source_hash: productSourceHash(source), ...translated, ...entry } })
test('browser comparison model cannot import server product mappers or translation hashing', () => {
  const model = readFileSync(new URL('../lib/compare/model.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(model, /import .*from ['\"][^'\"]*(?:woocommerce\/mappers|product-content\/translations)/)
})
test('malformed containers and untrusted states always fall back safely', () => {
  for (const value of [null, undefined, [], 'json', 1, { version: 2 }, { ...metadata(), el: [] }, metadata({ status: 'draft' }), metadata({ source_hash: 'old' })]) {
    assert.deepEqual(resolveProductTranslation(source, 'el', value), source)
  }
  assert.deepEqual(resolveProductTranslation(source, 'gr', metadata()), source)
  assert.deepEqual(resolveProductTranslation({ ...source, name: 'Changed' }, 'el', metadata()), { ...source, name: 'Changed' })
  assert.deepEqual(resolveProductTranslation(source, 'el', metadata({ name: ' ', short_description: 9, description: null })), source)
  assert.deepEqual(resolveProductTranslation(source, 'el', metadata({ name: 'x'.repeat(1001) })), { ...translated, name: source.name })
})
test('PHP and TypeScript share exact canonical UTF-8 hashes without formatting or normalization', () => {
  const fixtures = JSON.parse(readFileSync(new URL('../wordpress/fixtures/product-translations-canonical.json', import.meta.url), 'utf8'))
  assert.ok(fixtures.length >= 3)
  for (const fixture of fixtures) assert.equal(productSourceHash(fixture.source), fixture.sha256)
})
test('canonical hash uses exact UTF-8 raw source with NUL separators and empty descriptions', () => {
  assert.equal(productSourceHash(source), createHash('sha256').update(`${source.name}\0${source.short_description}\0${source.description}`, 'utf8').digest('hex'))
  assert.equal(productSourceHash({ name: 'Only name' }), createHash('sha256').update('Only name\0\0').digest('hex'))
})
const { mapProduct } = await import('../lib/woocommerce/mappers/map-product.ts')
const { mapProductDetail } = await import('../lib/woocommerce/mappers/map-product-detail.ts')
const rawProduct = () => ({ id: 501, status: 'publish', ...source, description: '<p>REST formatted source</p>', slug: 'stable-slug', price: '80', regular_price: '100', sale_price: '80', price_html: '', on_sale: true, stock_status: 'instock', stock_quantity: 3, type: 'variable', images: [{ src: 'https://fixture.invalid/fins.jpg' }], categories: [], attributes: [{ id: 1, name: 'Size', variation: true, visible: true, options: ['M'] }], sku: 'Carbon-50', weight: '2', dimensions: { length: '50', width: '', height: '' }, meister_translation_source: source, meta_data: [{ key: 'meister_translations', value: metadata() }, { key: 'private', value: 'secret' }] })
test('listing and detail mappers project locale from raw edit source and strip all private metadata', () => {
  const raw = rawProduct(), snapshot = structuredClone(raw)
  const greek = mapProduct(raw, 'el')
  assert.equal(greek.name, translated.name)
  const detail = mapProductDetail(raw, [], 'el')
  assert.equal(detail.name, translated.name)
  assert.equal(detail.descriptionHtml, translated.description)
  const english = mapProductDetail(raw)
  assert.equal(english.descriptionHtml, raw.description)
  assert.equal(english.name, source.name)
  for (const product of [greek, detail, english]) {
    assert.equal('meta_data' in product, false)
    assert.equal('meister_translation_source' in product, false)
    assert.equal(JSON.stringify(product).includes('source_hash'), false)
  }
  const identity = product => Object.fromEntries(Object.entries(product).filter(([key]) => !['name', 'descriptionHtml', 'shortDescriptionHtml', 'gallery'].includes(key)))
  assert.deepEqual(identity(detail), identity(english))
  assert.deepEqual(raw, snapshot)
})
test('actual plugin top-level REST field takes precedence over legacy metadata and byte limits match PHP', () => {
  const raw = rawProduct()
  const plugin = { ...raw, meta_data: [], meister_translations: metadata() }
  assert.equal(mapProduct(plugin, 'el').name, translated.name)
  assert.equal(mapProduct({ ...plugin, meta_data: raw.meta_data, meister_translations: { version: 99 } }, 'el').name, source.name)
  assert.equal(mapProduct({ ...plugin, meister_translations: metadata({ name: 'α'.repeat(501) }) }, 'el').name, source.name)
  assert.equal(mapProductDetail({ ...plugin, meister_translations: metadata({ description: 'α'.repeat(50001) }) }, [], 'el').descriptionHtml, raw.description)
  assert.equal('meister_translations' in mapProduct(plugin, 'el'), false)
})
test('legacy or malformed raw source cannot validate metadata; translated HTML uses the existing sanitizer', () => {
  const raw = rawProduct()
  for (const invalid of [undefined, null, {}, { name: source.name, short_description: 4, description: source.description }]) {
    assert.equal(mapProduct({ ...raw, meister_translation_source: invalid }, 'el').name, source.name)
  }
  const hostile = { ...raw, meta_data: [{ key: 'meister_translations', value: metadata({ description: '<p onclick="bad()">Σώμα<script>bad()</script><a href="javascript:bad()">link</a></p>', name: ' ', short_description: false }) }] }
  const result = mapProductDetail(hostile, [], 'el')
  assert.equal(result.name, source.name)
  assert.equal(result.shortDescriptionHtml, source.short_description)
  assert.equal(result.descriptionHtml, '<p>Σώμα<a rel="noopener noreferrer nofollow">link</a></p>')
})
test('published matching translation resolves each selected field without mutating source', () => {
  assert.deepEqual(resolveProductTranslation(source, 'el', metadata()), translated)
  assert.deepEqual(resolveProductTranslation(source, 'en', metadata()), source)
  assert.equal(source.name, 'Carbon πέδιλα')
})

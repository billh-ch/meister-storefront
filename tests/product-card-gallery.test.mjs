import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
const { mapProduct } = await import('../lib/woocommerce/mappers/map-product.ts')

test('listing products retain unique gallery photos in WooCommerce order', () => {
  const product = mapProduct({ id: 42, name: 'Fins', images: [{ src: 'https://example.com/front.jpg', alt: 'Front' }, { src: 'https://example.com/back.jpg', alt: 'Back' }, { src: '' }, { src: 'https://example.com/front.jpg' }], categories: [], attributes: [], stock_status: 'instock', price: '20', price_html: '', type: 'simple' })
  assert.deepEqual(product.gallery?.map(({ src, alt }) => ({ src: new URL(src).pathname, alt })), [{ src: '/front.jpg', alt: 'Front' }, { src: '/back.jpg', alt: 'Back' }])
  assert.equal(product.image, product.gallery[0].src)
})

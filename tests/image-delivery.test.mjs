import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { getImgProps } = require('next/dist/shared/lib/get-img-props.js')
const { imageConfigDefault } = require('next/dist/shared/lib/image-config.js')
const defaultLoader = require('next/dist/shared/lib/image-loader.js').default
const { default: config } = await import('../next.config.ts')
function renderedImage(input) {
  return getImgProps(input, { defaultLoader, imgConf: { ...imageConfigDefault, ...config.images } }).props
}
test('product photos load from the image origin rather than the payment-blocked optimizer', () => {
  const src='https://rpiwordpress.kudu-ulmer.ts.net:8443/wp-content/uploads/2026/05/pedila_plastika_meister_01.jpg'
  const props=renderedImage({src,alt:'Fins',fill:true,sizes:'100vw'})
  assert.equal(props.src,src)
  assert.equal(props.srcSet,undefined)
  assert.equal(props.loading,'lazy')
  assert.equal(props.style.position,'absolute')
  assert.equal(props.alt,'Fins')
})
test('local storefront photos also avoid quota-blocked optimization while keeping layout dimensions', () => {
  const props=renderedImage({src:'/gear-finder/lined.jpg',alt:'Wetsuit',width:400,height:500})
  assert.equal(props.src,'/gear-finder/lined.jpg')
  assert.equal(props.srcSet,undefined)
  assert.equal(props.width,400)
  assert.equal(props.height,500)
})

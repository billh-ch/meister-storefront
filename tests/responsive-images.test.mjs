import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
const {selectImageVariant}=await import('../lib/images/select-variant.ts')
const source='https://store.test/wp-content/uploads/fins.jpg?v=2026-05-01T00%3A00%3A00'
const small='/optimized/aaaaaaaaaaaaaaaaaaaa-320.webp',large='/optimized/aaaaaaaaaaaaaaaaaaaa-960.webp'
const manifest={[source]:[{width:960,src:large},{width:320,src:small}]}
test('responsive images choose sufficient resolution and cap at the original generated size',()=>{
 assert.equal(selectImageVariant(source,300,manifest),small)
 assert.equal(selectImageVariant(source,640,manifest),large)
 assert.equal(selectImageVariant(source,3840,manifest),large)
})
test('new or modified photos keep their original URL until regenerated',()=>{
 for(const src of ['https://store.test/new.jpg',source.replace('2026-05','2026-06'),'/logo.svg']) assert.equal(selectImageVariant(src,640,manifest),src)
})
test('malformed generated entries cannot redirect an image to another host or file path',()=>{
 for(const entry of [{width:640,src:'https://evil.test/photo.webp'},{width:640,src:'/optimized/../private.webp'},{width:-10,src:small}])assert.equal(selectImageVariant(source,640,{[source]:[entry]}),source)
})

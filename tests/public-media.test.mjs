import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
const {projectPublishedMedia}=await import('../lib/images/public-media.ts')
test('media inventory exposes only published upload photos on the configured public origin',()=>{
 const products=[{status:'publish',private_key:'never expose',images:[{src:'https://192.168.1.94/wp-content/uploads/2026/05/fins.jpg',date_modified:'2026-05-01T12:00:00',secret:'hidden'},{src:'https://other.test/private/file.jpg'},{src:'data:image/png;base64,abc'},{src:'https://other.test/wp-content/uploads/evil.svg'}]},{status:'draft',images:[{src:'https://private.test/wp-content/uploads/draft.jpg'}]}]
 assert.deepEqual(projectPublishedMedia(products,'https://store.test:8443'),[{src:'https://store.test:8443/wp-content/uploads/2026/05/fins.jpg?v=2026-05-01T12%3A00%3A00'}])
})
test('media projection deduplicates and refuses unsafe configured origins',()=>{
 const images=[{src:'https://private.test/wp-content/uploads/fins.webp'},{src:'https://private.test/wp-content/uploads/fins.webp'}]
 assert.equal(projectPublishedMedia([{status:'publish',images}],'https://store.test').length,1)
 for(const url of ['http://store.test','https://user:secret@store.test','https://store.test/path','https://store.test?key=secret'])assert.throws(()=>projectPublishedMedia([],url))
})

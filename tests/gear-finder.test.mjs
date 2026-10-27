import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
let guide, engine, catalogue
try {
  guide = await import('../lib/gear-finder/reference.ts')
  engine = await import('../lib/gear-finder/engine.ts')
  catalogue = await import('../lib/gear-finder/catalogue.ts')
} catch {}

test('gear finder maps only exact published catalogue identities and uses current prices', () => {
  assert.equal(typeof catalogue?.connectCatalogue, 'function', 'native catalogue adapter must exist')
  const source = guide.PRODUCTS[0]
  const slug = decodeURIComponent(new URL(source.url).pathname.split('/').filter(Boolean).at(-1))
  const raw = { id:'123', slug:encodeURIComponent(slug), category:'suits', name:'Current product', price:399, priceFrom:true, image:'/current.jpg', stockStatus:'instock' }
  const result = catalogue.connectCatalogue([raw])
  assert.equal(result.suits.length,1)
  assert.deepEqual(result.suits[0].price,[399,399])
  assert.equal(result.suits[0].commerce.name,'Current product')
  assert.equal(result.suits[0].commerce.href,`/products/${encodeURIComponent(slug)}`)
  assert.equal(engine.rankSuits({use:'spear',temp:'unknown',care:'easy',budget:'350'},result.suits).matches.length,0)
  for (const invalid of [[],[{...raw,slug:'similar-name'}],[{...raw,category:'accessories'}],[{...raw,price:0}],[{...raw,price:NaN}],[{...raw,id:'demo-123'}],[raw,{...raw,id:'124'}]]) {
    assert.equal(catalogue.connectCatalogue(invalid).suits.length,0)
  }
  assert.equal(catalogue.connectCatalogue([{...raw,stockStatus:'outofstock'}]).suits[0].stock,'out')
  assert.equal(engine.rankSuits({use:'spear',temp:'unknown',care:'easy',budget:'any'},catalogue.connectCatalogue([{...raw,stockStatus:'outofstock'}]).suits.filter(p=>p.stock!=='out')).matches.length,0)
})

test('approved thermal and stiffness boundaries remain unchanged', () => {
  assert.equal(typeof engine?.thermalPlan,'function','approved rule engine must exist')
  assert.deepEqual(engine.thermalPlan({temp:'mild',duration:'long',cold:'yes'}),{range:[7,7.5],adjusted:true})
  assert.deepEqual(engine.thermalPlan({temp:'unknown'}),{range:null,adjusted:false})
  assert.equal(engine.rankSuits({temp:'cold'}).matches.length,0)
  assert.equal(engine.finStiffness({experience:'new',power:'strong'}),'S–MS')
  assert.equal(engine.finStiffness({experience:'advanced',power:'strong'}),'M–MH')
  assert.equal(engine.rankFins({budget:'any'},guide.FIN_PRODUCTS.map(p=>({...p,stock:'out'}))).length,0)
})

function combinations(questions) {
  return questions.reduce((all,q)=>all.flatMap(a=>q.options.map(o=>({...a,[q.id]:o[0]}))),[{}])
}
test('every approved answer combination preserves its original recommendation order and thickness', () => {
  assert.ok(guide && engine,'approved reference and engine must exist')
  const suitResults = combinations(guide.QUESTIONS).map(a=>engine.rankSuits(a).matches.map(m=>[m.product.id,m.thickness]))
  const finResults = combinations(guide.FIN_QUESTIONS).map(a=>engine.rankFins(a).map(m=>[m.product.id,m.reasons]))
  assert.equal(suitResults.length,2160)
  assert.equal(finResults.length,4860)
  assert.equal(createHash('sha256').update(JSON.stringify(suitResults)).digest('hex'),'9a042eb35c468530a3170989345d62ac941e2cd017130afe9ca830c480a611ac')
  assert.equal(createHash('sha256').update(JSON.stringify(finResults)).digest('hex'),'e78e1386817a768a540baed5fe44633d35dc0ceb4187b254d60aef5efd6d4662')
})

test('finder sessions reject invalid answers and retain valid independent progress', async () => {
  let sessionModule
  try { sessionModule=await import('../lib/gear-finder/session.ts') } catch {}
  assert.equal(typeof sessionModule?.createFinderStore,'function','validated session store must exist')
  const values=new Map()
  const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}
  const store=sessionModule.createFinderStore(storage)
  store.update('fins',{answers:{use:'mixed'},step:1,results:false,showAll:false})
  const restored=sessionModule.createFinderStore(storage)
  assert.equal(restored.getSnapshot().fins.answers.use,'mixed')
  assert.equal(restored.getSnapshot().wetsuits.step,0)
  values.set('meister_gear_finder_v1',JSON.stringify({fins:{answers:{use:'invalid',budget:'any',private:'unexpected'},step:999,results:true,showAll:true}}))
  const safe=sessionModule.createFinderStore(storage).getSnapshot()
  assert.deepEqual(safe.fins.answers,{budget:'any'})
  assert.equal(safe.fins.results,false)
  assert.equal(safe.fins.step,0,'cannot skip past missing required answers')
  const broken={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}
  assert.doesNotThrow(()=>sessionModule.createFinderStore(broken).update('fins',{step:0,answers:{},results:false,showAll:false}))
})

test('gear finder routes and metadata retain locale and mode', async () => {
  const {localePath,isShopperPath}=await import('../lib/i18n/paths.ts')
  assert.equal(isShopperPath('/gear-finder'),true)
  assert.equal(localePath('/gear-finder#fins','el'),'/el/gear-finder#fins')
  assert.equal(localePath('/el/gear-finder#wetsuits','en'),'/gear-finder#wetsuits')
  const {buildPageMetadata}=await import('../lib/seo/metadata.ts')
  const meta=buildPageMetadata({title:'Gear Finder — Wetsuits & Fins — Meister',description:'Guide',path:'/gear-finder',locale:'el'},{NEXT_PUBLIC_SITE_URL:'https://meister-storefront.vercel.app',VERCEL_ENV:'production'})
  assert.equal(meta.alternates.languages.el,'https://meister-storefront.vercel.app/el/gear-finder')
  assert.match(meta.title,/Οδηγός/)
})

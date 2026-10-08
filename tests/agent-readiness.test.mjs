import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
const helpers=await import('../lib/agents/content.ts').catch(()=>({}))
test('Markdown negotiation respects media quality and does not reinterpret private routes',()=>{
 assert.equal(typeof helpers.prefersMarkdown,'function')
 for(const accept of ['text/markdown','text/markdown;q=1, text/html;q=0.5','TEXT/MARKDOWN; charset=utf-8']) assert.equal(helpers.prefersMarkdown(accept),true)
 for(const accept of ['text/html','*/*','text/markdown;q=0','text/html;q=1, text/markdown;q=0.5','text/html, text/markdown']) assert.equal(helpers.prefersMarkdown(accept),false)
 for(const path of ['/cart','/checkout','/account/orders','/api/cart','/sign-in','/_next/static/a.js']) assert.equal(helpers.isPublicContentPath(path),false)
 assert.equal(helpers.isPublicContentPath('/missing-page'),true)
})
test('Markdown errors preserve 404 and provide meaningful recovery links',()=>{
 const response=helpers.markdownResponse('# Page not found\n\nThis page does not exist. Try [Meister documentation](/docs).',404)
 assert.equal(response.status,404)
 assert.match(response.headers.get('content-type'),/^text\/markdown/)
 assert.match(response.headers.get('vary'),/Accept/)
})
test('discovery file follows llms.txt H1, summary and linked-list format with job guidance',()=>{
 const text=helpers.buildLlmsTxt()
 assert.match(text,/^# Meister/)
 assert.match(text,/\n> /)
 assert.match(text,/## When to use/)
 assert.match(text,/\.well-known\/mcp/)
 assert.match(text,/do not.*(?:purchase|order|payment)/i)
 for(const section of text.split(/\n## /).slice(1))assert.match(section,/\n- \[[^\]]+\]\(https:\/\//)
})
test('identity schema uses the published Meister business contact and postal address',()=>{
 const schemas=helpers.buildHomepageIdentity()
 const org=schemas.find(schema=>schema['@type']==='Organization')
 assert.equal(org.name,'Meister');assert.equal(org.url,'https://meister-storefront.vercel.app/')
 assert.equal(org.contactPoint['@type'],'ContactPoint');assert.equal(org.contactPoint.contactType,'customer service')
 assert.equal(org.contactPoint.email,'info@dive-meister.com');assert.equal(org.contactPoint.telephone,'+302105317549')
 assert.deepEqual(org.address,{'@type':'PostalAddress',streetAddress:'Leoforos Athinon 387',addressLocality:'Aigaleo',postalCode:'12243',addressCountry:'GR'})
 const contact=helpers.pageMarkdown(helpers.informationPages['/contact']);const privacy=helpers.pageMarkdown(helpers.informationPages['/privacy'])
 assert.match(contact,/info@dive-meister\.com/);assert.match(contact,/12243/);assert.doesNotMatch(contact,/awaiting confirmation/i)
 assert.match(privacy,/23876-2/);assert.match(privacy,/mm_cart/);assert.match(privacy,/info@dive-meister\.com/)
})
test('homepage server copy is substantial and category filtering preserves every displayed Meister product',()=>{
 assert.ok(helpers.HOME_PARAGRAPHS.join(' ').length>=1200)
 const products=[{id:'1',category:'fins',brand:'Meister'},{id:'2',category:'fins',brand:'Other'},{id:'3',category:'guns',brand:'Meister'}]
 assert.deepEqual(helpers.showcaseProducts(products,['fins']),[products[0]])
})
test('public agent detail lookup rejects demo mode and backend outages instead of returning fallback products',async()=>{
 const {getPublishedProductBySlug}=await import('../lib/woocommerce/index.ts')
 const keys=['NEXT_PUBLIC_USE_MOCK_DATA','NEXT_PUBLIC_WC_URL','WC_CONSUMER_KEY','WC_CONSUMER_SECRET']
 const saved=Object.fromEntries(keys.map(key=>[key,process.env[key]]));const original=globalThis.fetch
 try{
  process.env.NEXT_PUBLIC_USE_MOCK_DATA='true';await assert.rejects(getPublishedProductBySlug('carbon-blade-fins'),/demo mode/)
  process.env.NEXT_PUBLIC_USE_MOCK_DATA='false';process.env.NEXT_PUBLIC_WC_URL='https://fixture.example';process.env.WC_CONSUMER_KEY='fixture';process.env.WC_CONSUMER_SECRET='fixture'
  globalThis.fetch=async()=>new Response('{}',{status:503})
  await assert.rejects(getPublishedProductBySlug('carbon-blade-fins'),/503/)
 }finally{globalThis.fetch=original;for(const[key,value]of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value}}
})
test('Markdown negotiation leaves root static assets intact',()=>{
 for(const path of ['/window.svg','/file.svg','/globe.svg','/next.svg','/vercel.svg'])assert.equal(helpers.isPublicContentPath(path),false)
})
test('strict product detail requests and returns published variation records only',async()=>{
 const {getPublishedProductBySlug}=await import('../lib/woocommerce/index.ts')
 const keys=['NEXT_PUBLIC_USE_MOCK_DATA','NEXT_PUBLIC_WC_URL','WC_CONSUMER_KEY','WC_CONSUMER_SECRET'];const saved=Object.fromEntries(keys.map(key=>[key,process.env[key]]));const original=globalThis.fetch;let variationURL;let parentStatus='publish'
 try{
  process.env.NEXT_PUBLIC_USE_MOCK_DATA='false';process.env.NEXT_PUBLIC_WC_URL='https://fixture.example';process.env.WC_CONSUMER_KEY='fixture';process.env.WC_CONSUMER_SECRET='fixture'
  globalThis.fetch=async url=>{
   if(url.includes('/variations')){variationURL=url;return Response.json([
    {id:601,status:'publish',price:'80',regular_price:'80',on_sale:false,stock_status:'instock',attributes:[{name:'Size',option:'M'}]},
    {id:602,status:'private',price:'999',regular_price:'999',on_sale:false,stock_status:'instock',attributes:[{name:'Size',option:'internal-only'}]},
   ])}
   return Response.json([{id:501,slug:'fins',name:'Fins',type:'variable',status:parentStatus,price:'80',regular_price:'80',sale_price:'',price_html:'80',on_sale:false,stock_status:'instock',stock_quantity:1,images:[],categories:[],attributes:[{name:'Size',options:['M'],variation:true,visible:true}],description:'',short_description:'',sku:'',weight:'',dimensions:{length:'',width:'',height:''}}])
  }
  const product=await getPublishedProductBySlug('fins');assert.deepEqual(product.variants.map(variant=>variant.id),['601']);assert.equal(new URL(variationURL).searchParams.get('status'),'publish')
  parentStatus='private';assert.equal(await getPublishedProductBySlug('fins'),null)
 }finally{globalThis.fetch=original;for(const[key,value]of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value}}
})
test('agent price text does not interpret missing or invalid numeric prices as a free product',()=>{
 for(const price of [0,NaN,Infinity,-1])assert.equal(helpers.publishedPriceText(price),'Price unavailable')
 assert.equal(helpers.publishedPriceText(80),'EUR 80');assert.equal(helpers.publishedPriceText(80,true),'from EUR 80')
})

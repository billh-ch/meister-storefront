import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
const {fetchCompareCatalog}=await import('../lib/compare/catalog.ts')
test('explicit demo mode resolves selected products without touching WooCommerce',async()=>{
 const prior=process.env.NEXT_PUBLIC_USE_MOCK_DATA;process.env.NEXT_PUBLIC_USE_MOCK_DATA='true'
 try{const data=await fetchCompareCatalog(['1','7']);assert.equal(data.products.length,2);assert.equal(data.units.weight,'kg')}
 finally{if(prior===undefined)delete process.env.NEXT_PUBLIC_USE_MOCK_DATA;else process.env.NEXT_PUBLIC_USE_MOCK_DATA=prior}
})
const raw=(id,status='publish')=>({id,status,name:'Fins',slug:`fins-${id}`,price:'20',price_html:'',type:'simple',stock_status:'instock',categories:[],images:[],sku:'ABC',weight:'2',dimensions:{length:'10',width:'',height:''},attributes:[{id:1,name:'Material',visible:true,variation:false,options:['Carbon']},{id:2,name:'Private note',visible:false,variation:false,options:['Secret']}]})
async function withBackend(fetcher,fn){
 const previous=globalThis.fetch, keys=['NEXT_PUBLIC_USE_MOCK_DATA','NEXT_PUBLIC_WC_URL','WC_CONSUMER_KEY','WC_CONSUMER_SECRET'], env=Object.fromEntries(keys.map(key=>[key,process.env[key]]))
 Object.assign(process.env,{NEXT_PUBLIC_USE_MOCK_DATA:'false',NEXT_PUBLIC_WC_URL:'https://fixture.invalid',WC_CONSUMER_KEY:'fixture',WC_CONSUMER_SECRET:'fixture'})
 globalThis.fetch=fetcher
 try{await fn()}finally{globalThis.fetch=previous;for(const key of keys)if(env[key]===undefined)delete process.env[key];else process.env[key]=env[key]}
}
test('live comparison exposes published products and visible attributes with verified store units',async()=>{
 await withBackend(async url=>Response.json(String(url).includes('/settings/products')?[{id:'woocommerce_weight_unit',value:'g'},{id:'woocommerce_dimension_unit',value:'mm'}]:[raw(1),raw(2,'private')]),async()=>{
  const data=await fetchCompareCatalog(['1','2']);assert.equal(data.products.length,1);assert.deepEqual(data.products[0].attributes.map(a=>a.name),['Material']);assert.deepEqual(data.units,{weight:'g',dimensions:'mm'})
 })
})
test('unavailable unit settings omit measurements without hiding the catalog',async()=>{
 await withBackend(async url=>{if(String(url).includes('/settings/products'))throw Error('Settings unavailable');return Response.json([raw(1)])},async()=>{
  const data=await fetchCompareCatalog(['1']);assert.equal(data.products.length,1);assert.deepEqual(data.units,{})
 })
})
test('a live catalog outage never substitutes demo products',async()=>{
 await withBackend(async()=>{throw Error('Store offline')},async()=>{await assert.rejects(fetchCompareCatalog(['1']),/Store offline/)})
})

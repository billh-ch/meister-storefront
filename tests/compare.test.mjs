import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
const model=await import('../lib/compare/model.ts').catch(()=>({}))
const product=(id,attrs=[])=>({id,name:`Product ${id}`,price:20,priceFrom:false,brand:null,category:'fins',stockStatus:'instock',sku:'',weight:'',dimensions:{length:'',width:'',height:''},attributes:attrs})
test('new attributes create rows dynamically with missing values and stable shared IDs',()=>{
 assert.equal(typeof model.buildComparisonRows,'function')
 const rows=model.buildComparisonRows([product('1',[{key:'wc:42',name:'Blade material',values:['Carbon']}]),product('2',[{key:'wc:42',name:'Material',values:['Fiberglass']},{key:'wc:9',name:'Stiffness',values:['Medium']}])],{})
 assert.deepEqual(rows.find(row=>row.key==='wc:42').values,['Carbon','Fiberglass'])
 assert.deepEqual(rows.find(row=>row.key==='wc:9').values,['Not specified','Medium'])
 assert.equal(rows.find(row=>row.key==='wc:42').different,true)
})
test('attribute differences ignore option order, case and whitespace',()=>{
 assert.equal(typeof model.buildComparisonRows,'function')
 const rows=model.buildComparisonRows([product('1',[{key:'wc:1',name:'Sizes',values:[' M ','L']}]),product('2',[{key:'wc:1',name:'Sizes',values:['l','m']}])],{})
 assert.equal(rows.find(row=>row.key==='wc:1').different,false)
})
test('empty attributes are omitted and measurements require verified units',()=>{
 assert.equal(typeof model.buildComparisonRows,'function')
 const p={...product('1',[{key:'wc:1',name:'Empty',values:[' ']}]),weight:'2',dimensions:{length:'10',width:'',height:''}}
 assert.equal(model.buildComparisonRows([p],{}).some(row=>['weight','dimensions','wc:1'].includes(row.key)),false)
 const rows=model.buildComparisonRows([p],{weight:'g',dimensions:'mm'})
 assert.equal(rows.find(row=>row.key==='weight').label,'Weight (g)')
 assert.equal(rows.find(row=>row.key==='dimensions').values[0],'L 10')
})
test('comparison mapper hides private attributes and matches custom names consistently',()=>{
 assert.equal(typeof model.mapCompareProduct,'function')
 const raw={id:1,name:'Fins',slug:'fins',price:'20',price_html:'',type:'simple',stock_status:'instock',categories:[],attributes:[{id:0,name:' Blade   Material ',visible:true,options:['Carbon']},{id:42,name:'Internal note',visible:false,options:['Private']}],images:[]}
 const p=model.mapCompareProduct(raw)
 assert.equal(p.attributes.length,1)
 assert.equal(p.attributes[0].key,'custom:blade material')
})
test('hidden manufacturer attributes are not exposed through the brand field',()=>{
 const product=model.mapCompareProduct({id:1,name:'Fins',slug:'fins',price:'20',price_html:'',type:'simple',stock_status:'instock',categories:[],images:[],attributes:[{id:42,name:'Εταιρία',slug:'pa_εταιρία',visible:false,variation:false,options:['Hidden manufacturer']}]})
 assert.equal(product.brand,null)
})
test('zero-priced products compare as zero while a blank price remains unspecified',()=>{
 const raw={id:1,name:'Fins',slug:'fins',price:'0',price_html:'',type:'simple',stock_status:'instock',categories:[],images:[],attributes:[]}
 const free=model.mapCompareProduct(raw), blank=model.mapCompareProduct({...raw,id:2,price:''})
 const row=model.buildComparisonRows([free,blank],{}).find(row=>row.key==='price')
 assert.ok(row);assert.ok(row.values[0].includes('0,00'));assert.equal(row.values[1],'Not specified')
})

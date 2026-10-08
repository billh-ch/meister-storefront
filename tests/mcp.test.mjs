import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
const helpers=await import('../lib/agents/mcp.ts').catch(()=>({}))
const product={id:'501',name:'Meister Fins',slug:'πέδιλα',price:80,priceFrom:false,stockStatus:'instock',category:'fins',brand:'Meister',descriptionHtml:'<p>Real specification</p>',shortDescriptionHtml:'',attributes:[],variants:[]}
const dependencies={list:async()=>[product],detail:async slug=>slug==='πέδιλα'?product:null}
test('official MCP client initializes, lists read-only tools and retrieves live catalog records',async()=>{
 assert.equal(typeof helpers.handleMcpRequest,'function')
 const client=new Client({name:'regression-client',version:'1.0.0'})
 const transport=new StreamableHTTPClientTransport(new URL('https://meister-storefront.vercel.app/.well-known/mcp'),{fetch:async(url,init)=>helpers.handleMcpRequest(new Request(url,init),dependencies)})
 try{
  await client.connect(transport)
  const tools=await client.listTools();assert.deepEqual(tools.tools.map(tool=>tool.name),['search_products','get_product']);assert.ok(tools.tools.every(tool=>tool.annotations.readOnlyHint))
  const search=await client.callTool({name:'search_products',arguments:{query:'Fins',limit:1}})
  assert.match(search.content[0].text,/Meister Fins/);assert.match(search.content[0].text,/https:\/\/meister-storefront.vercel.app\/products\//)
  const detail=await client.callTool({name:'get_product',arguments:{slug:encodeURIComponent('πέδιλα')}})
  assert.match(detail.content[0].text,/Real specification/)
  const missing=await client.callTool({name:'get_product',arguments:{slug:'missing'}});assert.equal(missing.isError,true)
  const invalid=await client.callTool({name:'search_products',arguments:{query:'Fins',limit:200}});assert.equal(invalid.isError,true)
 }finally{await client.close()}
})
test('MCP rejects hostile origins and oversized bodies; stateless GET does not invent a manifest',async()=>{
 assert.equal((await helpers.handleMcpRequest(new Request('https://meister-storefront.vercel.app/.well-known/mcp',{headers:{origin:'https://evil.example'}}),dependencies)).status,403)
 assert.equal((await helpers.handleMcpRequest(new Request('https://meister-storefront.vercel.app/.well-known/mcp',{headers:{accept:'text/event-stream'}}),dependencies)).status,405)
 const oversized=new Request('https://meister-storefront.vercel.app/.well-known/mcp',{method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream'},body:'x'.repeat(65537)})
 assert.equal((await helpers.handleMcpRequest(oversized,dependencies)).status,413)
})
test('catalog outages return tool errors without leaking backend error details',async()=>{
 const client=new Client({name:'outage-regression',version:'1.0.0'})
 const dependencies={list:async()=>{throw new Error('private-backend-detail')},detail:async()=>{throw new Error('private-backend-detail')}}
 const transport=new StreamableHTTPClientTransport(new URL('https://meister-storefront.vercel.app/.well-known/mcp'),{fetch:async(url,init)=>helpers.handleMcpRequest(new Request(url,init),dependencies)})
 try{
  await client.connect(transport)
  for(const call of [{name:'search_products',arguments:{query:''}},{name:'get_product',arguments:{slug:'fins'}}]){
    const result=await client.callTool(call);assert.equal(result.isError,true);assert.doesNotMatch(result.content[0].text,/private-backend-detail/)
  }
 }finally{await client.close()}
})

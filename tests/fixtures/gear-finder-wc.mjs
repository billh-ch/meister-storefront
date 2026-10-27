import '../helpers/typescript-imports.mjs'
import http from 'node:http'
import { PRODUCTS, FIN_PRODUCTS } from '../../lib/gear-finder/reference.ts'
const models=[...PRODUCTS,...FIN_PRODUCTS]
const products=models.map((p,i)=>({ id:8000+i,slug:new URL(p.url).pathname.split('/').filter(Boolean).at(-1),name:p.name.en,price:String(p.price[0]),regular_price:String(p.price[0]),sale_price:'',on_sale:false,stock_status:p.stock==='out'?'outofstock':p.stock==='backorder'?'onbackorder':'instock',price_html:'€100 – €600',images:[{id:i,src:`/gear-finder/${i<7?'lined':'fin-evo'}.jpg`,alt:p.name.en}],categories:[{id:i<7?17:104,name:i<7?'Suits':'Fins',slug:i<7?'suits':'fins'}],attributes:[],type:'simple',status:'publish',description:'<p>Product details</p>',short_description:'',sku:'GEAR-'+i,weight:'',dimensions:{length:'',width:'',height:''}}))
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost')
 res.setHeader('Content-Type','application/json');res.setHeader('x-wp-totalpages','1')
 if(url.pathname.includes('variations'))return res.end('[]')
 if(url.pathname.endsWith('/products')) return res.end(JSON.stringify(url.searchParams.has('slug')?products.filter(p=>decodeURIComponent(p.slug)===decodeURIComponent(url.searchParams.get('slug'))):products))
 if(url.pathname.includes('/products/'))return res.end(JSON.stringify(products.find(p=>String(p.id)===url.pathname.split('/').at(-1))??null))
 res.end('[]')
}).listen(4881,'127.0.0.1',()=>console.log('Gear catalogue fixture on 4881'))

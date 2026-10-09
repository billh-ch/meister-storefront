import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { sealData } from 'iron-session'
import { chromium } from 'playwright'

// Run Next with NEXT_PUBLIC_WC_URL=http://127.0.0.1:4009 and this test-only secret.
const password = 'wishlist-browser-fixture-secret-at-least-32-characters'
const baseURL = process.env.TEST_BASE_URL ?? 'http://localhost:3001'
const accounts = new Map([[901, new Map([['mm_wishlist_7', true], ['unrelated_metadata', 'preserve']])], [902, new Map([['mm_wishlist_12', true]])]])
let failWrites = false
const fixture = createServer(async (request, response) => {
  const match = request.url?.match(/^\/wp-json\/wc\/v3\/customers\/(\d+)$/)
  if (!match) { response.writeHead(404); response.end(); return }
  const id = Number(match[1]); const metadata = accounts.get(id)
  if (!metadata) {response.writeHead(404);response.end();return}
  if (request.method === 'PUT') {
    if (failWrites) {response.writeHead(503);response.end();return}
    let body='';for await(const chunk of request) body+=chunk
    for(const {key,value} of JSON.parse(body).meta_data) metadata.set(key,value === true ? '1' : value === false ? '' : value)
  }
  response.setHeader('Content-Type','application/json')
  response.end(JSON.stringify({id,meta_data:[...metadata].map(([key,value])=>({key,value}))}))
})
await new Promise(resolve => fixture.listen(4009,'127.0.0.1',resolve))
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']})
async function login(context, customerId) {
  const value=await sealData({wcCustomerId:customerId},{password})
  await context.addCookies([{name:'mm_session',value,url:baseURL,httpOnly:true,sameSite:'Lax'}])
}
async function accountIds(context) {return (await (await context.request.get(`${baseURL}/api/wishlist`)).json()).ids}
try {
  const guest = await browser.newContext({viewport:{width:390,height:844}})
  const page = await guest.newPage();await page.goto(`${baseURL}/shop`)
  const card = page.getByRole('article').first()
  await card.getByRole('button',{name:/Add .* to wishlist/}).click()
  await card.getByRole('button',{name:/Remove .* from wishlist/}).waitFor()
  const [guestId] = await page.evaluate(()=>JSON.parse(localStorage.getItem('mm_wishlist_guest')))
  failWrites=true
  await login(guest,901);await page.reload()
  await page.getByRole('button',{name:'Retry wishlist sync'}).waitFor()
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('mm_wishlist_guest'))),[guestId],'Failed merge keeps guest saves')
  await page.goto(`${baseURL}/wishlist`)
  await page.getByRole('button',{name:'Retry wishlist sync'}).waitFor()
  assert.equal(await page.getByText('Saved to your account. Available on your other devices.',{exact:true}).count(),0,'Failed merge must not claim account persistence')
  failWrites=false
  await page.getByRole('button',{name:'Retry wishlist sync'}).click()
  await page.waitForFunction(()=>localStorage.getItem('mm_wishlist_guest')==='[]')
  assert.deepEqual(new Set(await accountIds(guest)),new Set(['7',guestId]))
  assert.equal(accounts.get(901).get('unrelated_metadata'),'preserve')
  console.log('PASS actual encrypted session, WooCommerce merge, failure preservation and retry')

  const second = await browser.newContext({viewport:{width:1440,height:900}})
  await login(second,901)
  const other=await second.newPage();await other.goto(`${baseURL}/wishlist`)
  await other.getByRole('article').first().waitFor()
  const saved = other.getByRole('article').filter({has:other.getByRole('button',{name:/Remove .* from wishlist/})}).first()
  const removeName=await saved.getByRole('button',{name:/Remove .* from wishlist/}).getAttribute('aria-label')
  await saved.getByRole('button',{name:removeName,exact:true}).click()
  await other.waitForFunction(()=>localStorage.getItem('mm_wishlist_pending_901')==='{}')
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')))
  await page.waitForFunction(()=>document.querySelector('a[href="/wishlist"]')?.getAttribute('aria-label')==='Wishlist, 1 saved products')
  assert.equal((await accountIds(guest)).length,1)
  console.log('PASS cross-device account removal and focus refresh')

  failWrites=true
  const remaining=other.getByRole('article').first().getByRole('button',{name:/Remove .* from wishlist/})
  await remaining.click();await other.getByText('Your wishlist is empty').waitFor()
  await other.getByRole('button',{name:'Retry wishlist sync'}).waitFor()
  await other.reload();await other.getByText('Your wishlist is empty').waitFor()
  assert.notEqual(await other.evaluate(()=>localStorage.getItem('mm_wishlist_pending_901')),'{}')
  await login(second,902);await other.reload()
  await other.getByRole('article').waitFor()
  assert.deepEqual(await accountIds(second),['12'])
  assert.notEqual(await other.evaluate(()=>localStorage.getItem('mm_wishlist_pending_901')),'{}')
  await second.clearCookies();await other.reload();await other.getByText('Your wishlist is empty').waitFor()
  console.log('PASS persisted failed removal, account switching and logout isolation')

  failWrites=false
  const mutation={customerId:902,additions:['9'],removals:[]}
  const wrongAccount=await guest.request.post(`${baseURL}/api/wishlist`,{headers:{Origin:baseURL},data:mutation})
  assert.equal(wrongAccount.status(),409)
  const crossOrigin=await guest.request.post(`${baseURL}/api/wishlist`,{headers:{Origin:'https://other.example'},data:{...mutation,customerId:901}})
  assert.equal(crossOrigin.status(),403)
  const notSignedIn=await second.request.post(`${baseURL}/api/wishlist`,{headers:{Origin:baseURL},data:mutation})
  assert.equal(notSignedIn.status(),401)
  const invalid=await guest.request.post(`${baseURL}/api/wishlist`,{headers:{Origin:baseURL},data:{customerId:901,additions:['../customers'],removals:[]}})
  assert.equal(invalid.status(),400)
  const privateResponse=await guest.request.get(`${baseURL}/api/wishlist`)
  assert.match(privateResponse.headers()['cache-control'],/private, no-store/)
  console.log('PASS account authorization, origin checks, ID validation and private caching')

  const independent=await Promise.all(['42','9'].map(id=>guest.request.post(`${baseURL}/api/wishlist`,{headers:{Origin:baseURL},data:{customerId:901,additions:[id],removals:[]}})))
  assert.ok(independent.every(response=>response.ok()))
  const together=await accountIds(guest);assert.ok(together.includes('42')&&together.includes('9'),'Independent writes preserve both products')
  console.log('PASS concurrent independent account additions')

  accounts.get(901).set('mm_wishlist_999999',true)
  await page.goto(`${baseURL}/wishlist`)
  const deleted=page.getByRole('button',{name:'Remove product 999999 from wishlist'})
  await deleted.waitFor()
  await deleted.click()
  await deleted.waitFor({state:'hidden'})
  console.log('PASS deleted product remains removable')
} finally {await browser.close();await new Promise(resolve=>fixture.close(resolve))}

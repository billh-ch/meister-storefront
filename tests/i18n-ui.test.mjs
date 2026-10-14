import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
registerHooks({ resolve(s,c,n){ return n(s === 'next/server' ? 'next/server.js' : s,c) } })
test('remembered explicit language only changes a bare homepage entry', async () => {
  const { rememberedHomeDestination } = await import('../lib/i18n/navigation.ts').catch(() => ({}))
  assert.equal(typeof rememberedHomeDestination, 'function')
  assert.equal(rememberedHomeDestination('/', null), null)
  assert.equal(rememberedHomeDestination('/', 'el'), '/el')
  assert.equal(rememberedHomeDestination('/', 'en'), null)
  for (const path of ['/shop', '/?q=x', '/#shop', '/el', '/']) assert.equal(rememberedHomeDestination(path, 'invalid'), null)
  for (const path of ['/shop', '/?q=x', '/#shop', '/el']) assert.equal(rememberedHomeDestination(path, 'el'), null)
})
test('localized link destinations include string and UrlObject display aliases', async () => {
  const { localizedDestination } = await import('../lib/i18n/navigation.ts').catch(() => ({}))
  assert.equal(typeof localizedDestination, 'function')
  assert.equal(localizedDestination('/products/%cf%80?q=2#size','el'), '/el/products/%cf%80?q=2#size')
  assert.deepEqual(localizedDestination({pathname:'/shop',query:{brand:'Carbon'},hash:'list'},'el'), {pathname:'/el/shop',query:{brand:'Carbon'},hash:'list'})
  assert.deepEqual(localizedDestination({pathname:'/shop',host:'other.test'},'el'), {pathname:'/shop',host:'other.test'})
})
test('unknown Greek shopper paths render through Next while service prefixes stay blocked', async () => {
  const { proxy } = await import('../proxy.ts')
  const { NextRequest } = await import('next/server.js')
  const response=await proxy(new NextRequest('https://meister.test/el/missing-store-page'))
  assert.equal(response.headers.get('x-middleware-rewrite'),'https://meister.test/missing-store-page')
  assert.equal(response.headers.get('x-middleware-request-x-meister-locale'),'el')
  for(const path of ['/el/api/x','/el/docs','/el/logo.svg','/el/_next/image','/el/.well-known/mcp']) assert.equal((await proxy(new NextRequest('https://meister.test'+path))).status,404)
})
test('encoded technical paths never rewrite through Greek unknown-page handling', async () => {
  const { proxy } = await import('../proxy.ts')
  const { NextRequest } = await import('next/server.js')
  for (const path of ['/el/%61pi/cart','/el/%64ocs','/el/%5fnext/image','/el/API/cart','/el/%2fapi/cart','/el/foo%2f..%2fapi/cart','/el/logo%2esvg','/el/%2561pi/cart','/el/%2e%77ell-known/mcp']) {
    const response = await proxy(new NextRequest('https://meister.test'+path))
    assert.equal(response.status,404,path)
    assert.equal(response.headers.get('x-middleware-rewrite'),null,path)
  }
})

test('encoded account paths enforce the same sign-in boundary', async () => {
  process.env.SESSION_SECRET = 'test-password-longer-than-thirty-two-characters'
  const { proxy } = await import('../proxy.ts')
  const { NextRequest } = await import('next/server.js')
  for (const prefix of ['', '/el']) for (const path of ['/%61ccount', '/foo%2f..%2faccount', '/%2561ccount']) {
    const response = await proxy(new NextRequest('https://meister.test'+prefix+path))
    assert.equal(response.status, 307)
    assert.equal(new URL(response.headers.get('location')).pathname, prefix+'/sign-in')
  }
})
test('composed notifications translate complete sentences and preserve catalog identity', async () => {
  const { translate } = await import('../lib/i18n/index.ts')
  assert.equal(translate('el','Carbon X added to comparison.'),'Το Carbon X προστέθηκε στη σύγκριση.')
  assert.equal(translate('el','Please choose valid options for Size, Πάχος.'),'Επιλέξτε έγκυρα χαρακτηριστικά για Μέγεθος, Πάχος.')
  assert.equal(translate('en','Carbon X added to comparison.'),'Carbon X added to comparison.')
})

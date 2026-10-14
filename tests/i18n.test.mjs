import './helpers/typescript-imports.mjs'
import { registerHooks } from 'node:module'
import test from 'node:test'
import assert from 'node:assert/strict'
registerHooks({ resolve(specifier, context, nextResolve) { return nextResolve(specifier === 'next/server' ? 'next/server.js' : specifier, context) } })
const i18n = await import('../lib/i18n/index.ts').catch(() => ({}))
const { buildPageMetadata, buildProductMetadata } = await import('../lib/seo/metadata.ts')
const { buildSitemapUrls, sitemapResponse } = await import('../lib/seo/sitemap.ts')
const production = { VERCEL_ENV: 'production' }
const site = 'https://meister-storefront.vercel.app'

test('locale paths preserve bytes and query/hash and exclude service/documentation URLs', () => {
  assert.equal(typeof i18n.localePath, 'function')
  const path = '/products/%cf%80%ce%ad?size=2#options'
  assert.equal(i18n.localePath(path, 'el'), `/el${path}`)
  assert.equal(i18n.localePath(`/el${path}`, 'en'), path)
  assert.equal(i18n.localePath('/?q=carbon#shop', 'el'), '/el?q=carbon#shop')
  assert.equal(i18n.localePath('/el/shop', 'el'), '/el/shop')
  for (const path of ['/api/checkout', '/docs/auth', '/images/a.jpg', '/_next/image?url=x', '/sitemap.xml', '/llms.txt', '/.well-known/mcp', 'https://x.test/shop', '//x.test/shop', 'mailto:a@b.test', 'tel:123', '#specs']) {
    assert.equal(i18n.localePath(path, 'el'), path)
  }
  assert.equal(i18n.localeFromPath('/el/shop?q=1'), 'el')
  assert.equal(i18n.localeFromPath('/element'), 'en')
  assert.equal(i18n.validateLocale('fr'), 'en')
  assert.equal(i18n.isLocale('el'), true)
  assert.equal(i18n.isLocale('EL'), false)
})
test('Greek dictionary falls back to English and interpolates values in either language', () => {
  assert.equal(typeof i18n.translate, 'function')
  assert.equal(i18n.translate('el', 'Add to cart'), 'Προσθήκη στο καλάθι')
  assert.equal(i18n.translate('el', 'constructor'), 'constructor')
  assert.equal(i18n.translate('el', 'Unknown {name}', { name: 'Carbon' }), 'Unknown Carbon')
  assert.equal(i18n.translate('en', '{count} items', { count: 2 }), '2 items')
})
test('proxy overwrites forged locale/path, preserves RSC and refuses prefixed service routes', async () => {
  const { proxy } = await import('../proxy.ts')
  const { NextRequest } = await import('next/server.js')
  const headers = { 'x-meister-locale': 'el', 'x-meister-original-path': '//evil.test', rsc: '1', accept: 'text/markdown' }
  const en = await proxy(new NextRequest(`${site}/shop?sort=price`, { headers }))
  assert.equal(en.headers.get('x-middleware-request-x-meister-locale'), 'en')
  assert.equal(en.headers.get('x-middleware-request-x-meister-original-path'), '/shop?sort=price')
  const el = await proxy(new NextRequest(`${site}/el/shop?sort=price`, { headers }))
  assert.equal(el.headers.get('x-middleware-request-x-meister-locale'), 'el')
  assert.equal(el.headers.get('x-middleware-rewrite'), `${site}/shop?sort=price`)
  assert.equal(el.headers.get('x-middleware-request-rsc'), '1')
  for (const path of ['/el/api/checkout', '/el/docs/auth', '/el/_next/image', '/el/images/logo.svg', '/el/.well-known/mcp']) {
    const response = await proxy(new NextRequest(`${site}${path}`))
    assert.equal(response.status, 404, path)
    assert.equal(response.headers.get('x-middleware-rewrite'), null)
  }
  const markdown = await proxy(new NextRequest(`${site}/el/shop`, { headers: { accept: 'text/markdown' } }))
  assert.equal(new URL(markdown.headers.get('x-middleware-rewrite')).searchParams.get('__agent_path'), '/shop')
})
test('Greek account enforces authentication and preserves safe localized redirect', async () => {
  process.env.SESSION_SECRET = 'test-password-longer-than-thirty-two-characters'
  const { proxy } = await import('../proxy.ts')
  const { NextRequest } = await import('next/server.js')
  for (const prefix of ['', '/el']) {
    const response = await proxy(new NextRequest(`${site}${prefix}/account?tab=orders`))
    assert.equal(response.status, 307)
    const destination = new URL(response.headers.get('location'))
    assert.equal(destination.pathname, `${prefix}/sign-in`)
    assert.equal(destination.searchParams.get('redirect_url'), `${prefix}/account?tab=orders`)
  }
  const { sealData } = await import('iron-session')
  const cookie = await sealData({ wcCustomerId: 42 }, { password: process.env.SESSION_SECRET })
  const signedIn = await proxy(new NextRequest(`${site}/el/account?tab=orders`, { headers: { cookie: `mm_session=${cookie}` } }))
  assert.equal(signedIn.headers.get('x-middleware-rewrite'), `${site}/account?tab=orders`)
  assert.equal(signedIn.headers.get('x-middleware-request-x-meister-locale'), 'el')
})
test('Greek SEO canonical/hreflang retains catalog names and excludes private alternates', async () => {
  const metadata = buildPageMetadata({ title: 'Contact Meister', description: 'Meister customer service email, telephone and store address in Aigaleo, Greece.', path: '/contact', locale: 'el' }, production)
  assert.equal(metadata.title, 'Επικοινωνία με τη Meister')
  assert.equal(metadata.alternates.canonical, `${site}/el/contact`)
  assert.deepEqual(metadata.alternates.languages, { en: `${site}/contact`, el: `${site}/el/contact`, 'x-default': `${site}/contact` })
  assert.equal(metadata.openGraph.locale, 'el_GR')
  const product = buildProductMetadata({ id: '12', slug: '%CF%80', name: 'Carbon X', shortDescriptionHtml: '', descriptionHtml: '', gallery: [] }, production, 'el')
  assert.equal(product.title, 'Carbon X — Meister')
  assert.equal(product.alternates.canonical, `${site}/el/products/%CF%80`)
  const privatePage = buildPageMetadata({ title: 'Cart', description: 'Cart', path: '/cart', locale: 'el', noindex: true }, production)
  assert.equal(privatePage.alternates.languages, undefined)
  const urls = buildSitemapUrls([{ id: '12', slug: '%CF%80' }], ['fins'], production)
  assert.ok(urls.includes(`${site}/el/fins`))
  assert.ok(!urls.some(url => url.includes('/el/docs')))
  const xml = await (await sitemapResponse(async () => [], ['fins'], production)).text()
  assert.match(xml, /hreflang="el"/)
})

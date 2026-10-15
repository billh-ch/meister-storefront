import './helpers/typescript-imports.mjs'
import { registerHooks } from 'node:module'
import test from 'node:test'
import assert from 'node:assert/strict'
const modules = {
  '@/lib/i18n/server': `import { translate } from '${new URL('../lib/i18n/index.ts', import.meta.url)}'; export const getLocale = async () => globalThis.localeFixture.locale; export const getTranslator = async () => source => translate(globalThis.localeFixture.locale, source)`,
  '@/lib/auth/session': 'export const getSession = async () => globalThis.localeFixture.session; export const login = async () => {}; export const logout = async () => { globalThis.localeFixture.loggedOut = true }',
  'next/navigation': 'export const redirect = url => { throw new Error(url) }',
  'next/cache': 'export const revalidatePath = () => {}',
  'next/server': 'export const NextResponse = Response',
  '@/lib/woocommerce/queries/create-customer': 'export class DuplicateEmailError extends Error {}; export const createWcCustomer = async () => { throw new Error("offline") }; export const findWcCustomerByEmail = async () => null',
  '@/lib/woocommerce/queries/update-customer-address': 'export const updateWcCustomerAddress = async () => { throw new Error("offline") }',
  '@/lib/auth/backend-login': 'export const requestCustomerToken = async () => globalThis.localeFixture.authResponse ?? Response.json({}, { status: 401 })',
  '@/lib/cart/cookie': 'export const getCart = async () => []; export const setCart = async () => {}',
  '@/lib/cart/resolve': 'export const resolveCartItems = async () => { throw new Error("offline") }',
  '@/lib/woocommerce': 'export const getProductById = async () => null',
  '@/lib/checkout/get-shipping-quote': 'export const getShippingQuote = async () => ({ status: "cart", error: "Your saved cart needs attention before delivery can be calculated.", issues: [{ name: "Catalog name", slug: "catalog", message: "That option is out of stock." }] })',
  '@/lib/wishlist/account': 'export const readAccountWishlist = async () => []; export const changeAccountWishlist = async () => []',
  '@/lib/compare/catalog': 'export const fetchCompareCatalog = async () => { throw new Error("offline") }',
}
registerHooks({ resolve(specifier, context, next) { const source = modules[specifier] ?? (context.parentURL?.endsWith("/lib/auth/actions.ts") && specifier === "./backend-login" ? modules["@/lib/auth/backend-login"] : context.parentURL?.endsWith("/lib/auth/actions.ts") && specifier === "./session" ? modules["@/lib/auth/session"] : context.parentURL?.endsWith("/lib/cart/actions.ts") && specifier === "./cookie" ? modules["@/lib/cart/cookie"] : undefined); return source ? { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true } : next(specifier, context) } })
const { translate } = await import('../lib/i18n/index.ts')
const { requestLocaleSchema } = await import('../lib/i18n/request.ts')
const auth = await import('../lib/auth/actions.ts')
const account = await import('../lib/account/actions.ts')
const cart = await import('../lib/cart/actions.ts')
const shipping = await import('../app/api/checkout/shipping/route.ts')
const saved = await import('../app/api/wishlist/route.ts')
const compared = await import('../app/api/compare/route.ts')
const cartRoute = await import('../app/api/cart/route.ts')
const post = (path, data) => new Request(`https://fixture.invalid${path}`, { method: 'POST', headers: { origin: 'https://fixture.invalid' }, body: JSON.stringify(data) })
const address = { firstName: 'Test', lastName: 'Customer', address1: 'Fixture 1', city: 'Athens', postcode: '10558', country: 'GR', phone: '2100000000' }

test('API locales default only on omission and reject malformed explicit input', () => {
  assert.equal(requestLocaleSchema.parse(undefined), 'en')
  assert.equal(requestLocaleSchema.parse('el'), 'el')
  for (const value of ['gr', '', 'EL', null, 1, ['el']]) assert.equal(requestLocaleSchema.safeParse(value).success, false)
})
for (const locale of ['en', 'el']) test(`server actions return ${locale} errors and logout keeps locale`, async () => {
  globalThis.localeFixture = { locale, session: {} }
  const t = source => translate(locale, source)
  assert.equal((await auth.loginAction({ email: '', password: '' })).error, t('Please enter your email and password.'))
  assert.equal((await auth.registerAction({ email: '', password: '', firstName: '', lastName: '' })).error, t('Please fill in every field with a valid email and an 8+ character password.'))
  assert.equal((await account.updateAddressAction(address)).error, t('Please sign in to continue.'))
  globalThis.localeFixture.session = { wcCustomerId: 901 }
  assert.equal((await account.updateAddressAction(address)).error, t('Could not save your address. Please try again.'))
  assert.equal((await cart.addToCartAction({ productId: '999', quantity: 1 })).error, t('This product is no longer available.'))
  await assert.rejects(auth.logoutAction(), { message: locale === 'el' ? '/el' : '/' })
  assert.equal(globalThis.localeFixture.loggedOut, true)
})
test('stable shipping route localizes refreshed errors and issues without changing catalog identity', async () => {
  const response = await shipping.POST(post('/api/checkout/shipping', { country: 'GR', locale: 'el' }))
  const body = await response.json()
  assert.equal(body.error, translate('el', 'Your saved cart needs attention before delivery can be calculated.'))
  assert.deepEqual(body.issues, [{ name: 'Catalog name', slug: 'catalog', message: translate('el', 'That option is out of stock.') }])
  assert.equal((await shipping.POST(post('/api/checkout/shipping', { country: 'GR', locale: 'gr' }))).status, 400)
})
test('cart and saved-product APIs explicitly validate and localize locale', async () => {
  globalThis.localeFixture = { locale: 'en', session: {} }
  const response = await cartRoute.GET(new Request('https://fixture.invalid/api/cart?locale=el'))
  assert.equal((await response.json()).error, translate('el', 'Could not verify your cart. Please try again.'))
  assert.equal((await compared.GET(new Request('https://fixture.invalid/api/compare?ids=1&locale=gr'))).status, 400)
  const comparison = await compared.GET(new Request('https://fixture.invalid/api/compare?ids=1&locale=el'))
  assert.equal((await comparison.json()).error, translate('el', 'Could not load products for comparison. Please retry.'))
  const wishlist = await saved.POST(post('/api/wishlist', { customerId: 901, additions: [], removals: [], locale: 'el' }))
  assert.equal(wishlist.status, 401)
  assert.equal((await wishlist.json()).error, translate('el', 'Please sign in again.'))
})

test('invalid provider login data becomes a localized customer error without leaking exceptions', async () => {
  process.env.NEXT_PUBLIC_WC_URL = 'https://fixture.invalid'
  globalThis.localeFixture = { locale: 'el', session: {}, authResponse: new Response('malformed provider data') }
  assert.deepEqual(await auth.loginAction({ email: 'qa@fixture.invalid', password: 'fixture' }), { ok: false, error: translate('el', 'Sign-in failed. Please try again.') })
})
test('comparison and locale API validation errors have authored Greek translations', () => {
  for (const source of ['Invalid language selection.', 'Choose up to four unique products.', 'Could not load products for comparison. Please retry.']) assert.notEqual(translate('el', source), source)
})
test('authentication destination validation stays safe before either locale is applied', async () => {
  const { getSafeRedirectUrl } = await import('../lib/auth/safe-redirect.ts')
  const { localePath } = await import('../lib/i18n/index.ts')
  for (const locale of ['en', 'el']) {
    for (const unsafe of ['https://evil.invalid', '//evil.invalid', '/\\evil.invalid', '/\t/evil.invalid', '/\n/evil.invalid']) assert.equal(localePath(getSafeRedirectUrl(unsafe), locale), locale === 'el' ? '/el/account' : '/account')
    assert.equal(localePath(getSafeRedirectUrl('/checkout?ref=a%20b#details'), locale), locale === 'el' ? '/el/checkout?ref=a%20b#details' : '/checkout?ref=a%20b#details')
  }
})

import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
const { requiresBoxNowLocker, boxNowWidgetUrl, lockerFromWidgetMessage, lockerToStripeMetadata, lockerFromStripeMetadata, lockerOrderMetaData } = await import('../lib/checkout/box-now.ts')
const { resolveCheckoutLocker } = await import('../lib/checkout/get-box-now-locker.ts')

const locker = { id: '3', name: 'BOX NOW Test locker', address: 'Test Street 144', postcode: '18545', country: 'GR' }
const widgetMessage = { boxnowLockerId: 3, boxnowLockerName: locker.name, boxnowLockerAddressLine1: locker.address, boxnowLockerPostalCode: locker.postcode, boxnowCountry: 'GR' }

test('only the actual BOX NOW method in Greece needs a locker', () => {
  assert.equal(requiresBoxNowLocker('GR', 'box_now_delivery'), true)
  for (const [country, method] of [['CY', 'box_now_delivery'], ['GR', 'flat_rate'], ['GR', 'local_pickup'], ['GR', 'BOX NOW']]) assert.equal(requiresBoxNowLocker(country, method), false)
})
test('the embedded map works without credentials and is restricted to Greece', () => {
  const url = new URL(boxNowWidgetUrl('10558'))
  assert.equal(url.origin, 'https://widget-v5.boxnow.gr')
  assert.equal(url.pathname, '/iframe.html')
  assert.equal(url.searchParams.get('countryCode'), 'gr')
  assert.equal(url.searchParams.get('gps'), 'no')
  assert.equal(url.searchParams.get('autoselect'), 'yes')
  assert.equal(url.searchParams.get('zip'), '10558')
  assert.equal(url.searchParams.has('partnerId'), false)
  assert.equal(new URL(boxNowWidgetUrl('10558', '123')).searchParams.get('partnerId'), '123')
})
test('only messages from the selected Greek iframe can select a valid locker', () => {
  assert.deepEqual(lockerFromWidgetMessage(widgetMessage, 'https://widget-v5.boxnow.gr', true), locker)
  for (const [data, origin, matches] of [
    [widgetMessage, 'https://widget-v5.boxnow.gr.evil.example', true],
    [widgetMessage, 'https://widget-v5.boxnow.gr', false],
    [{ ...widgetMessage, boxnowCountry: 'CY' }, 'https://widget-v5.boxnow.gr', true],
    [{ ...widgetMessage, boxnowLockerId: '../orders' }, 'https://widget-v5.boxnow.gr', true],
    ['closeIframe', 'https://widget-v5.boxnow.gr', true],
    [null, 'https://widget-v5.boxnow.gr', true],
  ]) assert.equal(lockerFromWidgetMessage(data, origin, matches), null)
})
test('locker details survive Stripe metadata and match the WooCommerce plugin fields', () => {
  const metadata = lockerToStripeMetadata(locker)
  assert.deepEqual(lockerFromStripeMetadata(metadata), locker)
  assert.ok(Object.values(metadata).every(value => value.length <= 500))
  assert.deepEqual(lockerOrderMetaData(locker), [
    { key: '_boxnow_locker_id', value: locker.id },
    { key: '_boxnow_locker_name', value: locker.name },
    { key: '_boxnow_locker_address', value: locker.address },
    { key: '_boxnow_locker_postal_code', value: locker.postcode },
  ])
  assert.equal(lockerFromStripeMetadata({}), undefined, 'Legacy paid sessions can still be fulfilled')
  assert.throws(() => lockerFromStripeMetadata({ boxnow_locker_id: '3' }), /locker/i)
})
test('BOX NOW requires a locker server-side while courier checkout never queries BOX NOW', async () => {
  const original = globalThis.fetch
  globalThis.fetch = () => { throw new Error('No request expected') }
  try {
    assert.equal(await resolveCheckoutLocker('GR', 'flat_rate', { id: '3' }), undefined)
    assert.equal(await resolveCheckoutLocker('CY', 'box_now_delivery', { id: '3' }), undefined)
    await assert.rejects(resolveCheckoutLocker('GR', 'box_now_delivery'), /select.*locker/i)
    await assert.rejects(resolveCheckoutLocker('GR', 'box_now_delivery', { id: '../orders' }), /select.*locker/i)
  } finally { globalThis.fetch = original }
})
test('the server gets canonical locker details from the public Greek directory without keys', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://globallockersprod.z28.web.core.windows.net/PROD/greece/lockers/3.json')
    assert.equal(options.cache, 'no-store')
    assert.equal(new Headers(options.headers).has('authorization'), false)
    return Response.json({ id: '3', name: locker.name, addressLine1: locker.address, postalCode: locker.postcode, country: 'GR', sizes: ['1', '2', '3'] })
  }
  try { assert.deepEqual(await resolveCheckoutLocker('GR', 'box_now_delivery', { id: '3', name: 'Forged name' }), locker) }
  finally { globalThis.fetch = original }
})
test('missing, mismatched or foreign lockers and service failures stop payment', async () => {
  const original = globalThis.fetch
  try {
    for (const response of [Response.json({}, { status: 404 }), Response.json({ id: '4', name: 'Wrong locker', addressLine1: 'Street', postalCode: '10558', country: 'GR' }), Response.json({ id: '3', name: 'Foreign locker', addressLine1: 'Street', postalCode: '10558', country: 'CY' })]) {
      globalThis.fetch = async () => response
      await assert.rejects(resolveCheckoutLocker('GR', 'box_now_delivery', { id: '3' }), /locker/i)
    }
    globalThis.fetch = async () => { throw new Error('Offline') }
    await assert.rejects(resolveCheckoutLocker('GR', 'box_now_delivery', { id: '3' }), /verify.*locker/i)
  } finally { globalThis.fetch = original }
})

test('Greek BOX NOW language keeps the proven Greece iframe selection contract', () => {
  const url = new URL(boxNowWidgetUrl('10558', '123', 'el'))
  assert.equal(url.searchParams.get('language'), 'gr')
  assert.equal(url.searchParams.get('countryCode'), 'gr')
  assert.equal(url.searchParams.get('autoselect'), 'yes')
  assert.equal(url.searchParams.get('autoclose'), 'no')
  assert.equal(new URL(boxNowWidgetUrl('10558')).searchParams.get('language'), 'en')
})

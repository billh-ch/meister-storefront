import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { products } from '../lib/mock-data.ts'

const base = process.env.TEST_BASE_URL ?? 'http://localhost:3001'
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] })
const variable = products.find(product => product.type === 'variable' && product.stockStatus !== 'outofstock')
const simple = products.find(product => product.type === 'simple' && product.stockStatus !== 'outofstock')
const seed = (context, cart) => context.addCookies([{ name: 'mm_cart', value: Buffer.from(JSON.stringify(cart)).toString('base64url'), url: base }])
try {
  for (const width of [320, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    await seed(page.context(), [{ productId: simple.id, quantity: 1 }, { productId: variable.id, quantity: 1 }])
    await page.goto(base + '/checkout')
    const alert = page.getByRole('alert').filter({ hasText: 'Your saved cart needs attention' })
    await alert.waitFor()
    assert.ok((await alert.innerText()).includes(variable.name), 'The failing product is identified')
    assert.ok((await alert.innerText()).includes('Options'), 'The missing option is identified')
    assert.equal(await page.getByText(/No delivery method/).count(), 0, 'Old carts must not blame country configuration')
    await alert.getByRole('link', { name: 'Review cart' }).click()
    const line = page.locator('[data-cart-line]').filter({ hasText: variable.name })
    await line.getByRole('button', { name: 'Remove', exact: true }).click()
    await line.waitFor({ state: 'detached' })
    const cart = await page.evaluate(async () => (await fetch('/api/cart')).json())
    assert.equal(cart.lines.length, 1, 'Repair must preserve the other cart item')
    assert.equal(cart.lines[0].productId, simple.id)
    await page.goto(base + '/checkout')
    await page.getByRole('radio').first().waitFor()
    const phone = await page.getByLabel('Phone', { exact: true }).boundingBox()
    const delivery = await page.getByRole('group', { name: 'Delivery method' }).boundingBox()
    assert.ok(delivery.y > phone.y + phone.height, 'Delivery follows every address field')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No checkout overflow at ${width}`)
    if (width < 1024) {
      const total = await page.getByText('TOTAL', { exact: true }).boundingBox()
      const pay = await page.getByRole('button', { name: 'Continue to payment', exact: true }).boundingBox()
      assert.ok(total.y < pay.y, 'Mobile customers can review the total before payment')
    }
    await page.context().close()
    console.log(`PASS saved guest cart recovery, delivery order, summary and layout ${width}px`)
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } })
  const size = variable.options.split('/').map(value => value.trim()).filter(Boolean)[0]
  await seed(page.context(), [{ productId: variable.id, selectedOptions: { Options: size }, quantity: 1 }])
  await page.goto(base + '/checkout')
  await page.getByRole('radio').first().waitFor()
  const cart = await page.evaluate(async () => (await fetch('/api/cart')).json())
  assert.ok(cart.lines[0].resolvedVariationId, 'Complete old options recover the current variation')
  let actions = 0
  await page.route('**/checkout', async route => {
    if (route.request().method() === 'POST') { actions++; await route.fulfill({ status: 404, headers: { 'x-nextjs-action-not-found': '1' }, body: 'Server action not found.' }) }
    else await route.continue()
  })
  let fail = true
  await page.route('**/api/checkout/shipping', async route => {
    if (fail) { fail = false; await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ status: 'error', error: 'Could not calculate delivery. Please try again.' }) }) }
    else await route.continue()
  })
  await page.getByLabel('Postcode', { exact: true }).fill('10558')
  await page.getByRole('alert').filter({ hasText: 'Could not calculate delivery' }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Continue to payment', exact: true }).isDisabled(), true)
  assert.equal(await page.getByText('Pending delivery', { exact: true }).count(), 1)
  await page.getByRole('button', { name: 'Retry delivery calculation' }).click()
  await page.waitForFunction(() => !document.querySelector('button[type="submit"]').disabled)
  assert.equal(await page.getByLabel('Postcode', { exact: true }).inputValue(), '10558')
  await page.getByLabel('Country', { exact: true }).selectOption('CY')
  await page.waitForFunction(() => !document.querySelector('button[type="submit"]').disabled)
  await page.getByLabel('Country', { exact: true }).selectOption('GR')
  await page.waitForFunction(() => !document.querySelector('button[type="submit"]').disabled)
  assert.equal(actions, 0, 'Delivery estimates never call build-specific Server Actions')
  for (const [label, value] of [['Email for order confirmation', 'qa@example.com'], ['First name', 'Test'], ['Last name', 'Customer'], ['Address', 'Ermou 1'], ['City', 'Athens'], ['Phone', '+302100000000']]) await page.getByLabel(label, { exact: true }).fill(value)
  await page.waitForFunction(() => !document.querySelector('button[type="submit"]').disabled)
  await page.route('**/api/checkout/session', route => route.abort('failed'))
  await page.getByRole('button', { name: 'Continue to payment', exact: true }).click()
  await page.getByText('Could not prepare checkout. Please try again. Your details have been kept.', { exact: true }).waitFor()
  assert.equal(await page.getByLabel('Email for order confirmation').inputValue(), 'qa@example.com')
  assert.equal(await page.getByLabel('Address', { exact: true }).inputValue(), 'Ermou 1')
  console.log('PASS legacy selections, stable delivery endpoint, service failure/retry, destination changes and retained payment details')
} finally { await browser.close() }

import assert from 'node:assert/strict'
import { chromium } from 'playwright'

// Run against an explicitly mock-mode development server, never the public store.
const baseURL = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3001'
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH && { executablePath: process.env.CHROMIUM_PATH }),
  args: ['--no-sandbox'],
})
try {
  const page = await browser.newPage()
  for (const width of [360, 375, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(baseURL)
    await page.evaluate(() => document.fonts.ready)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Horizontal overflow at ${width}px`)
    if (width < 768) {
      const menu = page.getByRole('button', { name: 'Open menu', exact: true })
      await menu.click()
      assert.equal(await page.getByRole('button', { name: 'Close menu', exact: true }).getAttribute('aria-expanded'), 'true')
      await page.getByRole('button', { name: 'Close menu', exact: true }).click()
    }
    console.log(`PASS: viewport and navigation ${width}px`)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${baseURL}/shop`)
  const card = page.locator('article').filter({ has: page.getByRole('button', { name: /Add .* to cart/ }) }).first()
  await card.getByRole('button', { name: /Add .* to cart/ }).click()
  await page.waitForFunction(() => document.body.textContent.includes('ADDED TO CART'))
  const drawer = page.getByRole('dialog', { name: 'Your cart' })
  await drawer.waitFor({ state: 'visible' })
  await drawer.getByRole('link', { name: 'Checkout', exact: true }).waitFor()
  let releaseMutation
  const mutationGate = new Promise(resolve => { releaseMutation = resolve })
  await page.route('**/shop', async route => {
    if (route.request().method() === 'POST') await mutationGate
    await route.continue()
  })
  await drawer.getByRole('button', { name: 'Increase quantity' }).click()
  assert.equal(await drawer.getByRole('link', { name: 'Checkout', exact: true }).count(), 0, 'Checkout must wait for a pending cart mutation')
  releaseMutation()
  await page.waitForFunction(() => document.querySelector('dialog input[type="number"]')?.value === '2')
  await page.waitForFunction(() => document.querySelector('a[aria-label="Shopping cart, 2 items"]'))
  await page.keyboard.press('Escape')
  await drawer.waitFor({ state: 'hidden' })
  assert.equal(await page.evaluate(() => document.body.style.overflow), '')
  await page.getByRole('link', { name: /Shopping cart/ }).click()
  await drawer.waitFor({ state: 'visible' })
  assert.ok(page.url().endsWith('/shop'), 'Cart icon should preserve the shopping page')
  await drawer.getByRole('button', { name: 'Close cart' }).click()
  console.log('PASS: cart drawer opens after add, Escape closes it and header reopens it')
  await page.goto(`${baseURL}/checkout`)
  await page.getByRole('link', { name: /Shopping cart/ }).click()
  await drawer.waitFor({ state: 'visible' })
  assert.equal(await drawer.getByRole('button', { name: 'Increase quantity' }).count(), 0, 'Checkout cart edits must go through the full cart to keep its payment summary current')
  await drawer.getByRole('button', { name: 'Close cart' }).click()
  const country = page.getByLabel('Country', { exact: true })
  assert.equal(await country.evaluate(element => element.tagName), 'SELECT')
  await country.selectOption('CY')
  assert.equal(await country.inputValue(), 'CY')
  await page.getByRole('button', { name: 'Continue to payment', exact: true }).waitFor({ state: 'visible' })
  await page.waitForFunction(() => !document.querySelector('button[type="submit"]').disabled)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Checkout overflow')
  console.log('PASS: add-to-cart, named-country selection and shipping refresh')
  await page.getByRole('radio', { name: /Store pickup/ }).check()
  await page.getByLabel('Postcode', { exact: true }).pressSequentially('12243', { delay: 25 })
  await page.waitForFunction(() => !document.querySelector('button[type="submit"]').disabled)
  assert.equal(await page.getByRole('radio', { name: /Store pickup/ }).isChecked(), true, 'Address typing must preserve available delivery choices')
  console.log('PASS: rapid address typing preserves the selected pickup method')
  let failNextRateRequest = true
  await page.route('**/checkout', async route => {
    if (route.request().method() === 'POST' && failNextRateRequest) {
      failNextRateRequest = false
      await route.abort('failed')
    } else {
      await route.continue()
    }
  })
  await page.getByLabel('Postcode', { exact: true }).fill('12244')
  await page.getByRole('alert').filter({ hasText: 'Could not calculate delivery' }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Continue to payment', exact: true }).isDisabled(), true)
  await page.getByRole('button', { name: 'Retry delivery calculation' }).click()
  await page.waitForFunction(() => !document.querySelector('button[type="submit"]').disabled)
  console.log('PASS: failed shipping calculation blocks payment and supports retry')
  for (const [label, value] of [['Email for order confirmation', 'qa@example.com'], ['First name', 'Test'], ['Last name', 'Customer'], ['Address', 'Test Street 1'], ['City', 'Athens'], ['Phone', '+302105317549']]) {
    await page.getByLabel(label, { exact: true }).fill(value)
  }
  await page.waitForFunction(() => !document.querySelector('button[type="submit"]').disabled)
  await page.getByRole('button', { name: 'Continue to payment', exact: true }).click()
  await page.getByText('Payments are unavailable in mock-data mode. Connect WooCommerce to continue.', { exact: true }).waitFor()
  console.log('PASS: fixture products cannot create Stripe payments or real orders')
  await page.goto(`${baseURL}/cart`)
  await page.getByRole('link', { name: /Shopping cart/ }).click()
  await drawer.waitFor({ state: 'visible' })
  let failNextCartMutation = true
  await page.route('**/cart', async route => {
    if (route.request().method() === 'POST' && failNextCartMutation) {
      failNextCartMutation = false
      await route.abort('failed')
    } else await route.continue()
  })
  await drawer.getByRole('button', { name: 'Remove', exact: true }).click()
  await drawer.getByRole('alert').filter({ hasText: 'Could not update your cart' }).waitFor()
  await drawer.getByRole('button', { name: 'Remove', exact: true }).click()
  await drawer.getByText('Your cart is empty.', { exact: true }).waitFor()
  assert.equal(await drawer.getByRole('link', { name: 'Checkout', exact: true }).count(), 0)
  console.log('PASS: cart quantities, badge and drawer removal stay in sync')
} finally {
  await browser.close()
}

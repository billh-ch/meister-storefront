// Mock-mode UI check for the checkout discount code. The coupon API is stubbed:
// server-side rules are covered by coupons.test.mjs and stripe-fulfillment.test.mjs.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import './helpers/typescript-imports.mjs'
const { products } = await import('../lib/mock-data.ts')

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3001'
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] })
const simple = products.find(product => product.type === 'simple' && product.stockStatus !== 'outofstock')
const fields = [['Email for order confirmation', 'qa@example.com'], ['First name', 'Test'], ['Last name', 'Customer'], ['Address', 'Test Street 1'], ['City', 'Athens'], ['Phone', '+302101234567'], ['Postcode', '10558']]
try {
  // English only: Greek strings are covered by the i18n unit tests, and the Greek
  // browser suites need a server that renders /el (see tests/locale*.browser.mjs).
  for (const [width, locale, prefix] of [[390, 'en', ''], [1440, 'en', '']]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    await page.context().addCookies([{ name: 'mm_cart', value: Buffer.from(JSON.stringify([{ productId: simple.id, quantity: 1 }])).toString('base64url'), url: base }])
    let sessionRequests = 0, sessionBody
    await page.route('**/api/checkout/coupon', async route => {
      const { code } = route.request().postDataJSON()
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(code === 'TESTCOUPON' ? { ok: true, code: 'TESTCOUPON', discount: 5 } : { ok: false, error: locale === 'el' ? 'Μη έγκυρος κωδικός' : "This discount code isn't valid." }) })
    })
    await page.route('**/api/checkout/session', async route => {
      sessionRequests++; sessionBody = route.request().postDataJSON()
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ error: 'stub' }) })
    })
    await page.goto(base + prefix + '/checkout')
    await page.getByRole('radio').first().waitFor()
    const input = page.locator('#checkout-coupon')
    await input.waitFor()
    const summaryTotal = async () => (await page.getByText(/^(TOTAL|ΣΥΝΟΛΟ)$/).locator('xpath=following-sibling::*[1]').innerText()).replace(/\s/g, '')
    const before = await summaryTotal()

    await input.fill('NOPE')
    await input.press('Enter')
    await page.getByRole('alert').filter({ hasText: locale === 'el' ? 'Μη έγκυρος' : "isn't valid" }).waitFor()
    assert.equal(sessionRequests, 0, 'Enter in the discount field must never start payment')
    assert.equal(await summaryTotal(), before, 'A refused code leaves the total unchanged')

    await input.fill('TESTCOUPON')
    await input.press('Enter')
    await page.getByText('TESTCOUPON').first().waitFor()
    assert.equal(sessionRequests, 0)
    assert.notEqual(await summaryTotal(), before, 'Applied discount lowers the total')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No overflow at ${width}`)

    for (const [label, value] of fields) await page.getByLabel(label, { exact: true }).fill(value)
    await page.waitForFunction(() => !document.querySelector('button[type="submit"]').disabled)
    await page.locator('button[type="submit"]').click()
    await page.waitForFunction(() => document.body.textContent.includes('stub') || true)
    for (let i = 0; i < 50 && sessionRequests === 0; i++) await page.waitForTimeout(100)
    assert.equal(sessionRequests, 1)
    assert.equal(sessionBody.couponCode, 'TESTCOUPON')
    assert.equal(sessionBody.expected.discount, 5)

    await page.getByRole('button', { name: locale === 'el' ? 'Αφαίρεση' : 'Remove', exact: true }).click()
    await input.waitFor()
    assert.equal(await summaryTotal(), before, 'Removing the code restores the total')
    await page.context().close()
    console.log(`PASS discount code apply, refuse, remove and payload ${locale} ${width}px`)
  }
} finally { await browser.close() }

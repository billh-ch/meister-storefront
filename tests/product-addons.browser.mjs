import assert from 'node:assert/strict'
import { chromium } from 'playwright'

// Mock-mode only (NEXT_PUBLIC_USE_MOCK_DATA=true): the mock "Camouflage
// Wetsuit 3mm" (id 4, €289) carries sample add-ons. Mutates the cart cookie of
// a fresh browser context; never pays or creates orders.
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3001'
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] })
const euro = text => text.replace(/ /g, ' ')
// Polls the server-priced cart; Playwright's waitForFunction does not await async predicates.
async function waitForLines(read, count) {
  for (let i = 0; i < 100; i++) { const cart = await read(); if (cart.lines?.length === count) return cart; await new Promise(r => setTimeout(r, 100)) }
  throw new Error(`cart never reached ${count} lines`)
}
async function run(viewport) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const readCart = () => page.evaluate(async () => (await fetch('/api/cart')).json())
  await page.goto(`${baseURL}/products/wetsuit-3mm`)
  const price = page.locator('span.text-\\[\\#FFD700\\].text-2xl').first()
  assert.equal(euro(await price.innerText()), '289,00 €')

  const camo = page.locator('[data-addon-group="camo"]')
  assert.equal(await camo.getByRole('radio', { name: 'None' }).isChecked(), true, 'single groups start on None')
  await camo.getByRole('radio', { name: /Full camo pattern/ }).check()
  await page.locator('[data-addon-group="extras"]').getByRole('checkbox', { name: /Knee pads/ }).check()
  await page.waitForFunction(() => document.querySelector('[data-line-price]')?.textContent?.includes('354'))
  assert.equal(euro(await price.innerText()), '354,00 €', '289 + 40 + 25')
  await camo.getByRole('radio', { name: /Split camo pattern/ }).check()
  assert.equal(await camo.getByRole('radio', { name: /Full camo pattern/ }).isChecked(), false, 'one camo choice at a time')
  assert.equal(euro(await price.innerText()), '344,00 €')
  await page.getByRole('button', { name: 'Increase quantity' }).first().click()
  await page.waitForFunction(() => document.querySelector('[data-line-price]')?.textContent?.includes('688'))
  console.log(`PASS ${viewport.width}px: add-on selector shows unit and line prices`)

  await page.getByRole('button', { name: 'Add to cart' }).first().click()
  await page.getByText(/Added to cart/).first().waitFor()
  // Same wetsuit without add-ons must be its own line.
  await camo.getByRole('radio', { name: 'None' }).check()
  await page.locator('[data-addon-group="extras"]').getByRole('checkbox', { name: /Knee pads/ }).uncheck()
  await page.getByRole('button', { name: 'Decrease quantity' }).first().click()
  await page.getByRole('button', { name: 'Add to cart' }).first().click()
  await waitForLines(readCart, 2)

  const cart = await readCart()
  assert.deepEqual(cart.lines.map(line => [line.quantity, line.unitPrice, line.addons ?? []]), [[2, 344, ['camo:split', 'extras:knee-pads']], [1, 289, []]])
  assert.equal(cart.subtotal, 2 * 344 + 289)

  // A forged cookie price or an unknown add-on can't change what is charged.
  const forged = [
    { productId: '4', quantity: 1, addons: ['camo:full'], unitPrice: 1 },
    { productId: '4', quantity: 1, addons: ['camo:gold'] },
  ]
  await context.addCookies([{ name: 'mm_cart', value: Buffer.from(JSON.stringify(forged)).toString('base64url'), url: baseURL }])
  const tampered = await readCart()
  assert.deepEqual(tampered.lines.map(line => [line.unitPrice, line.purchasable]), [[329, true], [289, false]])
  assert.equal(tampered.subtotal, 329)
  console.log(`PASS ${viewport.width}px: cart lines re-price add-ons server-side and refuse unknown ones`)

  await page.goto(`${baseURL}/cart`)
  await page.locator('[data-cart-addons]').first().getByText(/Full camo pattern/).waitFor()
  await page.getByText(/An add-on you chose is no longer available/).waitFor()
  const removeButtons = page.getByRole('button', { name: 'Remove', exact: true })
  await removeButtons.nth(1).click()
  await waitForLines(readCart, 1)
  assert.deepEqual((await readCart()).lines[0].addons, ['camo:full'], 'removing one line leaves the add-on line intact')
  console.log(`PASS ${viewport.width}px: cart page lists add-ons and removes the right line`)

  // Greek add-on names come from the product data, through the same server
  // cart pricing (the /el page shell is covered by the locale browser tests).
  const greek = await page.evaluate(async () => (await fetch('/api/cart?locale=el')).json())
  assert.deepEqual(greek.lines[0].chosenAddons.map(addon => addon.optionName), ['Πλήρες μοτίβο παραλλαγής'])
  assert.equal(greek.lines[0].unitPrice, 329)
  console.log(`PASS ${viewport.width}px: Greek cart shows Greek add-on names at the same price`)
  await context.close()
}
try {
  await run({ width: 390, height: 844 })
  await run({ width: 1280, height: 900 })
} finally {
  await browser.close()
}

import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { products } from '../lib/mock-data.ts'

const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3001'
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--no-sandbox'],
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const selections = [{ Size: 'M' }, { Size: 'L' }]
// Reproduce WooCommerce variable products whose variations have no usable
// attributes: the buy box stores selections without a variation ID. Seed
// the same valid cookie shape against mock catalog IDs; no real orders.
const lines = selections.map(selectedOptions => ({ productId: products[0].id, selectedOptions, quantity: 1 }))
await page.context().addCookies([{ name: 'mm_cart', value: Buffer.from(JSON.stringify(lines)).toString('base64url'), url: baseURL }])
const readCart = () => page.evaluate(async () => (await fetch('/api/cart')).json())
try {
  await page.goto(`${baseURL}/shop`)
  const initial = await readCart()
  assert.deepEqual(initial.lines.map(line => line.selectedOptions), selections, 'Resolved lines must retain the exact stored selections for mutations')
  await page.getByRole('link', { name: /Shopping cart/ }).click()
  const drawer = page.getByRole('dialog', { name: 'Your cart' })
  const items = drawer.locator('li')
  await items.first().getByRole('button', { name: 'Increase quantity' }).click()
  await page.waitForFunction(() => document.querySelector('dialog input[type="number"]')?.value === '2')
  assert.deepEqual((await readCart()).lines.map(line => line.quantity), [2, 1], 'Only the selected line should increase')
  await items.first().getByRole('button', { name: 'Decrease quantity' }).click()
  await page.waitForFunction(() => document.querySelector('dialog input[type="number"]')?.value === '1')
  await items.first().getByRole('button', { name: 'Remove', exact: true }).click()
  await page.waitForFunction(() => document.querySelectorAll('dialog li').length === 1)
  const remaining = await readCart()
  assert.deepEqual(remaining.lines[0].selectedOptions, selections[1], 'Removal must preserve the other selection')
  console.log('PASS: option-only cart lines update and remove independently')
  const image = items.first().getByRole('img', { name: products[0].name, exact: true })
  assert.equal(await image.count(), 1, 'Popup cart must render a product thumbnail')
  await image.waitFor()
  await page.waitForFunction(() => { const img = document.querySelector('dialog li img'); return img?.complete && img.naturalWidth > 0 })
  console.log('PASS: popup cart displays a loaded product thumbnail')
  await items.first().getByRole('button', { name: 'Remove', exact: true }).click()
  await drawer.getByText('Your cart is empty.', { exact: true }).waitFor()
} finally {
  await browser.close()
}

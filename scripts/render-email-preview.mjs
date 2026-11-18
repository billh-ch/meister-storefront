// Renders sample order emails to HTML files for design review (sends nothing).
// Usage: node scripts/render-email-preview.mjs <output-dir>
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Local previews load the receipt edge (and a stand-in product photo) from ./public instead of the live site.
const publicUrl = pathToFileURL(resolve('public')).href
process.env.EMAIL_ASSET_BASE_URL = publicUrl
const PHOTO = 'https://photos.example/fins.jpg'
import '../tests/helpers/typescript-imports.mjs'
const { buildOrderConfirmation, buildOrderCompleted } = await import('../lib/email/templates/customer.ts')
const { buildOwnerAlert } = await import('../lib/email/templates/owner.ts')

const dir = process.argv[2]
if (!dir) { console.error('Usage: node scripts/render-email-preview.mjs <output-dir>'); process.exit(1) }
mkdirSync(dir, { recursive: true })
const order = {
  id: 612, number: '612', status: 'processing', currency: 'EUR', date_created_gmt: '2026-11-18T09:30:00',
  total: '93.00', total_tax: '18.00', discount_total: '8.06', discount_tax: '1.94', shipping_total: '2.42', shipping_tax: '0.58',
  billing: { first_name: 'Maria', last_name: 'Papadopoulou', email: 'maria@example.com', phone: '+30 210 0000000' },
  shipping: { first_name: 'Maria', last_name: 'Papadopoulou', address_1: 'Leoforos Athinon 1', city: 'Athens', postcode: '10558', country: 'GR' },
  line_items: [
    { name: 'Carbon Blade Fins', image: { src: PHOTO }, quantity: 1, subtotal: '80.65', subtotal_tax: '19.35', meta_data: [{ key: 'Size', value: '42-43', display_key: 'Size', display_value: '42-43' }] },
    { name: 'Neoprene Hood 3mm', quantity: 2, subtotal: '0', subtotal_tax: '0' },
  ],
  shipping_lines: [{ method_id: 'flat_rate', method_title: 'Courier delivery' }],
  coupon_lines: [{ code: 'TESTCOUPON' }],
  meta_data: [{ key: 'meister_tracking_carrier', value: 'ACS Courier' }, { key: 'meister_tracking_number', value: '1234567890' }, { key: 'meister_tracking_url', value: 'https://www.acscourier.net/' }],
}
const files = {
  'confirmation-en.html': buildOrderConfirmation(order, 'en').html,
  'confirmation-el.html': buildOrderConfirmation(order, 'el').html,
  'completed-en.html': buildOrderCompleted(order, 'en').html,
  'completed-el.html': buildOrderCompleted(order, 'el').html,
  'owner-alert.html': buildOwnerAlert(order).html,
}
for (const [name, html] of Object.entries(files)) writeFileSync(join(dir, name), html.replaceAll(PHOTO, `${publicUrl}/images/diving-fins-category-image.jpg`))
console.log(`Wrote ${Object.keys(files).length} previews to ${dir}`)

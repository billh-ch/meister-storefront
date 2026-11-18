// Generates public/email/receipt-edge.png: the sawtooth "torn receipt" bottom edge used by the order emails.
// Email clients cannot draw this with CSS, so it is a small hosted image. Re-run only to change its look.
// Usage: node scripts/generate-email-edge.mjs
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const CARD = '#1B1B18'           // must match emailTheme.card in lib/email/config.ts
const WIDTH = 1200, TOOTH = 40, HEIGHT = 20   // drawn at 2x; shown at 600px wide
const points = ['0,0']
for (let x = 0; x < WIDTH; x += TOOTH) points.push(`${x + TOOTH / 2},${HEIGHT}`, `${x + TOOTH},0`)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" shape-rendering="crispEdges"><polygon fill="${CARD}" points="${points.join(' ')}"/></svg>`

mkdirSync(new URL('../public/email/', import.meta.url), { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } })
await page.setContent(`<body style="margin:0;background:transparent">${svg}</body>`)
await page.screenshot({ path: new URL('../public/email/receipt-edge.png', import.meta.url).pathname, omitBackground: true, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } })
await browser.close()
console.log('Wrote public/email/receipt-edge.png')

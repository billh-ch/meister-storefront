// Customer-copy audit, intentionally separate from behavioral unit tests.
import './helpers/typescript-imports.mjs'
import ts from 'typescript'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { decodeHTML } from 'entities'
const { translate } = await import('../lib/i18n/index.ts')
const { informationPages } = await import('../lib/agents/content.ts')
const { categoryDetails, homepageFaqs, testimonials, trustItems, shippingReturnsCopy } = await import('../lib/mock-data.ts')
const { countries } = await import('../lib/address/countries.ts')
const allowed = new Set(['Meister', 'MEISTER.', '#WeAreFamily', 'your@email.com', 'SKU', 'Instagram', 'TikTok', 'YouTube', 'Facebook', '{value0}, {value1}'])
const missing = new Set()
const check = source => { if (/[a-z]/i.test(source) && !allowed.has(source) && translate('el', source) === source) missing.add(source) }
let calls = 0
const files = execFileSync('rg', ['--files', 'app', 'components']).toString().trim().split('\n').filter(f => f.endsWith('.tsx') && !f.startsWith('app/docs') && !f.includes('/api/') && !f.startsWith('components/i18n/'))
for (const file of files) {
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  function walk(node) {
    if (ts.isCallExpression(node) && node.expression.getText(sf) === 't' && node.arguments.length && ts.isStringLiteral(node.arguments[0])) { calls++; check(node.arguments[0].text) }
    if (ts.isJsxAttribute(node) && node.name.getText(sf) === 'label' && node.initializer && ts.isStringLiteral(node.initializer)) check(node.initializer.text)
    if (ts.isJsxText(node)) { const text = decodeHTML(node.text.replace(/\s+/g,' ').trim()); if (/[a-z]/i.test(text) && !allowed.has(text)) missing.add(`${file}: raw JSX text: ${text}`) }
    ts.forEachChild(node, walk)
  }
  walk(sf)
}
for(const [,page] of Object.entries(informationPages).filter(([path])=>!path.startsWith('/docs'))) {
  check(page.title); for(const section of page.sections) { check(section.heading); section.paragraphs.forEach(check) }
}
for(const c of categoryDetails) { [c.name,c.tagline,c.marqueeText].forEach(check); c.accordionItems.forEach(a=>[a.headline,a.body].forEach(check)) }
homepageFaqs.forEach(f=>[f.q,f.a].forEach(check)); testimonials.forEach(t=>check(t.quote)); trustItems.forEach(t=>[t.title,t.detail].forEach(check)); shippingReturnsCopy.forEach(s=>[s.headline,s.body].forEach(check)); countries.forEach(c=>check(c.name))
console.log(`Audited ${files.length} UI files, ${calls} literal translation calls, authored information/showcase/FAQ/review/trust copy and ${countries.length} country labels.`)
console.log('Catalog names, descriptions, brands and option values are deliberately preserved; technical docs and service paths are excluded.')
if(missing.size) { console.error([...missing].sort().join('\n')); process.exitCode = 1 } else console.log('No missing authored customer UI translations found.')

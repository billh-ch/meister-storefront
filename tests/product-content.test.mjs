import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
const { sanitizeProductHtml } = await import('../lib/sanitize.ts')
test('legacy greater-than features become a readable list without changing their wording', () => {
  assert.equal(sanitizeProductHtml('<p>&gt;Multiple dive modes<br>&gt;Wide variety of alarms<br>&gt;Bühlmann 16 GF</p>'), '<ul><li>Multiple dive modes</li><li>Wide variety of alarms</li><li>Bühlmann 16 GF</li></ul>')
  assert.equal(sanitizeProductHtml('>First feature\n>Second feature'), '<ul><li>First feature</li><li>Second feature</li></ul>')
})
test('known builder wrappers are removed but bracketed product text survives', () => {
  const input = '[vc_row css="example"][vc_column][vc_column_text]<p>Size [Medium], [EN250], [2026].</p>[/vc_column_text][/vc_column][/vc_row]'
  assert.equal(sanitizeProductHtml(input), '<p>Size [Medium], [EN250], [2026].</p>')
  assert.equal(sanitizeProductHtml("[woodmart_title title='Example']<p>Actual description</p>"), '<p>Actual description</p>')
})
test('normal HTML, comparisons, blockquotes and links keep their meaning', () => {
  const input = '<h2>Features</h2><p>Pressure &gt; 10 bar. Size [M].</p><blockquote>&gt;Quoted text</blockquote><table><tr><td>A</td><td>B</td></tr></table><p><strong>Bold</strong> &amp; Greek Ελληνικά</p>'
  assert.equal(sanitizeProductHtml(input), input)
  assert.match(sanitizeProductHtml('<a href="https://example.com">Manual</a>'), /href="https:\/\/example.com"/)
})
test('normalization cannot reintroduce unsafe markup and malformed HTML remains sanitized', () => {
  const output = sanitizeProductHtml('<p>&gt;Safe<br>&gt;&lt;script&gt;literal&lt;/script&gt;</p><script>alert(1)</script><a href="javascript:alert(1)">Bad</a><p>Unclosed')
  assert.match(output, /<ul>/)
  assert.doesNotMatch(output, /<script>|javascript:|alert\(1\)/)
  assert.match(output, /&lt;script&gt;literal&lt;\/script&gt;/)
  assert.match(output, /<p>Unclosed<\/p>/)
})

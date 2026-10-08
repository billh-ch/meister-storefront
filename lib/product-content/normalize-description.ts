import { DomUtils, parseDocument } from 'htmlparser2'

// Only recognized builder prefixes: [Medium] and other bracketed product
// wording are content, not WordPress layout instructions.
const BUILDER_SHORTCODE = /\[\/?(?:vc_|woodmart_)[\w-]+(?:\s+[\w-]+=(?:"[^"]*"|'[^']*'))*\s*\/?\]/gi

function featureList(content: string): string | null {
  const lines = content.split(/\r?\n|<br\s*\/?>/i).map(line => line.trim()).filter(Boolean)
  // A single comparison/quotation is not evidence of a legacy list. Require
  // the complete text-only block to contain at least two marked lines.
  if (lines.length < 2 || lines.some(line => !/^(?:>|&gt;)\s*\S/i.test(line))) return null
  return `<ul>${lines.map(line => `<li>${line.replace(/^(?:>|&gt;)\s*/i, '')}</li>`).join('')}</ul>`
}

/** Presentation only. Parsing identifies text-only paragraphs before looking
 * for legacy markers, so regex never rewrites arbitrary HTML. Sanitization
 * must run afterwards: this function is not a trust boundary. */
export function normalizeProductDescription(html: string): string {
  const document = parseDocument(html.replace(BUILDER_SHORTCODE, ''))
  return document.children.map(node => {
    if (node.type === 'text') return featureList(DomUtils.getOuterHTML(node)) ?? DomUtils.getOuterHTML(node)
    if (node.type === 'tag' && node.name === 'p' && node.children.every(child =>
      child.type === 'text' || (child.type === 'tag' && child.name === 'br'))) {
      const list = featureList(DomUtils.getInnerHTML(node))
      if (list) return list
    }
    return DomUtils.getOuterHTML(node)
  }).join('')
}

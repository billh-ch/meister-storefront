import sanitizeHtml from 'sanitize-html'

/**
 * Sanitises product description HTML coming out of WordPress.
 *
 * This runs server-side inside the detail mapper, never in a component, so
 * the sanitised string is what ISR caches (parse5 runs once per revalidation
 * rather than once per render) and the library never reaches a client bundle.
 *
 * The trust boundary is not "the shop owner" — it is anyone with WP admin
 * plus every plugin that injects markup into product descriptions.
 *
 * Deliberate exclusions:
 * - `class` and `style` are stripped, so WP theme markup can't break the
 *   dark design. Everything is styled by `.product-prose` in globals.css.
 * - `<img>` is stripped: inline WP images point at the store's unreachable
 *   internal siteurl and can't be optimised by next/image anyway.
 *
 * sanitize-html also normalises malformed markup, which matters because
 * WordPress routinely emits unclosed tags — React doesn't parse innerHTML,
 * so those would otherwise hit the browser's error-recovery parser.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u',
    'ul', 'ol', 'li',
    'h2', 'h3', 'h4',
    'blockquote', 'a',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    // `rel` must be allow-listed even though transformTags adds it below:
    // sanitize-html transforms first and filters attributes afterwards, so
    // an un-listed `rel` would be silently stripped back off again.
    a: ['href', 'title', 'rel'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', {
      rel: 'noopener noreferrer nofollow',
    }),
  },
}

export function sanitizeProductHtml(html: string): string {
  if (!html) return ''
  return sanitizeHtml(html, OPTIONS).trim()
}

# Product content and structured data

WooCommerce remains the source of product names, descriptions, prices, stock,
images, brands, SKU and variation options. This release changes presentation
and search markup; it does not edit WooCommerce records or translate content.

## What the storefront does

- Product markup uses the current EUR price, canonical product URL and actual
  stock status. Sale offers use the sale price, rather than the crossed-out price.
- Variable products with selectable variation data describe the range using an
  AggregateOffer and individual variation prices/stock. An empty named option
  means “any option”; an entirely empty attribute record cannot identify a variant.
  Specific choices override wildcards. Unreachable or ambiguous variations are
  omitted. Very large option sets (over 1,000 combinations) use conservative
  parent-level output rather than attempting an unbounded selection scan.
- Where variations cannot support a range, a single-price legacy product can
  use its parent offer. A known range with incomplete data omits the offer
  rather than pretending the lowest price describes every selection.
- Breadcrumb markup follows Home, the existing category and the product page.
- Missing identifiers, reviews, condition, shipping promises and returns terms
  remain omitted. Structured data does not guarantee Google rich results.
- Demo/outage fallback products do not publish Product markup.

Legacy text-only paragraphs or standalone text containing at least two `>`
feature lines become lists. Line breaks may be newlines or `<br>` tags. Normal
paragraphs, comparisons, blockquotes, tables and existing lists retain their
meaning. Known `vc_` and `woodmart_` builder shortcodes are stripped; ordinary
bracketed product text survives. HTML is sanitized after normalization.
Mixed prose/list blocks and complex builder layouts should be edited in
WooCommerce. Missing or corrupted characters are not guessed.

## Owner editing checklist

Start with the products customers view or buy most often. Keep the current
bilingual content until the separate English translation project is ready.
For each product, verify the following against its manufacturer documentation:

1. **Short description:** one or two factual sentences explaining what the
   product is and the main reason a customer would choose it.
2. **Suitability:** intended activity, experience or use conditions, where known.
3. **Features:** a proper bulleted list of supported, useful features.
4. **Specifications:** accurate dimensions, materials, weight and technical
   limits; do not imply an omitted value is zero.
5. **Sizing and compatibility:** sizing guidance, compatible models and required
   accessories. Distinguish a required extra from an included component.
6. **Included items and care:** confirm package contents and maintenance guidance.
7. **Commerce fields:** current price, stock/backorder status, actual brand,
   SKU and manufacturer identifiers where available. Re-save incomplete
   variations with the correct named axes and options; verify each selection.
8. **Images:** clean photos of the actual product and variants, plus meaningful
   alt text. Confirm image rights before uploading.
9. **Delivery and returns:** add only approved guidance. Do not copy an unrelated
   store's terms or invent lead times/free-shipping thresholds.

Use paragraphs, headings starting at H2, proper lists and simple specification
tables. Avoid page-builder layout shortcodes and manually typed `>` bullets.
Do not stuff keywords, add fabricated ratings or rewrite technical limits for SEO.

## Factual draft example: Suunto Ocean

Source checked on 2026-10-07: [current storefront product](https://meister-storefront.vercel.app/products/suunto-ocean-dive-computer-sport-watch).
This is an owner-review draft using existing description facts, not a backend update.

**Short description:** Dive computer and sports watch for adventures below and
above the surface.

**Feature list:**

- Extensive scuba and freedive features.
- Wireless tank pressure support.
- Underwater route tracking.
- Dive and sports data in the Suunto app.
- More than 95 sport modes.
- Up to 40 hours of dive and exercise tracking.

Confirm these claims for the exact model before publication. Compatibility,
package contents, safety limits, warranty, sizing and delivery remain to be
filled from authoritative sources. Do not infer that a wireless transmitter
is included merely because tank pressure is supported.

## After publication

Check one simple, sale, sold-out, backorder and variable product on the deployed
storefront. Compare visible prices/stock with WooCommerce and the JSON-LD.
Use Google's Rich Results Test and Schema.org Validator on the deployed URLs;
optional-field warnings are not permission to invent data. Monitor Search
Console after indexing; search appearance and ranking are controlled by Google.

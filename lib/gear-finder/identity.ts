/** Stable IDs verified against this storefront's public WooCommerce catalogue, 27 Oct 2026.
 * Product slugs have migrated from the reference shop's Greek URLs to English.
 * Keep these bindings when titles/slugs/translations change; update them if a product is replaced.
 */
export const CATALOGUE_IDS: Record<'wetsuits' | 'fins', Record<string, string>> = {
  wetsuits: { lined: '4781', camo: '4796', fire: '4908', sheico: '4512', daiwabo: '4497', pro: '4465', scs: '4480' },
  fins: { evo: '4608', 'evo-long': '4636', f1: '4580', 'f1-30': '4437', 'f1-30-color-skin': '4720', 'f1-30-long': '4553', x: '4664', 'x-long': '4692', 'plastic-long': '4869' },
}

/**
 * Maps this store's real WooCommerce category IDs to the five storefront
 * category slugs (fins/suits/guns/accessories/merch). WooCommerce's own
 * category slugs are Greek names that don't match these.
 *
 * `guns` is a real category page but deliberately not one of the homepage's
 * curated showcase tabs (`lib/mock-data.ts:categoryDetails`) — Meister
 * resells this gear rather than manufacturing it, and that section
 * represents Meister's own lines. See `lib/categories.ts` for the full
 * five-slug registry the rest of the app (nav, breadcrumbs, category pages)
 * uses instead.
 */
const CATEGORY_ID_TO_SLUG: Record<number, string> = {
  // fins
  104: 'fins', // Πτερύγια
  129: 'fins', // Πτερύγια Carbon / Υαλονημα
  86: 'fins', // Πέδιλα
  119: 'fins', // Λεπίδες
  87: 'fins', // Παρελκόμενα Πτερυγίων, Λεπίδων

  // suits
  17: 'suits', // Στολες Καταδυσης
  111: 'suits', // Λείο Ξυρισμένο
  112: 'suits', // Φόδρα Ξυρισμένο
  170: 'suits', // Λείο Φόδρα
  95: 'suits', // Φόδρα Φόδρα

  // guns — spearfishing gear, resold rather than Meister-manufactured
  27: 'guns', // Λαστιχοβόλα (spearguns/slings)
  26: 'guns', // Ψαροτούφεκα (speargun)
  36: 'guns', // Όπλων

  // accessories
  91: 'accessories', // Μάσκες
  18: 'accessories', // Γάντια
  31: 'accessories', // Καλτσάκια
  35: 'accessories', // Σάκοι Μεταφοράς
  88: 'accessories', // Ζώνες - Βάρη - Γιλέκα
  138: 'accessories', // Σημαδούρες
  176: 'accessories', // Αξεσουάρ Σημαδούρων
  215: 'accessories', // Ρολόγια Κατάδυσης
  214: 'accessories', // Καταδυτικά Ρολόγια
  23: 'accessories', // Εξοπλισμός
  37: 'accessories', // Εξοπλισμού
  177: 'accessories', // Διάφορα (misc)

  // merch
  39: 'merch', // Tshirts - Κοντομάνικα
  93: 'merch', // Σκούφοι - Καπέλα
  40: 'merch', // Φούτερ - Μπλούζες Μακρυμάνικες
  101: 'merch', // Ζακέτες - Μπουφάν - Αντιανεμικά
  102: 'merch', // Γιλέκα - Σόρτς - Κουκούλες
  38: 'merch', // Ένδυση - Υπόδυση - Gadget
}

const DEFAULT_SLUG = 'accessories'

export function mapCategorySlug(categoryIds: number[]): string {
  for (const id of categoryIds) {
    const slug = CATEGORY_ID_TO_SLUG[id]
    if (slug) return slug
  }
  return DEFAULT_SLUG
}

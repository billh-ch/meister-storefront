/**
 * Maps this store's real WooCommerce category IDs to the four homepage
 * category slugs (fins/suits/accessories/merch) CategoriesSection filters on.
 * WooCommerce's own category slugs are Greek names that don't match these,
 * and the store also carries spearfishing gear (spearguns, slings, shafts)
 * with no dedicated homepage tab — grouped into "accessories" per an
 * explicit decision rather than left unmapped.
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

  // accessories (includes spearfishing gear with no dedicated tab)
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
  27: 'accessories', // Λαστιχοβόλα (spearguns/slings)
  26: 'accessories', // Ψαροτούφεκα (speargun)
  36: 'accessories', // Όπλων
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

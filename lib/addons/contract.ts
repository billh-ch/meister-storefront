/**
 * Product add-ons: paid extras chosen on top of a product (and any variation),
 * e.g. a camo pattern or knee pads on a wetsuit.
 *
 * Source of truth is the WooCommerce product meta `meister_addons`, written by
 * the `wordpress/meister-product-addons` plugin. That plugin also prices the
 * add-ons on the WooCommerce order, so both sides must follow this contract
 * exactly (mirrored in `wordpress/meister-product-addons/core.php`; see
 * `docs/guides/product-addons.md`):
 *
 *   { "version": 1, "groups": [ { "id": "camo", "type": "single",
 *     "name": { "en": "…", "el": "…" },
 *     "options": [ { "id": "split", "name": { "en": "…", "el": "…" }, "price": "30.00" } ] } ] }
 *
 * Pure module: no network, no framework. Anything that does not match the
 * contract exactly means "this product has no add-ons" (fail closed). Never
 * guess a price or repair a half-valid definition.
 */

export const ADDONS_META_KEY = 'meister_addons'
export const ADDONS_VERSION = 1

/** Lowercase slug: letters, digits and single hyphens. Never changes once saved. */
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ID_MAX = 40
/** EUR, VAT included, exactly two decimals, above zero. */
const PRICE_PATTERN = /^(?:0|[1-9][0-9]{0,4})\.[0-9]{2}$/
const NAME_MAX = 80
const MAX_GROUPS = 10
const MAX_OPTIONS_PER_GROUP = 20
const MAX_OPTIONS_TOTAL = 40
/** The JSON string itself; keeps a hostile meta value from costing real CPU. */
const MAX_RAW_LENGTH = 20_000

export type AddonGroupType = 'single' | 'multi'
export interface LocalizedName { en: string; el: string }

export interface AddonOption { id: string; name: LocalizedName; priceCents: number }
export interface AddonGroup { id: string; type: AddonGroupType; name: LocalizedName; options: AddonOption[] }
export interface AddonConfig { version: 1; groups: AddonGroup[] }

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype

const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]) => {
  const own = Object.keys(value)
  return own.length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
}

const isId = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= ID_MAX && ID_PATTERN.test(value)

/** Printable text without control characters or markup brackets. */
function parseName(value: unknown): LocalizedName | null {
  if (!isPlainObject(value) || !hasExactKeys(value, ['en', 'el'])) return null
  const out: Partial<LocalizedName> = {}
  for (const locale of ['en', 'el'] as const) {
    const text = value[locale]
    if (typeof text !== 'string') return null
    if (text !== text.trim() || text.length === 0 || [...text].length > NAME_MAX) return null
    if (/[\u0000-\u001f\u007f<>]/.test(text)) return null
    out[locale] = text
  }
  return out as LocalizedName
}

function parsePrice(value: unknown): number | null {
  if (typeof value !== 'string' || !PRICE_PATTERN.test(value)) return null
  const [whole, fraction] = value.split('.')
  const cents = Number(whole) * 100 + Number(fraction)
  return cents > 0 ? cents : null
}

/**
 * Parses the raw `meister_addons` meta value. Returns `null` for anything
 * that is not a complete, valid version-1 definition — including an empty
 * group list — so callers only ever see fully valid data.
 */
export function parseAddons(raw: unknown): AddonConfig | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_RAW_LENGTH) return null
  let data: unknown
  try { data = JSON.parse(raw) } catch { return null }
  if (!isPlainObject(data) || !hasExactKeys(data, ['version', 'groups'])) return null
  if (data.version !== ADDONS_VERSION) return null
  if (!Array.isArray(data.groups) || data.groups.length === 0 || data.groups.length > MAX_GROUPS) return null

  const groupIds = new Set<string>()
  const optionIds = new Set<string>()
  const groups: AddonGroup[] = []
  for (const rawGroup of data.groups) {
    if (!isPlainObject(rawGroup) || !hasExactKeys(rawGroup, ['id', 'type', 'name', 'options'])) return null
    if (!isId(rawGroup.id) || groupIds.has(rawGroup.id)) return null
    if (rawGroup.type !== 'single' && rawGroup.type !== 'multi') return null
    const name = parseName(rawGroup.name)
    if (!name) return null
    if (!Array.isArray(rawGroup.options) || rawGroup.options.length === 0 || rawGroup.options.length > MAX_OPTIONS_PER_GROUP) return null
    groupIds.add(rawGroup.id)

    const options: AddonOption[] = []
    for (const rawOption of rawGroup.options) {
      if (!isPlainObject(rawOption) || !hasExactKeys(rawOption, ['id', 'name', 'price'])) return null
      // Option ids are unique across the whole product, not just the group,
      // so an id alone can never be read as belonging to a different group.
      if (!isId(rawOption.id) || optionIds.has(rawOption.id)) return null
      const optionName = parseName(rawOption.name)
      const priceCents = parsePrice(rawOption.price)
      if (!optionName || priceCents === null) return null
      optionIds.add(rawOption.id)
      options.push({ id: rawOption.id, name: optionName, priceCents })
    }
    groups.push({ id: rawGroup.id, type: rawGroup.type, name, options })
  }
  if (optionIds.size > MAX_OPTIONS_TOTAL) return null
  return { version: ADDONS_VERSION, groups }
}

/** Reads the add-ons from a WooCommerce REST product's `meta_data`. Duplicate keys are invalid. */
export function addonsFromMetaData(metaData: unknown): AddonConfig | null {
  if (!Array.isArray(metaData)) return null
  const entries = metaData.filter((entry) => isPlainObject(entry) && entry.key === ADDONS_META_KEY)
  if (entries.length !== 1) return null
  return parseAddons((entries[0] as Record<string, unknown>).value)
}

/* ----------------------------------------------------------------
   Selections

   A cart line stores only references `"<group>:<option>"` — never a name or a
   price. Every reference is re-checked against the live definition.
   ---------------------------------------------------------------- */

export const ADDON_REF_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$/
export const MAX_ADDON_REFS = MAX_OPTIONS_TOTAL

/** The localized, browser-safe view used by the product page. */
export interface AddonGroupView {
  id: string
  type: AddonGroupType
  name: string
  options: { id: string; name: string; priceCents: number }[]
}

export function localizeAddons(config: AddonConfig | null, locale: string): AddonGroupView[] {
  if (!config) return []
  const pick = (name: LocalizedName) => (locale === 'el' ? name.el : name.en)
  return config.groups.map((group) => ({
    id: group.id,
    type: group.type,
    name: pick(group.name),
    options: group.options.map((option) => ({ id: option.id, name: pick(option.name), priceCents: option.priceCents })),
  }))
}

export interface ChosenAddon {
  ref: string
  groupId: string
  optionId: string
  groupName: string
  optionName: string
  priceCents: number
}

export type AddonSelectionResult =
  | { ok: true; chosen: ChosenAddon[]; totalCents: number }
  | { ok: false; reason: 'invalid' | 'unavailable' }

/** Sorted copy, so the same choices made in a different order are the same cart line. */
export function canonicalAddonRefs(refs: readonly string[] | undefined): string[] {
  return [...(refs ?? [])].sort()
}

/**
 * Resolves a shopper's references against the product's live add-ons
 * (already localized). Strict on purpose:
 *
 * - malformed or duplicate references, or two options of one `single`
 *   group → `invalid` (a tampered or broken request);
 * - a reference to a group/option this product does not (or no longer)
 *   offers → `unavailable` (the line must be chosen again — we never charge
 *   for, or silently drop, something the shopper picked).
 */
export function resolveAddonSelection(groups: AddonGroupView[], refs: readonly string[] | undefined): AddonSelectionResult {
  const list = refs ?? []
  if (list.length === 0) return { ok: true, chosen: [], totalCents: 0 }
  if (list.length > MAX_ADDON_REFS) return { ok: false, reason: 'invalid' }
  if (list.some((ref) => typeof ref !== 'string' || !ADDON_REF_PATTERN.test(ref))) return { ok: false, reason: 'invalid' }
  if (new Set(list).size !== list.length) return { ok: false, reason: 'invalid' }

  const byRef = new Map<string, { groupIndex: number; optionIndex: number }>()
  groups.forEach((group, groupIndex) => group.options.forEach((option, optionIndex) => byRef.set(`${group.id}:${option.id}`, { groupIndex, optionIndex })))

  const perGroup = new Map<string, number>()
  const found: { groupIndex: number; optionIndex: number; ref: string }[] = []
  for (const ref of list) {
    const position = byRef.get(ref)
    if (!position) return { ok: false, reason: 'unavailable' }
    const group = groups[position.groupIndex]
    const count = (perGroup.get(group.id) ?? 0) + 1
    if (group.type === 'single' && count > 1) return { ok: false, reason: 'invalid' }
    perGroup.set(group.id, count)
    found.push({ ...position, ref })
  }
  found.sort((a, b) => a.groupIndex - b.groupIndex || a.optionIndex - b.optionIndex)
  const chosen = found.map(({ groupIndex, optionIndex, ref }) => {
    const group = groups[groupIndex]
    const option = group.options[optionIndex]
    return { ref, groupId: group.id, optionId: option.id, groupName: group.name, optionName: option.name, priceCents: option.priceCents }
  })
  return { ok: true, chosen, totalCents: chosen.reduce((sum, addon) => sum + addon.priceCents, 0) }
}

/** Whole euros → cents without float drift (`289.9 * 100 = 28989.999…`). */
export const toCents = (euros: number): number => Math.round(euros * 100)

/** `"camo:full,extras:knee-pads"` — the compact form carried in Stripe metadata. */
export function encodeAddonRefs(refs: readonly string[]): string {
  return canonicalAddonRefs(refs).join(',')
}

export function decodeAddonRefs(value: unknown): string[] | null {
  if (value === undefined) return []
  if (typeof value !== 'string' || value.length === 0 || value.length > 2000) return null
  const refs = value.split(',')
  if (refs.length > MAX_ADDON_REFS || refs.some((ref) => !ADDON_REF_PATTERN.test(ref)) || new Set(refs).size !== refs.length) return null
  return refs
}

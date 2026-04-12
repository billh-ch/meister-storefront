import { z } from 'zod'
import type { CategoryDetail, AccordionItem } from '@/lib/mock-data'
import type { BcCategory } from '../queries/get-all-categories'

const accordionItemSchema = z.object({
  headline: z.string(),
  body: z.string(),
})

const accordionItemsSchema = z.array(accordionItemSchema)

function parseAccordionItems(raw: string | undefined): readonly AccordionItem[] {
  if (!raw) return []
  try {
    return accordionItemsSchema.parse(JSON.parse(raw))
  } catch {
    return []
  }
}

function getCustomField(category: BcCategory, name: string): string | undefined {
  return category.customFields.edges.find(e => e.node.name === name)?.node.value
}

function extractSlug(path: string): string {
  const trimmed = path.replace(/^\/|\/$/g, '')
  return trimmed.split('/').pop() ?? trimmed
}

export function mapCategory(bcCategory: BcCategory): CategoryDetail {
  const slug = extractSlug(bcCategory.path)

  return {
    id: String(bcCategory.entityId),
    slug,
    // "displayName" custom field allows overriding the BC category name (e.g. "FINS")
    name: getCustomField(bcCategory, 'displayName') ?? bcCategory.name.toUpperCase(),
    // "label" custom field stores the formatted label (e.g. "01 — DIVING FINS")
    label: getCustomField(bcCategory, 'label') ?? bcCategory.name,
    tagline: getCustomField(bcCategory, 'tagline') ?? '',
    marqueeText: getCustomField(bcCategory, 'marqueeText') ?? bcCategory.name,
    image: bcCategory.image?.url ?? '',
    // "accordionItems" custom field stores a JSON array of { headline, body } objects
    accordionItems: parseAccordionItems(getCustomField(bcCategory, 'accordionItems')),
  }
}

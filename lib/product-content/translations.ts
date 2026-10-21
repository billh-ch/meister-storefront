import 'server-only'
import { createHash } from 'node:crypto'
import type { WcProduct } from '@/lib/woocommerce/queries/get-products'

export interface ProductSource {
  name: string
  short_description: string
  description: string
}

/** Only the plugin's raw-source field establishes freshness. Legacy stores
 * still display normal formatted REST content, never unverified metadata. */
export function getProductContent(product: WcProduct, locale: string): ProductSource {
  const fallback = { name: product.name, short_description: product.short_description ?? '', description: product.description ?? '' }
  const raw = product.meister_translation_source
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !['name', 'short_description', 'description'].every(key => typeof (raw as Record<string, unknown>)[key] === 'string')) return fallback
  const entries = Array.isArray(product.meta_data) ? product.meta_data.filter(meta => meta && meta.key === 'meister_translations') : []
  // The plugin strips translation meta and emits this authenticated REST field.
  // If explicitly present but invalid, never resurrect a legacy meta value.
  const value = Object.hasOwn(product, 'meister_translations') ? product.meister_translations : entries.length === 1 ? entries[0].value : undefined
  return resolveProductTranslation(raw as ProductSource, locale, value, fallback)
}

/** Hash raw WC edit-context strings, never the formatted REST display HTML. */
export function productSourceHash(source: ProductSource): string {
  return createHash('sha256').update([source.name, source.short_description ?? '', source.description ?? ''].join('\0'), 'utf8').digest('hex')
}

export function resolveProductTranslation(source: ProductSource, locale: string, value: unknown, fallback: ProductSource = source): ProductSource {
  const entry = (value as { version?: number; en?: Record<string, unknown>; el?: Record<string, unknown> } | null)
  const translation = locale === 'el' ? entry?.el : locale === 'en' ? entry?.en : undefined
  if (entry?.version !== 1 || translation?.status !== 'published' || translation.source_hash !== productSourceHash(source)) return { ...fallback }
  return Object.fromEntries(Object.entries(fallback).map(([key, original]) => {
    const text = translation[key]
    return [key, typeof text === 'string' && text.trim() && Buffer.byteLength(text, 'utf8') <= (key === 'name' ? 1000 : 100000) ? text : original]
  })) as unknown as ProductSource
}

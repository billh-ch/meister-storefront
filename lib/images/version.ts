/** WooCommerce attachment dates invalidate pre-generated image variants. */
export function imageVersion(value: unknown): string | undefined {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z?$/.test(value) ? value : undefined
}

import 'server-only'
import { wcFetch, wcMutate } from '@/lib/woocommerce/client'
import { attemptSchema, promotionQuoteSchema } from './schema'

export function promotionsEnabled(): boolean {
  return process.env.PROMOTIONS_ENABLED === 'true' && process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'true'
}
export async function promotionBackend<T = unknown>(path: string, body: unknown): Promise<T> {
  if (!/^[a-z-]+$/.test(path)) throw new Error('Invalid promotion operation')
  return wcMutate<T>(`/meister-promotions/${path}`, 'POST', body)
}
export async function promotionHealth() {
  const value = await wcFetch<{ version: number; backendId: string; health: { activated: boolean; transactionalTables: boolean; couponReservations: boolean; stockReservations: boolean; reconciledAt: number } }>('/meister-promotions/health')
  if (value.version !== 1 || !process.env.PROMOTIONS_BACKEND_ID || value.backendId !== process.env.PROMOTIONS_BACKEND_ID) throw new Error('Promotion backend has not been verified')
  return value
}
export async function preparePromotion(body: unknown) { return attemptSchema.parse(await promotionBackend('prepare', body)) }
export async function quotePromotion(body: unknown) {
  const value = promotionQuoteSchema.parse(await promotionBackend('quote', body))
  if (!process.env.PROMOTIONS_BACKEND_ID || value.backendId !== process.env.PROMOTIONS_BACKEND_ID) throw new Error('Unexpected promotion backend')
  return value
}

export async function readPromotionQuote(body: unknown) { return promotionQuoteSchema.parse(await promotionBackend('quote-status', body)) }

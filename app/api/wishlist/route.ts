import { getSession } from '@/lib/auth/session'
import { readAccountWishlist, changeAccountWishlist } from '@/lib/wishlist/account'
import { z } from 'zod'

const headers = { 'Cache-Control': 'private, no-store' }
const inputSchema = z.object({
  customerId: z.number().int().positive(),
  additions: z.array(z.string().regex(/^[1-9]\d{0,14}$/)).max(200),
  removals: z.array(z.string().regex(/^[1-9]\d{0,14}$/)).max(200),
}).strict()

export async function GET() {
  try {
    const { wcCustomerId } = await getSession()
    const ids = wcCustomerId ? await readAccountWishlist(wcCustomerId) : []
    return Response.json({ customerId: wcCustomerId ?? null, ids }, { headers })
  } catch {
    return Response.json({ error: 'Could not load your wishlist. Please retry.' }, { status: 503, headers })
  }
}

export async function POST(request: Request) {
  // Cookie-authenticated mutations only accept same-origin browser requests.
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'Invalid request origin.' }, { status: 403, headers })
  }
  try {
    const { wcCustomerId } = await getSession()
    if (!wcCustomerId) return Response.json({ error: 'Please sign in again.' }, { status: 401, headers })
    const input = inputSchema.safeParse(await request.json())
    if (!input.success) return Response.json({ error: 'Invalid wishlist changes.' }, { status: 400, headers })
    // Prevent a queued change from a previous login being applied to another account.
    if (input.data.customerId !== wcCustomerId) return Response.json({ error: 'Your account changed. Please retry.' }, { status: 409, headers })
    const { additions, removals } = input.data
    const ids = additions.length || removals.length
      ? await changeAccountWishlist(wcCustomerId, additions, removals)
      : await readAccountWishlist(wcCustomerId)
    return Response.json({ customerId: wcCustomerId, ids }, { headers })
  } catch {
    return Response.json({ error: 'Could not sync your wishlist. Your changes are kept for retry.' }, { status: 503, headers })
  }
}

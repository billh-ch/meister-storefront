import { after } from 'next/server'
import { headers } from 'next/headers'
import { notifyWelcome } from './notify'
import { currentWelcomeOffer } from './welcome-offer'
import { allowWelcomeEmail } from './welcome-rate-limit'

/**
 * Queues the welcome email to run after the sign-up response is sent. Best
 * effort by design: nothing in here can slow down or fail account creation.
 */
export async function scheduleWelcomeEmail(input: { customerId: number; email: string; firstName?: string; locale: string }): Promise<void> {
  const incoming = await headers()
  const client = incoming.get('x-forwarded-for')?.split(',')[0]?.trim() || incoming.get('x-real-ip') || 'unknown'
  after(async () => {
    if (!(await allowWelcomeEmail(client))) return
    await notifyWelcome({ ...input, offer: await currentWelcomeOffer() })
  })
}

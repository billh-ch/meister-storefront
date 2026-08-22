import type { Metadata } from 'next'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import SimpleBreadcrumbs from '@/components/collection/simple-breadcrumbs'
import LogoutButton from '@/components/auth/logout-button'
import { getSession } from '@/lib/auth/session'
import { getOrdersByCustomer } from '@/lib/woocommerce'
import { formatPrice } from '@/lib/mock-data'

const MONO = 'var(--font-space-mono), monospace'
const DISPLAY = 'var(--font-dela-gothic), sans-serif'

export const metadata: Metadata = {
  title: 'Your Account — Meister',
}

/** Protected by `middleware.ts` — reaching this render at all guarantees a
 *  session, but the type system doesn't know that, hence the fallback. */
export default async function AccountPage() {
  const session = await getSession()
  const wcCustomerId = session.wcCustomerId
  if (!wcCustomerId) return null

  const orders = await getOrdersByCustomer(wcCustomerId)

  return (
    <main style={{ backgroundColor: '#1B1B18' }}>
      <Navbar />
      <SimpleBreadcrumbs items={[{ label: 'HOME', href: '/' }, { label: 'ACCOUNT' }]} />

      <div className="mx-auto max-w-[1400px] px-4 pb-16 sm:px-6 md:px-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1
            className="text-2xl text-white sm:text-3xl md:text-4xl"
            style={{ fontFamily: DISPLAY, fontWeight: 800 }}
          >
            YOUR ORDERS
          </h1>
          <LogoutButton />
        </div>

        {orders.length === 0 ? (
          <div
            className="hatching-bg flex flex-col items-center justify-center gap-2 py-24 text-center"
            style={{ border: '1px solid #444444' }}
          >
            <p className="text-sm text-[#999999]" style={{ fontFamily: MONO }}>
              NO ORDERS YET
            </p>
          </div>
        ) : (
          <div style={{ border: '1px solid #444444' }}>
            {orders.map((order) => (
              <div key={order.id} className="p-4" style={{ borderBottom: '1px solid #222222' }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white" style={{ fontFamily: MONO }}>
                    Order #{order.number}
                  </span>
                  <span className="text-xs text-[#999999]" style={{ fontFamily: MONO }}>
                    {new Date(order.dateCreated).toLocaleDateString('el-GR')}
                  </span>
                  <span
                    className="text-xs font-bold tracking-wide uppercase"
                    style={{ fontFamily: MONO, color: '#4ADE80' }}
                  >
                    {order.status}
                  </span>
                  <span className="text-sm font-bold text-white" style={{ fontFamily: MONO }}>
                    {formatPrice(order.total)}
                  </span>
                </div>
                <ul className="mt-2 flex flex-col gap-0.5 text-xs text-[#999999]" style={{ fontFamily: MONO }}>
                  {order.lineItems.map((item, index) => (
                    <li key={index}>
                      {item.quantity} × {item.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}

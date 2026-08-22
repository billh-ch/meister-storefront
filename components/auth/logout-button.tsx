import { logoutAction } from '@/lib/auth/actions'

const MONO = 'var(--font-space-mono), monospace'

/** A plain form posting to a Server Action — no client JS needed, same
 *  progressive-enhancement pattern as the navbar's search form. */
export default function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="text-xs text-[#999999] underline transition-colors hover:text-[#FFD700]"
        style={{ fontFamily: MONO }}
      >
        Sign out
      </button>
    </form>
  )
}

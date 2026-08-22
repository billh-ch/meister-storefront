'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction } from '@/lib/auth/actions'
import { getSafeRedirectUrl } from '@/lib/auth/safe-redirect'

const MONO = 'var(--font-space-mono), monospace'

export default function SignInForm({ redirectUrl }: { redirectUrl: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')

    startTransition(async () => {
      const result = await loginAction({ email, password })
      if (result.ok) {
        router.push(getSafeRedirectUrl(redirectUrl))
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="sign-in-email"
          className="text-xs font-bold tracking-wide text-white uppercase"
          style={{ fontFamily: MONO }}
        >
          Email
        </label>
        <input
          id="sign-in-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="bg-transparent px-3 py-2 text-sm text-white outline-none"
          style={{ border: '1px solid #444444', fontFamily: MONO }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="sign-in-password"
          className="text-xs font-bold tracking-wide text-white uppercase"
          style={{ fontFamily: MONO }}
        >
          Password
        </label>
        <input
          id="sign-in-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="bg-transparent px-3 py-2 text-sm text-white outline-none"
          style={{ border: '1px solid #444444', fontFamily: MONO }}
        />
      </div>

      {error && (
        <p aria-live="polite" className="text-xs" style={{ fontFamily: MONO, color: '#FF6B6B' }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="btn-gold flex h-12 w-full items-center justify-center text-xs tracking-[0.1em] uppercase"
      >
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}

'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { registerAction } from '@/lib/auth/actions'
import { getSafeRedirectUrl } from '@/lib/auth/safe-redirect'

const MONO = 'var(--font-space-mono), monospace'

export default function SignUpForm({ redirectUrl }: { redirectUrl: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await registerAction({
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? ''),
        firstName: String(formData.get('firstName') ?? ''),
        lastName: String(formData.get('lastName') ?? ''),
      })
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
      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <label
            htmlFor="sign-up-first-name"
            className="text-xs font-bold tracking-wide text-white uppercase"
            style={{ fontFamily: MONO }}
          >
            First name
          </label>
          <input
            id="sign-up-first-name"
            name="firstName"
            type="text"
            required
            autoComplete="given-name"
            className="bg-transparent px-3 py-2 text-sm text-white outline-none"
            style={{ border: '1px solid #444444', fontFamily: MONO }}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label
            htmlFor="sign-up-last-name"
            className="text-xs font-bold tracking-wide text-white uppercase"
            style={{ fontFamily: MONO }}
          >
            Last name
          </label>
          <input
            id="sign-up-last-name"
            name="lastName"
            type="text"
            required
            autoComplete="family-name"
            className="bg-transparent px-3 py-2 text-sm text-white outline-none"
            style={{ border: '1px solid #444444', fontFamily: MONO }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="sign-up-email"
          className="text-xs font-bold tracking-wide text-white uppercase"
          style={{ fontFamily: MONO }}
        >
          Email
        </label>
        <input
          id="sign-up-email"
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
          htmlFor="sign-up-password"
          className="text-xs font-bold tracking-wide text-white uppercase"
          style={{ fontFamily: MONO }}
        >
          Password
        </label>
        <input
          id="sign-up-password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="bg-transparent px-3 py-2 text-sm text-white outline-none"
          style={{ border: '1px solid #444444', fontFamily: MONO }}
        />
        <p className="text-xs text-[#999999]" style={{ fontFamily: MONO }}>
          At least 8 characters.
        </p>
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
        {isPending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  )
}

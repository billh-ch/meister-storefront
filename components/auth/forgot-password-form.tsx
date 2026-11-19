'use client'
import { useState, useTransition, type FormEvent } from 'react'
import Link from '@/components/i18n/localized-link'
import { useTranslation } from '@/components/i18n/locale-provider'
import { requestPasswordResetAction } from '@/lib/auth/reset-actions'

const MONO = 'var(--font-space-mono), monospace'

export default function ForgotPasswordForm() {
  const t = useTranslation()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const email = String(new FormData(event.currentTarget).get('email') ?? '')
    startTransition(async () => {
      const result = await requestPasswordResetAction({ email })
      if (result.ok) setSent(true)
      else setError(result.error)
    })
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4" style={{ fontFamily: MONO }}>
        <p role="status" className="p-3 text-sm text-white" style={{ border: '1px solid #FFD700' }}>
          {t("If an account exists for that email, we've sent a link to reset your password. It expires in 1 hour.")}
        </p>
        <Link href="/sign-in" className="text-sm text-[#FFD700] hover:underline">{t('Back to sign in')}</Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-[#999999]" style={{ fontFamily: MONO }}>
        {t("Enter the email you signed up with and we'll send you a link to choose a new password.")}
      </p>
      <div className="flex flex-col gap-1">
        <label htmlFor="forgot-email" className="text-xs font-bold tracking-wide text-white uppercase" style={{ fontFamily: MONO }}>
          {t('Email')}
        </label>
        <input
          id="forgot-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full min-w-0 bg-transparent px-3 py-2 text-sm text-white outline-none"
          style={{ border: '1px solid #444444', fontFamily: MONO }}
        />
      </div>
      {error && (
        <p aria-live="polite" className="text-xs" style={{ fontFamily: MONO, color: '#FF6B6B' }}>{error}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="btn-gold flex h-12 w-full items-center justify-center text-xs tracking-[0.1em] uppercase"
      >
        {isPending ? t('Sending…') : t('Send reset link')}
      </button>
    </form>
  )
}

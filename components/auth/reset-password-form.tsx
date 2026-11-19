'use client'
import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation, useLocalePath } from '@/components/i18n/locale-provider'
import { resetPasswordAction } from '@/lib/auth/reset-actions'
import PasswordField from './password-field'

const MONO = 'var(--font-space-mono), monospace'

export default function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslation()
  const lp = useLocalePath()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const data = new FormData(event.currentTarget)
    const password = String(data.get('password') ?? '')
    if (password !== String(data.get('confirmPassword') ?? '')) {
      setError("Passwords don't match.")
      return
    }
    startTransition(async () => {
      const result = await resetPasswordAction({ token, password })
      if (result.ok) router.push(lp('/sign-in?reset=1'))
      else setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PasswordField id="reset-password" name="password" label={t('New password')} autoComplete="new-password" minLength={8} hint={t('At least 8 characters.')} />
      <PasswordField id="reset-confirm-password" name="confirmPassword" label={t('Confirm new password')} autoComplete="new-password" />
      {error && (
        <p aria-live="polite" className="text-xs" style={{ fontFamily: MONO, color: '#FF6B6B' }}>{t(error)}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="btn-gold flex h-12 w-full items-center justify-center text-xs tracking-[0.1em] uppercase"
      >
        {isPending ? t('Saving…') : t('Set new password')}
      </button>
    </form>
  )
}

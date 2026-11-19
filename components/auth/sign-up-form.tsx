'use client'
import { useTranslation, useLocalePath } from '@/components/i18n/locale-provider'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { registerAction } from '@/lib/auth/actions'
import { getSafeRedirectUrl } from '@/lib/auth/safe-redirect'
import PasswordField from './password-field'

const MONO = 'var(--font-space-mono), monospace'

interface SignUpFormProps {
  redirectUrl: string
  /** Prefill for a guest coming from the post-purchase "create an account"
   *  link — their name and email are already known from the order. */
  defaultEmail?: string
  defaultFirstName?: string
  defaultLastName?: string
}

export default function SignUpForm({
  redirectUrl,
  defaultEmail = '',
  defaultFirstName = '',
  defaultLastName = '',
}: SignUpFormProps) {
  const t = useTranslation()
  const lp = useLocalePath()

  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const formData = new FormData(event.currentTarget)
    if (String(formData.get('password') ?? '') !== String(formData.get('confirmPassword') ?? '')) {
      setError("Passwords don't match.")
      return
    }

    startTransition(async () => {
      const result = await registerAction({
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? ''),
        firstName: String(formData.get('firstName') ?? ''),
        lastName: String(formData.get('lastName') ?? ''),
      })
      if (result.ok) {
        router.push(lp(getSafeRedirectUrl(redirectUrl)))
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label
            htmlFor="sign-up-first-name"
            className="text-xs font-bold tracking-wide text-white uppercase"
            style={{ fontFamily: MONO }}
          >
            {t("First name")}
          </label>
          <input
            id="sign-up-first-name"
            name="firstName"
            type="text"
            required
            autoComplete="given-name"
            defaultValue={defaultFirstName}
            className="w-full min-w-0 bg-transparent px-3 py-2 text-sm text-white outline-none"
            style={{ border: '1px solid #444444', fontFamily: MONO }}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label
            htmlFor="sign-up-last-name"
            className="text-xs font-bold tracking-wide text-white uppercase"
            style={{ fontFamily: MONO }}
          >
            {t("Last name")}
          </label>
          <input
            id="sign-up-last-name"
            name="lastName"
            type="text"
            required
            autoComplete="family-name"
            defaultValue={defaultLastName}
            className="w-full min-w-0 bg-transparent px-3 py-2 text-sm text-white outline-none"
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
          {t("Email")}
        </label>
        <input
          id="sign-up-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={defaultEmail}
          className="w-full min-w-0 bg-transparent px-3 py-2 text-sm text-white outline-none"
          style={{ border: '1px solid #444444', fontFamily: MONO }}
        />
      </div>

      <PasswordField
        id="sign-up-password"
        name="password"
        label={t("Password")}
        autoComplete="new-password"
        minLength={8}
        hint={t("At least 8 characters.")}
      />
      <PasswordField id="sign-up-confirm-password" name="confirmPassword" label={t("Confirm password")} autoComplete="new-password" />

      {error && (
        <p aria-live="polite" className="text-xs" style={{ fontFamily: MONO, color: '#FF6B6B' }}>
          {t(error)}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="btn-gold flex h-12 w-full items-center justify-center text-xs tracking-[0.1em] uppercase"
      >
        {isPending ? t("Creating account…") : t("Create account")}
      </button>
    </form>
  )
}

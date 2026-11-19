'use client'
import { useState } from 'react'
import { useTranslation } from '@/components/i18n/locale-provider'

const MONO = 'var(--font-space-mono), monospace'

interface PasswordFieldProps {
  id: string
  name: string
  label: string
  autoComplete: 'current-password' | 'new-password'
  minLength?: number
  describedBy?: string
  hint?: string
}

/** Password input with a show/hide toggle. The toggle is a real button that
 *  keeps focus order intact and announces its state to screen readers. */
export default function PasswordField({ id, name, label, autoComplete, minLength, describedBy, hint }: PasswordFieldProps) {
  const t = useTranslation()
  const [visible, setVisible] = useState(false)

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-bold tracking-wide text-white uppercase" style={{ fontFamily: MONO }}>
        {label}
      </label>
      <div className="flex" style={{ border: '1px solid #444444' }}>
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby={describedBy}
          className="w-full min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none"
          style={{ fontFamily: MONO }}
        />
        <button
          type="button"
          onClick={() => setVisible(value => !value)}
          aria-pressed={visible}
          className="min-h-11 shrink-0 px-3 text-xs text-white uppercase"
          style={{ fontFamily: MONO, borderLeft: '1px solid #444444' }}
        >
          {visible ? t('Hide') : t('Show')}
          <span className="sr-only"> {t('password')}</span>
        </button>
      </div>
      {hint && (
        <p className="text-xs text-[#999999]" style={{ fontFamily: MONO }}>
          {hint}
        </p>
      )}
    </div>
  )
}

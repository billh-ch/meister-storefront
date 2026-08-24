'use client'

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import { updateAddressAction } from '@/lib/account/actions'
import AddressFields from '@/components/address-fields'
import type { AddressInput } from '@/lib/address/schema'

const MONO = 'var(--font-space-mono), monospace'

export default function AddressForm({ initialAddress }: { initialAddress?: AddressInput }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [justSaved, setJustSaved] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await updateAddressAction({
        firstName: String(formData.get('firstName') ?? ''),
        lastName: String(formData.get('lastName') ?? ''),
        address1: String(formData.get('address1') ?? ''),
        address2: String(formData.get('address2') ?? '') || undefined,
        city: String(formData.get('city') ?? ''),
        postcode: String(formData.get('postcode') ?? ''),
        country: String(formData.get('country') ?? 'GR'),
        phone: String(formData.get('phone') ?? ''),
      })

      if (result.ok) {
        setJustSaved(true)
        timeoutRef.current = setTimeout(() => setJustSaved(false), 1500)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <AddressFields defaultValues={initialAddress} idPrefix="account-address" />

      {error && (
        <p aria-live="polite" className="text-xs" style={{ fontFamily: MONO, color: '#FF6B6B' }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="btn-gold flex h-12 w-full items-center justify-center text-xs tracking-[0.1em] uppercase sm:w-auto sm:px-8"
      >
        {isPending ? 'Saving…' : justSaved ? 'Saved' : 'Save address'}
      </button>
    </form>
  )
}

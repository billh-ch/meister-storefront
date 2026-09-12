import type { AddressInput } from '@/lib/address/schema'

const MONO = 'var(--font-space-mono), monospace'

// `w-full` + `min-w-0`: an <input> has a browser-default intrinsic minimum
// width (~20 characters) that a flex item won't shrink below on its own —
// on a narrow phone that pushed the two-column rows below (name, city/
// postcode, country/phone) past the viewport edge.
const FIELD_CLASS = 'w-full min-w-0 bg-transparent px-3 py-2 text-sm text-white outline-none'
const FIELD_STYLE = { border: '1px solid #444444', fontFamily: MONO }
const LABEL_CLASS = 'text-xs font-bold tracking-wide text-white uppercase'

interface AddressFieldsProps {
  defaultValues?: Partial<AddressInput>
  idPrefix: string
  /** Fired on every keystroke in the country field — checkout uses this to
   *  refresh the delivery-method list for the new country (shipping zones
   *  are country-scoped). Unused by the account "saved address" form. */
  onCountryChange?: (country: string) => void
}

/** The 8-field address block shared by checkout and the account "saved
 *  address" form — same `name`s either way so both parents read it via
 *  plain `FormData`. `idPrefix` keeps DOM ids unique if both ever render
 *  on the same page (matches `QuantityStepper`'s existing `id` prop). */
export default function AddressFields({ defaultValues, idPrefix, onCountryChange }: AddressFieldsProps) {
  return (
    <>
      <div className="flex gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor={`${idPrefix}-first-name`} className={LABEL_CLASS} style={{ fontFamily: MONO }}>
            First name
          </label>
          <input
            id={`${idPrefix}-first-name`}
            name="firstName"
            type="text"
            required
            autoComplete="given-name"
            defaultValue={defaultValues?.firstName}
            className={FIELD_CLASS}
            style={FIELD_STYLE}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor={`${idPrefix}-last-name`} className={LABEL_CLASS} style={{ fontFamily: MONO }}>
            Last name
          </label>
          <input
            id={`${idPrefix}-last-name`}
            name="lastName"
            type="text"
            required
            autoComplete="family-name"
            defaultValue={defaultValues?.lastName}
            className={FIELD_CLASS}
            style={FIELD_STYLE}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-address1`} className={LABEL_CLASS} style={{ fontFamily: MONO }}>
          Address
        </label>
        <input
          id={`${idPrefix}-address1`}
          name="address1"
          type="text"
          required
          autoComplete="address-line1"
          defaultValue={defaultValues?.address1}
          className={FIELD_CLASS}
          style={FIELD_STYLE}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-address2`} className={LABEL_CLASS} style={{ fontFamily: MONO }}>
          Apartment, suite, etc. (optional)
        </label>
        <input
          id={`${idPrefix}-address2`}
          name="address2"
          type="text"
          autoComplete="address-line2"
          defaultValue={defaultValues?.address2}
          className={FIELD_CLASS}
          style={FIELD_STYLE}
        />
      </div>

      <div className="flex gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor={`${idPrefix}-city`} className={LABEL_CLASS} style={{ fontFamily: MONO }}>
            City
          </label>
          <input
            id={`${idPrefix}-city`}
            name="city"
            type="text"
            required
            autoComplete="address-level2"
            defaultValue={defaultValues?.city}
            className={FIELD_CLASS}
            style={FIELD_STYLE}
          />
        </div>
        <div className="flex w-24 min-w-0 flex-col gap-1 sm:w-32">
          <label htmlFor={`${idPrefix}-postcode`} className={LABEL_CLASS} style={{ fontFamily: MONO }}>
            Postcode
          </label>
          <input
            id={`${idPrefix}-postcode`}
            name="postcode"
            type="text"
            required
            autoComplete="postal-code"
            defaultValue={defaultValues?.postcode}
            className={FIELD_CLASS}
            style={FIELD_STYLE}
          />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex w-20 min-w-0 flex-col gap-1 sm:w-24">
          <label htmlFor={`${idPrefix}-country`} className={LABEL_CLASS} style={{ fontFamily: MONO }}>
            Country
          </label>
          <input
            id={`${idPrefix}-country`}
            name="country"
            type="text"
            required
            maxLength={2}
            defaultValue={defaultValues?.country ?? 'GR'}
            autoComplete="country"
            onChange={onCountryChange ? (e) => onCountryChange(e.target.value) : undefined}
            className={`${FIELD_CLASS} uppercase`}
            style={FIELD_STYLE}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor={`${idPrefix}-phone`} className={LABEL_CLASS} style={{ fontFamily: MONO }}>
            Phone
          </label>
          <input
            id={`${idPrefix}-phone`}
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            defaultValue={defaultValues?.phone}
            className={FIELD_CLASS}
            style={FIELD_STYLE}
          />
        </div>
      </div>
    </>
  )
}

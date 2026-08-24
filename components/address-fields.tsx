import type { AddressInput } from '@/lib/address/schema'

const MONO = 'var(--font-space-mono), monospace'

const FIELD_CLASS = 'bg-transparent px-3 py-2 text-sm text-white outline-none'
const FIELD_STYLE = { border: '1px solid #444444', fontFamily: MONO }
const LABEL_CLASS = 'text-xs font-bold tracking-wide text-white uppercase'

interface AddressFieldsProps {
  defaultValues?: Partial<AddressInput>
  idPrefix: string
}

/** The 8-field address block shared by checkout and the account "saved
 *  address" form — same `name`s either way so both parents read it via
 *  plain `FormData`. `idPrefix` keeps DOM ids unique if both ever render
 *  on the same page (matches `QuantityStepper`'s existing `id` prop). */
export default function AddressFields({ defaultValues, idPrefix }: AddressFieldsProps) {
  return (
    <>
      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-1">
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
        <div className="flex flex-1 flex-col gap-1">
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
        <div className="flex flex-1 flex-col gap-1">
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
        <div className="flex w-32 flex-col gap-1">
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
        <div className="flex w-24 flex-col gap-1">
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
            className={`${FIELD_CLASS} uppercase`}
            style={FIELD_STYLE}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
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

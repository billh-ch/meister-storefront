'use client'
import { useTranslation } from '@/components/i18n/locale-provider'

import { useId } from 'react'
import type { AddonGroupView } from '@/lib/addons/contract'
import { formatPrice } from '@/lib/mock-data'

interface AddonSelectorProps {
  groups: AddonGroupView[]
  /** Chosen option ids, keyed by group id. A `single` group holds at most one. */
  chosen: Record<string, string[]>
  onChange: (groupId: string, optionIds: string[]) => void
}

const MONO = 'var(--font-space-mono), monospace'

/**
 * Optional paid extras. A pick-one group is a radio group with an explicit
 * "None" choice; a pick-any group is a set of checkboxes. Native inputs, so
 * keyboard and screen-reader behaviour comes for free. Only option ids leave
 * this component; the price shown here is never sent anywhere.
 */
export default function AddonSelector({ groups, chosen, onChange }: AddonSelectorProps) {
  const t = useTranslation()
  const baseId = useId()

  if (groups.length === 0) return null

  return (
    <div className="flex flex-col gap-4" data-addons>
      {groups.map((group, groupIndex) => {
        const picked = chosen[group.id] ?? []
        const name = `${baseId}-${groupIndex}`
        return (
          <fieldset key={group.id} className="border-0 p-0" data-addon-group={group.id}>
            <legend className="mb-2 text-xs font-bold tracking-wide text-white uppercase" style={{ fontFamily: MONO }}>
              {group.name}{' '}
              <span className="font-normal text-[#999999] normal-case">
                {group.type === 'single' ? t('(optional, choose one)') : t('(optional)')}
              </span>
            </legend>
            <div className="flex flex-col gap-2">
              {group.type === 'single' && (
                <AddonChoice
                  type="radio"
                  name={name}
                  label={t('None')}
                  checked={picked.length === 0}
                  onChange={() => onChange(group.id, [])}
                />
              )}
              {group.options.map((option) => {
                const isChecked = picked.includes(option.id)
                return (
                  <AddonChoice
                    key={option.id}
                    type={group.type === 'single' ? 'radio' : 'checkbox'}
                    name={name}
                    value={option.id}
                    label={option.name}
                    price={`+${formatPrice(option.priceCents / 100)}`}
                    checked={isChecked}
                    onChange={() => {
                      if (group.type === 'single') onChange(group.id, [option.id])
                      else onChange(group.id, isChecked ? picked.filter((id) => id !== option.id) : [...picked, option.id])
                    }}
                  />
                )
              })}
            </div>
          </fieldset>
        )
      })}
    </div>
  )
}

function AddonChoice(props: {
  type: 'radio' | 'checkbox'
  name: string
  value?: string
  label: string
  price?: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label
      className="flex min-h-[44px] cursor-pointer items-center gap-3 px-3 py-2 text-sm"
      style={{
        fontFamily: MONO,
        border: props.checked ? '2px solid #FFD700' : '1px solid #555555',
        color: '#FFFFFF',
      }}
    >
      <input
        type={props.type}
        name={props.name}
        value={props.value ?? ''}
        checked={props.checked}
        onChange={props.onChange}
        className="h-4 w-4 flex-shrink-0 cursor-pointer"
        style={{ accentColor: '#FFD700' }}
      />
      <span className="min-w-0 flex-1 break-words">{props.label}</span>
      {props.price && <span className="whitespace-nowrap text-[#FFD700]">{props.price}</span>}
    </label>
  )
}

'use client'

import { useId, useState } from 'react'

interface AccordionItemProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

const MONO = 'var(--font-space-mono), monospace'

/**
 * Each item owns its open state, so several can be open at once. That is a
 * deliberate departure from the homepage accordion: an exclusive accordion
 * collapses the section a shopper is reading the moment they open another,
 * which is hostile to the audience this page targets. It also means the
 * children stay server-rendered — no context, no lifting state up.
 *
 * Reuses the `.accordion-content` / `.accordion-chevron` / `data-open`
 * pattern from globals.css, plus the `aria-controls` wiring the homepage
 * version lacks.
 */
export default function AccordionItem({
  title,
  defaultOpen = false,
  children,
}: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const panelId = useId()
  const buttonId = `${panelId}-trigger`

  return (
    <div style={{ borderTop: '1px solid #333333' }}>
      <h2>
        <button
          id={buttonId}
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="flex w-full cursor-pointer items-center justify-between gap-4 py-4 text-left text-sm font-bold"
          style={{ fontFamily: MONO, color: isOpen ? '#FFD700' : '#FFFFFF' }}
        >
          <span>{title}</span>
          <span
            className="accordion-chevron flex-shrink-0 text-lg text-[#FFD700]"
            data-open={isOpen ? 'true' : 'false'}
            aria-hidden="true"
          >
            +
          </span>
        </button>
      </h2>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className="accordion-content"
        data-open={isOpen ? 'true' : 'false'}
      >
        <div>
          <div className="pb-5">{children}</div>
        </div>
      </div>
    </div>
  )
}

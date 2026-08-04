import { trustItems } from '@/lib/mock-data'

const MONO = 'var(--font-space-mono), monospace'

/**
 * Four reassurance cells, placed directly below the buy box where price
 * anxiety peaks. Every cell carries a text label — icon-only cells are
 * guesswork for anyone who hasn't learned the icon vocabulary.
 */
export default function ProductTrustStrip() {
  return (
    <ul
      className="grid grid-cols-1 gap-px sm:grid-cols-2"
      style={{ backgroundColor: '#333333', border: '1px solid #333333' }}
    >
      {trustItems.map((item) => {
        const content = (
          <>
            <TrustIcon id={item.id} />
            <span className="min-w-0">
              <span
                className="block text-sm font-bold tracking-wide text-white"
                style={{ fontFamily: MONO }}
              >
                {item.title}
              </span>
              <span
                className="mt-0.5 block text-sm text-[#CCCCCC]"
                style={{ fontFamily: MONO }}
              >
                {item.detail}
              </span>
            </span>
          </>
        )

        return (
          <li key={item.id} style={{ backgroundColor: '#1B1B18' }}>
            {item.href ? (
              <a
                href={item.href}
                className="flex min-h-[72px] items-center gap-3 p-4 transition-colors hover:bg-[#232320]"
              >
                {content}
              </a>
            ) : (
              <div className="flex min-h-[72px] items-center gap-3 p-4">{content}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

const ICON_PATHS: Record<string, React.ReactNode> = {
  shipping: (
    <>
      <rect x="1" y="6" width="14" height="11" rx="1" />
      <path d="M15 9h4l3 3v5h-7z" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
    </>
  ),
  returns: (
    <>
      <polyline points="3 4 3 10 9 10" />
      <path d="M3.5 14a9 9 0 1 0 2.1-9.4L3 7" />
    </>
  ),
  secure: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 1 1 8 0v3" />
    </>
  ),
  help: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
  ),
}

function TrustIcon({ id }: { id: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FFD700"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-shrink-0"
      aria-hidden="true"
    >
      {ICON_PATHS[id]}
    </svg>
  )
}

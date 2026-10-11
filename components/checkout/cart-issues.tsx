import Link from 'next/link'
import type { CheckoutCartIssue } from '@/lib/checkout/model'

export default function CheckoutCartIssues({ error, issues }: { error: string; issues: CheckoutCartIssue[] }) {
  return (
    <div role="alert" className="flex flex-col gap-3 border border-[#FF6B6B]/50 p-4 text-xs text-white">
      <p>{error}</p>
      {issues.map((issue, index) => (
        <div key={`${issue.slug}-${index}`}>
          <p className="font-bold">{issue.name}</p>
          <p className="mt-1 text-[#CCCCCC]">{issue.message}</p>
        </div>
      ))}
      <Link href="/cart" className="flex min-h-11 items-center text-[#FFD700] underline">Review cart</Link>
    </div>
  )
}

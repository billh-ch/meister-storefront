'use client'
import { useTranslation } from '@/components/i18n/locale-provider'
import Link from '@/components/i18n/localized-link'
import type { CheckoutCartIssue } from '@/lib/checkout/model'

export default function CheckoutCartIssues({ error, issues }: { error: string; issues: CheckoutCartIssue[] }) {
  const t = useTranslation()

  return (
    <div role="alert" className="flex flex-col gap-3 border border-[#FF6B6B]/50 p-4 text-xs text-white">
      <p>{t(error)}</p>
      {issues.map((issue, index) => (
        <div key={`${issue.slug}-${index}`}>
          <p className="font-bold">{issue.name}</p>
          <p className="mt-1 text-[#CCCCCC]">{t(issue.message)}</p>
        </div>
      ))}
      <Link href="/cart" className="flex min-h-11 items-center text-[#FFD700] underline">{t("Review cart")}</Link>
    </div>
  )
}

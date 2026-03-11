'use client'

import { useRouter, usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

type BackToSectionWidgetProps = {
  href?: string
  label?: string
}

export default function BackToSectionWidget({
  href,
  label,
}: BackToSectionWidgetProps) {
  const router = useRouter()
  const pathname = usePathname()

  const resolvedHref =
    href ??
    (pathname.startsWith('/applications/')
      ? '/applications'
      : pathname.startsWith('/technical-resources/')
        ? '/technical-resources'
        : '')

  const resolvedLabel =
    label ??
    (pathname.startsWith('/applications/')
      ? 'Applications'
      : pathname.startsWith('/technical-resources/')
        ? 'Technical Resources'
        : 'Back')

  if (!resolvedHref) return null

  return (
    <button
      type="button"
      onClick={() => router.push(resolvedHref)}
      className="fixed left-3 top-1/2 z-[9999] -translate-y-1/2 rounded-r-2xl border border-stone-200 border-l-0 bg-white px-4 py-3 text-sm font-semibold text-stone-900 shadow-2xl transition hover:bg-stone-50 lg:left-0"
      aria-label={`Back to ${resolvedLabel}`}
    >
      <span className="flex items-center gap-2 whitespace-nowrap">
        <ArrowLeft className="h-4 w-4 text-emerald-800" />
        <span>Back to {resolvedLabel}</span>
      </span>
    </button>
  )
}
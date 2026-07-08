/* app/finance/loading.tsx
   Instant skeleton shown while a finance page renders on the server. */

export default function FinanceLoading() {
  return (
    <div className="animate-pulse space-y-6 p-6" aria-hidden>
      <div className="h-7 w-48 bg-gray-200 rounded-md" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-xl border border-gray-100" />
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-10 bg-gray-100 rounded-lg" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-11 bg-gray-50 rounded-lg border border-gray-100" />
        ))}
      </div>
    </div>
  )
}

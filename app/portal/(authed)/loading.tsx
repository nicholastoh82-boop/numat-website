/* app/portal/(authed)/loading.tsx
   Shown instantly by Next.js the moment a portal link is clicked, while the
   server renders the real page. Removes the frozen feeling on navigation. */

export default function PortalLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      <div className="h-7 w-56 bg-gray-200 rounded-md" />
      <div className="h-4 w-80 bg-gray-100 rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl border border-gray-100" />
        ))}
      </div>
      <div className="space-y-3 pt-2">
        <div className="h-10 bg-gray-100 rounded-lg" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-50 rounded-lg border border-gray-100" />
        ))}
      </div>
    </div>
  )
}

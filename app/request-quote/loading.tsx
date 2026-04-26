// app/request-quote/loading.tsx
export default function RequestQuoteLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-20">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-stone-200 rounded mb-4" />
          <div className="h-4 w-72 bg-stone-100 rounded mb-10" />
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="mb-6">
              <div className="h-3 w-24 bg-stone-200 rounded mb-2" />
              <div className="h-10 w-full bg-stone-100 rounded" />
            </div>
          ))}
          <div className="h-12 w-36 bg-stone-300 rounded-full mt-6" />
        </div>
      </div>
    </div>
  );
}

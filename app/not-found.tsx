import Link from 'next/link'
import Header from '@/components/header'
import Footer from '@/components/footer'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center bg-background">
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <p className="text-6xl font-bold text-primary/20">404</p>
          <h1 className="mt-4 font-serif text-3xl text-foreground">Page not found</h1>
          <p className="mt-4 text-muted-foreground">
            The page you are looking for does not exist or may have been moved.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-[#16361f] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#204a2b]"
            >
              Go to Homepage
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-50"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const productTags = [
  'NuBam Boards',
  'NuDoor',
  'NuFloor',
  'NuWall',
  'NuSlat',
  'Furniture',
]

export function CTASection() {
  return (
    <section className="bg-[#f7f2e8] py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="overflow-hidden rounded-[40px] border border-black/10 bg-[#16241a] shadow-[0_35px_100px_rgba(22,36,26,0.22)] lg:grid lg:grid-cols-[0.98fr_1.02fr]">
          <div className="flex flex-col justify-center px-6 py-12 text-white sm:px-8 lg:px-12 lg:py-16">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-white/65">
              Start a project conversation
            </p>

            <h2 className="mt-3 max-w-2xl font-serif text-3xl leading-tight sm:text-4xl lg:text-5xl">
              Build the quote around the right bamboo family from the start.
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-white/74">
              Browse the range, select what fits the project, and continue the
              enquiry through a cleaner quote flow designed for serious buyers.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/products">
                <Button size="lg" variant="secondary" className="w-full rounded-full px-6 sm:w-auto">
                  Browse Products
                </Button>
              </Link>

              <Link href="/cart">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full rounded-full border-white/20 bg-transparent px-6 text-white hover:bg-white/10 sm:w-auto"
                >
                  Request a Quote
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {productTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/12 bg-white/6 px-3 py-1.5 text-sm text-white/78"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="relative min-h-[340px] lg:min-h-full">
            <Image
              src="/Bamboo-Door.png"
              alt="Bamboo door interior"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-black/5 via-black/25 to-[#16241a]/10" />

            <div className="absolute bottom-6 left-6 right-6 rounded-[28px] border border-white/12 bg-black/20 p-5 text-white backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/68">
                Quote-ready details
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-white/60">Product</p>
                  <p className="mt-1 text-sm font-semibold">Family and model</p>
                </div>
                <div>
                  <p className="text-xs text-white/60">Specification</p>
                  <p className="mt-1 text-sm font-semibold">Size and thickness</p>
                </div>
                <div>
                  <p className="text-xs text-white/60">Requirement</p>
                  <p className="mt-1 text-sm font-semibold">Quantity and market</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
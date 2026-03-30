import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const audienceTags = [
  'Architects',
  'Contractors',
  'Developers',
  'Interior designers',
  'Furniture makers',
]

const facts = [
  {
    label: 'Collections',
    value: 'Six curated product families across boards, doors, floors, walls, slats, and furniture applications.',
  },
  {
    label: 'Pricing',
    value: 'Local currency display based on the selected market, with USD as the base reference.',
  },
  {
    label: 'Quote flow',
    value: 'Configured products continue into the cart and can be handed off through WhatsApp.',
  },
  {
    label: 'Use case',
    value: 'Built for interiors, fit-outs, commercial sourcing, and design-led project work.',
  },
]

export function HeroSection() {
  return (
    <section className="border-b border-black/5 bg-[#f4ede2]">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-18">
        <div className="grid items-center gap-12 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/70 px-4 py-1.5 text-sm font-medium text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Engineered bamboo for premium interiors
            </div>

            <h1 className="mt-6 font-serif text-4xl leading-[1.02] text-foreground sm:text-5xl lg:text-[4.25rem]">
              Refined bamboo materials for design-led spaces and modern project sourcing.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-foreground/68">
              NUMAT brings together boards, doors, flooring, wall finishes, slats,
              and furniture applications in a cleaner, more considered buying
              experience for serious trade and project clients.
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {audienceTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-black/8 bg-white/72 px-3 py-1.5 text-sm text-foreground/78"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/products">
                <Button size="lg" className="w-full rounded-full px-6 sm:w-auto">
                  Browse Products
                </Button>
              </Link>

              <Link href="/cart">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full rounded-full border-black/10 bg-white/75 px-6 sm:w-auto"
                >
                  Request a Quote
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.12fr_0.88fr]">
            <div className="relative min-h-[420px] overflow-hidden rounded-[34px] border border-black/8 bg-card shadow-[0_30px_90px_rgba(17,24,39,0.08)] sm:col-span-2 lg:col-span-1 lg:row-span-2 lg:min-h-[620px]">
              <Image
                src="/Bamboo-Furniture.png"
                alt="Bamboo furniture interior"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white lg:p-8">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/78">
                  NUMAT collection
                </p>
                <h2 className="mt-3 max-w-md font-serif text-2xl leading-tight sm:text-3xl">
                  Warm materiality, cleaner detailing, and a more premium architectural feel.
                </h2>
              </div>
            </div>

            <div className="relative min-h-[240px] overflow-hidden rounded-[28px] border border-black/8 bg-card shadow-lg">
              <Image
                src="/Bamboo-Door.png"
                alt="Bamboo door application"
                fill
                sizes="(max-width: 1024px) 100vw, 24vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/75">
                  NuDoor
                </p>
                <p className="mt-2 text-lg font-semibold">
                  Interior door systems with a warmer material story
                </p>
              </div>
            </div>

            <div className="relative min-h-[240px] overflow-hidden rounded-[28px] border border-black/8 bg-card shadow-lg">
              <Image
                src="/Bamboo-Board.png"
                alt="Bamboo board material"
                fill
                sizes="(max-width: 1024px) 100vw, 24vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/75">
                  NuBam Boards
                </p>
                <p className="mt-2 text-lg font-semibold">
                  Boards for furniture, joinery, and interior applications
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-6 border-t border-black/8 pt-8 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label}>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/45">
                {fact.label}
              </p>
              <p className="mt-3 text-sm leading-6 text-foreground/78">{fact.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
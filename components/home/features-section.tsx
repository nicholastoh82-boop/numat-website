import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Building2, FileText, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const pillars = [
  {
    title: 'Browse by material family',
    description:
      'Move directly into boards, doors, flooring, walls, slats, or furniture applications instead of searching through a generic list.',
  },
  {
    title: 'Review the configuration clearly',
    description:
      'Model, thickness, dimensions, MOQ, and quantity are structured to make product evaluation more straightforward.',
  },
  {
    title: 'Keep the quote moving',
    description:
      'Selected items continue into the cart and can be handed off through WhatsApp or Viber with more context intact.',
  },
]

const journey = [
  {
    icon: Building2,
    title: 'Choose a family',
    description: 'Start with the product range that best fits the project.',
  },
  {
    icon: FileText,
    title: 'Build the configuration',
    description: 'Review the model, size, thickness, and quantity requirements.',
  },
  {
    icon: MessageCircle,
    title: 'Continue the enquiry',
    description: 'Move the quote into chat with a cleaner request summary.',
  },
]

export function FeaturesSection() {
  return (
    <section className="bg-[#f5efe4] py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.95fr]">
          <div className="relative min-h-[420px] overflow-hidden rounded-[36px] border border-black/8 bg-card shadow-lg lg:min-h-[620px]">
            <Image
              src="/Bamboo-Wall.png"
              alt="Bamboo wall application"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/8 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white lg:p-8">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/75">
                For specification and sourcing
              </p>
              <h3 className="mt-3 max-w-md font-serif text-2xl leading-tight sm:text-3xl">
                A clearer route from inspiration to product selection.
              </h3>
            </div>
          </div>

          <div className="max-w-xl">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary">
              The NUMAT experience
            </p>
            <h2 className="mt-3 font-serif text-3xl text-foreground sm:text-4xl lg:text-5xl">
              Better structure, better confidence, better project conversations.
            </h2>
            <p className="mt-5 text-lg leading-8 text-foreground/65">
              Premium material brands feel stronger when the experience is calm,
              clear, and commercially useful. NUMAT should help buyers understand
              the range faster and continue the quote with less friction.
            </p>

            <div className="mt-10 space-y-8">
              {pillars.map((pillar, index) => (
                <div
                  key={pillar.title}
                  className="flex gap-5 border-t border-black/8 pt-6 first:border-t-0 first:pt-0"
                >
                  <span className="font-serif text-3xl text-primary/50">
                    0{index + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {pillar.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-foreground/65">
                      {pillar.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Link href="/products">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-black/10 bg-transparent px-6"
                >
                  Explore the range
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-14 rounded-[34px] border border-black/8 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary">
                Quote journey
              </p>
              <h3 className="mt-3 font-serif text-2xl text-foreground sm:text-3xl">
                Three steps toward a cleaner enquiry.
              </h3>
            </div>

            <Link href="/cart">
              <Button className="rounded-full bg-[#16361f] px-6 text-primary-foreground hover:bg-[#204a2b]">
                Open quote cart
              </Button>
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {journey.map(({ icon: Icon, title, description }, index) => (
              <div
                key={title}
                className="rounded-[26px] border border-black/8 bg-[#faf6ef] p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground/35">
                    0{index + 1}
                  </span>
                </div>

                <h4 className="mt-5 text-base font-semibold text-foreground">
                  {title}
                </h4>
                <p className="mt-3 text-sm leading-6 text-foreground/65">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
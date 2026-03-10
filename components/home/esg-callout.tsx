import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Award, Leaf, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

const points = [
  {
    title: 'A renewable material narrative',
    description:
      'Engineered bamboo supports a more responsible material story for buyers who care about sourcing and long-term relevance.',
    icon: Leaf,
  },
  {
    title: 'Design warmth with material honesty',
    description:
      'Natural grain, warmth, and texture help the product feel more tactile and differentiated in premium interiors.',
    icon: ShieldCheck,
  },
  {
    title: 'Stronger sustainability positioning',
    description:
      'Useful for commercial, residential, and brand-led projects where material choice matters to the overall story.',
    icon: Award,
  },
]

export function ESGCallout() {
  return (
    <section className="bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-[#f7f1e7] px-4 py-1.5 text-sm font-medium text-primary">
              <Award className="h-4 w-4" />
              Sustainability and material relevance
            </div>

            <h2 className="mt-6 font-serif text-3xl text-foreground sm:text-4xl lg:text-5xl">
              A premium material story shaped by design, renewability, and long-term appeal.
            </h2>

            <p className="mt-6 text-lg leading-8 text-foreground/65">
              NUMAT works best when bamboo is presented not only as a sustainable
              option, but as a refined, design-ready material for better interiors,
              cleaner specification conversations, and more thoughtful project choices.
            </p>

            <div className="mt-10 space-y-6">
              {points.map(({ title, description, icon: Icon }) => (
                <div
                  key={title}
                  className="flex gap-4 border-t border-black/8 pt-6 first:border-t-0 first:pt-0"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#f7f1e7]">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{title}</h3>
                    <p className="mt-2 text-sm leading-7 text-foreground/65">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Link href="/esg">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-black/10 bg-transparent px-6"
                >
                  Explore sustainability
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative min-h-[420px] overflow-hidden rounded-[34px] border border-black/8 bg-card shadow-lg sm:col-span-2 lg:min-h-[520px]">
              <Image
                src="/Bamboo-Flooring.png"
                alt="Bamboo flooring material"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/8 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white lg:p-8">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/75">
                  Material perspective
                </p>
                <h3 className="mt-3 max-w-md font-serif text-2xl leading-tight sm:text-3xl">
                  Designed to feel warm, natural, and more enduring than purely synthetic finishes.
                </h3>
              </div>
            </div>

            <div className="rounded-[28px] border border-black/8 bg-[#faf6ef] p-6">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
                Application range
              </p>
              <p className="mt-3 text-sm leading-7 text-foreground/68">
                Suitable across boards, doors, flooring, walls, slats, and furniture applications.
              </p>
            </div>

            <div className="rounded-[28px] border border-black/8 bg-[#faf6ef] p-6">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
                Brand context
              </p>
              <p className="mt-3 text-sm leading-7 text-foreground/68">
                A stronger sustainability message helps frame NUMAT as a more considered alternative to conventional material suppliers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
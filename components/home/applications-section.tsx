import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, type LucideIcon, Armchair, DoorOpen, Hammer, Layers, LayoutGrid, PanelTop } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Application = {
  name: string
  description: string
  image: string
  icon: LucideIcon
  href: string
  tags: string[]
}

const applications: Application[] = [
  {
    name: 'NuBam Boards',
    description:
      'Engineered bamboo boards for joinery, cabinetry, shelving, and furniture-grade interior use.',
    image: '/Bamboo-Board.png',
    icon: Layers,
    href: '/products?category=nubam-boards',
    tags: ['Joinery', 'Cabinetry', 'Furniture'],
  },
  {
    name: 'NuDoor',
    description:
      'Bamboo door applications for cleaner, warmer residential and hospitality interiors.',
    image: '/Bamboo-Door.png',
    icon: DoorOpen,
    href: '/products?category=nudoor',
    tags: ['Doors', 'Residential', 'Hospitality'],
  },
  {
    name: 'NuFloor',
    description:
      'Flooring solutions for modern homes, apartments, and commercial spaces.',
    image: '/Bamboo-Flooring.png',
    icon: LayoutGrid,
    href: '/products?category=nufloor',
    tags: ['Flooring', 'Homes', 'Interiors'],
  },
  {
    name: 'NuWall',
    description:
      'Wall surfaces and cladding expressions with texture, warmth, and natural grain.',
    image: '/Bamboo-Wall.png',
    icon: PanelTop,
    href: '/products?category=nuwall',
    tags: ['Walls', 'Feature surfaces', 'Interiors'],
  },
  {
    name: 'Furniture',
    description:
      'Furniture applications built around durable bamboo boards and clean contemporary forms.',
    image: '/Bamboo-Furniture.png',
    icon: Armchair,
    href: '/products?category=furniture',
    tags: ['Tables', 'Storage', 'Custom pieces'],
  },
  {
    name: 'NuSlat',
    description:
      'Decorative slat applications for finer architectural detailing and interior rhythm.',
    image: '/Bamboo-DIY.png',
    icon: Hammer,
    href: '/products?category=nuslat',
    tags: ['Decorative', 'Feature detailing', 'Slat walls'],
  },
]

export function ApplicationsSection() {
  return (
    <section className="bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.78fr_1.22fr]">
          <div className="max-w-xl lg:sticky lg:top-28 lg:self-start">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary">
              Collections
            </p>
            <h2 className="mt-3 font-serif text-3xl text-foreground sm:text-4xl lg:text-5xl">
              Six product families, structured for faster decision-making.
            </h2>
            <p className="mt-5 text-lg leading-8 text-foreground/65">
              Instead of burying everything in one catalogue, NUMAT helps buyers
              enter the right material family first, then move into products,
              configuration, and quoting with more clarity.
            </p>

            <div className="mt-8">
              <Link href="/products">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-black/10 bg-transparent px-6"
                >
                  View all products
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[34px] border border-black/8 bg-[#faf5ec] shadow-sm">
            {applications.map((app, index) => {
              const Icon = app.icon

              return (
                <Link
                  key={app.name}
                  href={app.href}
                  className="group grid items-center gap-6 border-b border-black/8 p-6 transition-colors hover:bg-white/55 last:border-b-0 sm:grid-cols-[1fr_180px] lg:p-8"
                >
                  <div>
                    <div className="flex items-start gap-4">
                      <span className="font-serif text-2xl text-primary/55">
                        0{index + 1}
                      </span>

                      <div className="flex-1">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-xs font-medium text-primary shadow-sm">
                          <Icon className="h-3.5 w-3.5" />
                          {app.name}
                        </div>

                        <p className="mt-4 max-w-xl text-lg leading-7 text-foreground">
                          {app.description}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {app.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-black/6 bg-white/70 px-2.5 py-1 text-xs font-medium text-foreground/70"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                          Explore family
                          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] border border-black/8 bg-white shadow-sm">
                    <Image
                      src={app.image}
                      alt={app.name}
                      fill
                      sizes="(max-width: 1024px) 100vw, 180px"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
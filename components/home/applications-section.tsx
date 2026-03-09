import Link from 'next/link'
import Image from 'next/image'
import {
  Armchair,
  DoorOpen,
  LayoutGrid,
  PanelTop,
  Layers,
  Hammer,
  ArrowRight,
} from 'lucide-react'

const applications = [
  {
    name: 'Furniture',
    description: 'Tables, cabinets, and custom pieces',
    image: '/Bamboo-Furniture.png',
    icon: Armchair,
    href: '/products?category=furniture',
    featured: true,
  },
  {
    name: 'NuDoor',
    description: 'Interior and exterior door panels',
    image: '/Bamboo-Door.png',
    icon: DoorOpen,
    href: '/products?category=nudoor',
  },
  {
    name: 'NuFloor',
    description: 'Click-lock and strand woven floors',
    image: '/Bamboo-Flooring.png',
    icon: LayoutGrid,
    href: '/products?category=nufloor',
  },
  {
    name: 'NuWall',
    description: 'Interior cladding and feature walls',
    image: '/Bamboo-Wall.png',
    icon: PanelTop,
    href: '/products?category=nuwall',
  },
  {
    name: 'NuBam Boards',
    description: 'Engineered bamboo boards for furniture and interiors',
    image: '/Bamboo-Board.png',
    icon: Layers,
    href: '/products?category=nubam-boards',
  },
  {
    name: 'NuSlat',
    description: 'Decorative slat applications and feature designs',
    image: '/Bamboo-Slat.png',
    icon: Hammer,
    href: '/products?category=nuslat',
  },
]

export function ApplicationsSection() {
  return (
    <section className="bg-secondary py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="font-serif text-3xl text-foreground sm:text-4xl">
            Applications
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Bamboo boards engineered for every purpose. Select your application
            to explore our curated product range.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {applications.map((app) => (
            <Link
              key={app.name}
              href={app.href}
              className="group flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <Image
                  src={app.image}
                  alt={app.name}
                  fill
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-semibold">{app.name}</h3>
                <p className="mt-1 text-sm text-gray-600">{app.description}</p>

                <div className="mt-auto pt-4 text-sm font-medium text-green-700">
                  View products →
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 font-medium text-primary hover:underline underline-offset-4"
          >
            View all products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
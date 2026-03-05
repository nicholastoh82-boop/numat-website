import Link from 'next/link'
import Image from 'next/image'
import { 
  Armchair, 
  DoorOpen, 
  LayoutGrid, 
  Building2, 
  PanelTop, 
  Layers, 
  Building, 
  Hammer,
  ArrowRight
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
    name: 'Door',
  description: 'Interior and exterior door panels',
  image: '/Bamboo-Door.png',
  icon: DoorOpen,
  href: '/products?category=door',
  },
  {
    name: 'Flooring',
  description: 'Click-lock and strand woven floors',
  image: '/Bamboo-Flooring.png',
  icon: LayoutGrid,
  href: '/products?category=flooring',
  },
  
  {
    name: 'Wall Panelling',
  description: 'Interior cladding and feature walls',
  image: '/Bamboo-Wall.png',
  icon: PanelTop,
  href: '/products?category=wall',
  },
  {
    name: 'Veneer',
  description: 'Thin sheets for overlay applications',
  image: '/Bamboo-Board.png',
  icon: Layers,
  href: '/products?category=veneer',
  },
  
  {
    name: 'DIY Project',
  description: 'Craft boards and home projects',
  image: '/Bamboo-DIY.png',
  icon: Hammer,
  href: '/products?category=diy',
  },
]

export function ApplicationsSection() {
  return (
    <section className="py-20 bg-secondary">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl text-foreground">
            Applications
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Bamboo boards engineered for every purpose. Select your application 
            to explore our curated product range.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {applications.map((app) => (
  <Link
  key={app.name}
  href={app.href}
  className="group flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md"
>
  {/* Image */}
  <div className="relative aspect-[4/3] w-full">
    <Image
      src={app.image}
      alt={app.name}
      fill
      className="object-cover transition duration-300 group-hover:scale-105"
    />
  </div>

  {/* Text */}
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

        {/* View all */}
        <div className="mt-10 text-center">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-primary font-medium hover:underline underline-offset-4"
          >
            View all products
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

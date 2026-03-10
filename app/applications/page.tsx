import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Briefcase, Building2, Sofa, PanelsTopLeft } from 'lucide-react'

export const metadata = {
  title: 'Applications | NUMAT',
  description:
    'Explore commercial and interior applications for NUMAT engineered bamboo boards.',
}

const applications = [
  {
    title: 'Furniture Manufacturing',
    description:
      'Boards suited for tables, shelving, cabinetry, and custom furniture production.',
    icon: Sofa,
  },
  {
    title: 'Interior Fit-Outs',
    description:
      'For joinery, wall systems, feature panels, and premium interior surfacing.',
    icon: PanelsTopLeft,
  },
  {
    title: 'Hospitality and Commercial Spaces',
    description:
      'A strong fit for hotels, retail environments, offices, and branded interiors.',
    icon: Building2,
  },
  {
    title: 'Project and Procurement Use',
    description:
      'Supported with quotation assistance, sample coordination, and commercial documentation.',
    icon: Briefcase,
  },
]

export default function ApplicationsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />

      <main className="flex-1 bg-background">
        <section className="bg-secondary py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="max-w-3xl">
              <h1 className="font-serif text-4xl text-foreground sm:text-5xl">
                Applications
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                NUMAT engineered bamboo boards are designed for furniture,
                interiors, cabinetry, fit-outs, and commercial project use.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="grid gap-6 md:grid-cols-2">
              {applications.map((item) => {
                const Icon = item.icon

                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-border bg-card p-6 shadow-sm"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>

                    <h2 className="text-xl font-semibold text-foreground">
                      {item.title}
                    </h2>

                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                )
              })}
            </div>

            <div className="mt-12 rounded-3xl bg-primary p-8 text-center sm:p-10">
              <h2 className="font-serif text-3xl text-primary-foreground">
                Need help choosing the right product?
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-primary-foreground/80">
                Talk to our team about suitable product lines, specifications,
                samples, and quotations for your application.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/products">
                  <Button variant="secondary">Browse Products</Button>
                </Link>

                <Link href="/request-quote">
                  <Button
                    variant="outline"
                    className="border-white/30 bg-transparent text-white hover:bg-white/10"
                  >
                    Request Quote
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
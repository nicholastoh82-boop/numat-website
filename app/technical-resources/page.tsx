import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileText, Ruler, ShieldCheck, Wrench } from 'lucide-react'

export const metadata = {
  title: 'Technical Resources | NUMAT',
  description:
    'Technical resources for NUMAT engineered bamboo boards, including specs, certifications, and application guidance.',
}

const resources = [
  {
    title: 'Technical Data Sheets',
    description:
      'Product specifications, board properties, and technical reference information.',
    icon: FileText,
  },
  {
    title: 'Dimensions and Thicknesses',
    description:
      'Standard sizing information and board thickness options by application.',
    icon: Ruler,
  },
  {
    title: 'Certifications',
    description:
      'Support for FSC-certified sourcing and sustainability-related documentation.',
    icon: ShieldCheck,
  },
  {
    title: 'Installation and Care Guidance',
    description:
      'Helpful reference for handling, application suitability, and maintenance guidance.',
    icon: Wrench,
  },
]

export default function TechnicalResourcesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />

      <main className="flex-1 bg-background">
        <section className="bg-secondary py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="max-w-3xl">
              <h1 className="font-serif text-4xl text-foreground sm:text-5xl">
                Technical Resources
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                Access the technical information buyers, designers, and project
                teams need before requesting samples or quotations.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="grid gap-6 md:grid-cols-2">
              {resources.map((item) => {
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

            <div className="mt-12 rounded-3xl border border-border bg-card p-8 shadow-sm">
              <h2 className="text-2xl font-semibold text-foreground">
                Need specific technical documents?
              </h2>
              <p className="mt-4 max-w-2xl text-muted-foreground leading-7">
                Until the full document library is live, contact our team for
                technical data sheets, certification support, dimensions,
                application guidance, and quotation documents.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/contact">
                  <Button>Contact Sales</Button>
                </Link>
                <Link href="/request-samples">
                  <Button variant="outline">Request Samples</Button>
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
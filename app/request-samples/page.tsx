import Header from '@/components/header'
import Footer from '@/components/footer'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PackageCheck, FileText, MessageSquare } from 'lucide-react'

export const metadata = {
  title: 'Request Samples | NUMAT',
  description:
    'Request bamboo board samples and speak with NUMAT about specifications, availability, and commercial applications.',
}

export default function RequestSamplesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <section className="bg-secondary py-16 lg:py-20">
          <div className="mx-auto max-w-5xl px-4 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                <PackageCheck className="h-4 w-4" />
                Sample Support
              </div>

              <h1 className="mt-6 font-serif text-4xl text-foreground sm:text-5xl">
                Request Samples
              </h1>

              <p className="mt-5 text-lg leading-8 text-muted-foreground">
                Evaluate finish, thickness, and suitability before placing a larger order.
                Our team can help you identify the right bamboo board options for your
                project, fit-out, or manufacturing use.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="mx-auto max-w-5xl px-4 lg:px-8">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold text-foreground">Tell us what you need</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Share your application, preferred thickness, dimensions, and sample quantity.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold text-foreground">Review product options</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  We will recommend suitable product lines and help confirm availability.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold text-foreground">Coordinate delivery</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Our team will follow up with sample terms, lead time, and shipment details.
                </p>
              </div>
            </div>

            <div className="mt-10 rounded-3xl border border-border bg-card p-8 shadow-sm">
              <h3 className="text-2xl font-semibold text-foreground">Next step</h3>
              <p className="mt-4 max-w-2xl text-muted-foreground leading-7">
                Until the full sample request form is live, use one of the options below to
                contact sales and request samples.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/contact">
                  <Button className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Contact Sales
                  </Button>
                </Link>

                <Link href="/products">
                  <Button variant="outline" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Browse Products
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
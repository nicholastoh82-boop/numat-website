import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BarChart3, ShieldCheck, MessageSquare } from 'lucide-react'

export const metadata = {
  title: 'Testing & Certifications | NUMAT',
  description:
    'Review DOST-supported testing results and performance comparisons for NUMAT engineered bamboo boards.',
}

export default function TestingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />

      <main className="flex-1 bg-background">
        <section className="bg-secondary py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                <ShieldCheck className="h-4 w-4" />
                DOST Testing Results
              </div>

              <h1 className="mt-6 font-serif text-4xl text-foreground sm:text-5xl">
                Third-Party Testing & Performance Comparison
              </h1>

              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                NUMAT engineered bamboo boards have undergone ASTM D1037 mechanical
                testing. The results below are presented alongside typical plywood
                reference values to help buyers assess performance more clearly.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/request-quote">
                  <Button className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Request Quote
                  </Button>
                </Link>

                <Link href="/contact">
                  <Button variant="outline" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Contact Sales for Full Results
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              <div className="border-b border-border bg-stone-950 px-6 py-5 text-white">
                <h2 className="text-xl font-semibold">NUMAT Bamboo vs Typical Plywood</h2>
                <p className="mt-1 text-sm text-stone-300">
                  DOST / ASTM D1037 test results versus common plywood reference ranges.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead className="bg-stone-100">
                    <tr>
                      <th className="border-b border-border px-6 py-4 text-left text-sm font-semibold text-foreground">
                        Metric
                      </th>
                      <th className="border-b border-border px-6 py-4 text-left text-sm font-semibold text-foreground">
                        NUMAT Engineered Bamboo
                      </th>
                      <th className="border-b border-border px-6 py-4 text-left text-sm font-semibold text-foreground">
                        Typical Plywood
                      </th>
                      <th className="border-b border-border px-6 py-4 text-left text-sm font-semibold text-foreground">
                        Commercial Reading
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr className="align-top">
                      <td className="border-b border-border px-6 py-5 text-sm font-medium text-foreground">
                        MOR
                      </td>
                      <td className="border-b border-border px-6 py-5 text-sm text-foreground">
                        22.77–69.44 MPa
                      </td>
                      <td className="border-b border-border px-6 py-5 text-sm text-foreground">
                        ~30–60 MPa
                      </td>
                      <td className="border-b border-border px-6 py-5 text-sm leading-7 text-muted-foreground">
                        Bending strength range shows NUMAT can compete with or exceed
                        typical plywood depending on configuration.
                      </td>
                    </tr>

                    <tr className="align-top bg-stone-50/70">
                      <td className="border-b border-border px-6 py-5 text-sm font-medium text-foreground">
                        MOE
                      </td>
                      <td className="border-b border-border px-6 py-5 text-sm text-foreground">
                        2211.82–10256.71 MPa
                      </td>
                      <td className="border-b border-border px-6 py-5 text-sm text-foreground">
                        ~4000–9000 MPa
                      </td>
                      <td className="border-b border-border px-6 py-5 text-sm leading-7 text-muted-foreground">
                        Stiffness varies by sample and configuration, with upper-end results
                        outperforming typical plywood references.
                      </td>
                    </tr>

                    <tr className="align-top">
                      <td className="border-b border-border px-6 py-5 text-sm font-medium text-foreground">
                        Compression Strength
                      </td>
                      <td className="border-b border-border px-6 py-5 text-sm text-foreground">
                        25.19–30.46 MPa
                      </td>
                      <td className="border-b border-border px-6 py-5 text-sm text-foreground">
                        ~20–35 MPa
                      </td>
                      <td className="border-b border-border px-6 py-5 text-sm leading-7 text-muted-foreground">
                        Compressive performance is within the range expected for commercial
                        plywood boards.
                      </td>
                    </tr>

                    <tr className="align-top bg-stone-50/70">
                      <td className="px-6 py-5 text-sm font-medium text-foreground">
                        Hardness
                      </td>
                      <td className="px-6 py-5 text-sm text-foreground">
                        3918.33–7377.33 N
                      </td>
                      <td className="px-6 py-5 text-sm text-foreground">
                        Typically lower and more variable
                      </td>
                      <td className="px-6 py-5 text-sm leading-7 text-muted-foreground">
                        Useful for surface durability and wear resistance in interior and
                        exposed applications.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-10 rounded-3xl border border-border bg-card p-6 shadow-sm lg:p-8">
              <h3 className="text-2xl font-semibold text-foreground">Testing Notes</h3>

              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Results apply to the specific samples submitted for testing and are
                provided for reference. Values may vary depending on product
                configuration, moisture content, thickness, ply arrangement, and
                manufacturing lot.
              </p>

              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Full technical results and supporting documentation are available upon
                request. Please contact our team if you require the complete testing
                package for evaluation, procurement review, or project submission.
              </p>

              <div className="mt-5 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-border bg-stone-100 px-3 py-1 text-foreground/80">
                  MOR: 22.77–69.44 MPa
                </span>
                <span className="rounded-full border border-border bg-stone-100 px-3 py-1 text-foreground/80">
                  MOE: 2211.82–10256.71 MPa
                </span>
                <span className="rounded-full border border-border bg-stone-100 px-3 py-1 text-foreground/80">
                  Compression: 25.19–30.46 MPa
                </span>
                <span className="rounded-full border border-border bg-stone-100 px-3 py-1 text-foreground/80">
                  Hardness: 3918.33–7377.33 N
                </span>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/contact">
                  <Button>Contact Sales for Full Results</Button>
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
import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  Leaf, 
  Award, 
  TrendingDown, 
  TreePine, 
  Recycle, 
  Globe, 
  ArrowRight,
  CheckCircle2,
  BarChart3
} from 'lucide-react'

export const metadata = {
  title: 'ESG & Sustainability | NUMAT',
  description: 'Learn about our commitment to environmental sustainability, FSC-certified carbon-negative bamboo products, and our partnership with Wavemaker Impact.',
}

export default function ESGPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-primary/5 py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Award className="w-4 h-4" />
                <span>Wavemaker Impact Partner</span>
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl text-foreground leading-tight text-balance">
                Sustainable Bamboo for a{' '}
                <span className="text-primary">Carbon-Negative</span> Future
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed text-pretty">
                At NUMAT, sustainability is not just a promise, it is measurable and verified. 
                Our NuBam engineered bamboo products are FSC-certified and verified carbon-negative by Wavemaker Impact, 
                contributing to a healthier planet with every order.
              </p>
            </div>
          </div>
        </section>

        {/* Carbon Impact */}
        <section className="py-16 lg:py-20 bg-background">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-serif text-3xl text-foreground mb-6">
                  Our Carbon Impact
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-8">
                  Bamboo is one of the fastest-growing plants on Earth, absorbing carbon dioxide 
                  at rates far exceeding most trees. Our engineered bamboo products lock in 
                  this captured carbon for the lifetime of the product, making every board a 
                  net-positive contribution to the environment.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg">
                    <TrendingDown className="w-8 h-8 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">-2.5 tons CO2 per cubic meter</p>
                      <p className="text-sm text-muted-foreground">Net carbon sequestration</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <TreePine className="w-8 h-8 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">3-5 year harvest cycle</p>
                      <p className="text-sm text-muted-foreground">Sustainable regrowth without replanting</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <Recycle className="w-8 h-8 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">100% natural materials</p>
                      <p className="text-sm text-muted-foreground">Biodegradable at end of life</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Carbon breakdown card */}
              <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <BarChart3 className="w-6 h-6 text-primary" />
                  <h3 className="font-semibold text-lg text-foreground">Carbon Lifecycle Analysis</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-foreground">Bamboo Growth (Sequestration)</span>
                      <span className="font-medium text-primary">-3.0 t CO2</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-full" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-foreground">Harvesting</span>
                      <span className="font-medium text-muted-foreground">+0.1 t CO2</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-muted-foreground/50 w-[3%]" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-foreground">Processing & Manufacturing</span>
                      <span className="font-medium text-muted-foreground">+0.25 t CO2</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-muted-foreground/50 w-[8%]" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-foreground">Transportation</span>
                      <span className="font-medium text-muted-foreground">+0.15 t CO2</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-muted-foreground/50 w-[5%]" />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-foreground">Net Carbon Impact</span>
                      <span className="font-bold text-xl text-primary">-2.5 t CO2</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Per cubic meter of bamboo product
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Wavemaker Impact */}
        <section className="py-16 lg:py-20 bg-secondary">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-6">
                <Award className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-serif text-3xl text-foreground mb-4">
                Wavemaker Impact Partnership
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                NUMAT is proud to be a portfolio company of Wavemaker Impact, 
                Southeast Asia&apos;s leading climate-tech investor. This partnership validates 
                our commitment to measurable environmental impact and sustainable business practices. 
                <a href="https://www.wavemakerimpact.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline"> Learn more about Wavemaker Impact</a>.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-card rounded-xl border border-border p-6">
                <Globe className="w-10 h-10 text-primary mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Verified Impact</h3>
                <p className="text-sm text-muted-foreground">
                  All carbon claims are independently verified and monitored through 
                  Wavemaker&apos;s rigorous impact measurement framework.
                </p>
              </div>
              <div className="bg-card rounded-xl border border-border p-6">
                <Leaf className="w-10 h-10 text-primary mb-4" />
                <h3 className="font-semibold text-foreground mb-2">FSC-Certified Sourcing</h3>
                <p className="text-sm text-muted-foreground">
                  Our bamboo is sourced exclusively from FSC-certified plantations that prioritize 
                  biodiversity and local community welfare. 100% of our products are certified.
                </p>
              </div>
              <div className="bg-card rounded-xl border border-border p-6">
                <TrendingDown className="w-10 h-10 text-primary mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Continuous Improvement</h3>
                <p className="text-sm text-muted-foreground">
                  We are committed to reducing our operational footprint through 
                  renewable energy and optimized logistics.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Our Commitments */}
        <section className="py-16 lg:py-20 bg-background">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <h2 className="font-serif text-3xl text-foreground text-center mb-12">
              Our ESG Commitments
            </h2>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-primary" />
                  Environmental
                </h3>
                <ul className="space-y-3">
                  {[
                    'Carbon-negative product lifecycle',
                    'Zero deforestation supply chain',
                    '100% FSC-certified materials',
                    'Minimal water usage in processing',
                    'Renewable energy transition roadmap',
                    'Waste reduction and recycling programs',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Social & Governance
                </h3>
                <ul className="space-y-3">
                  {[
                    'Fair wages for plantation workers',
                    'Safe working conditions',
                    'Community development programs',
                    'Transparent supply chain',
                    'Regular third-party audits',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Methodology note */}
        <section className="py-12 bg-muted/50">
          <div className="mx-auto max-w-3xl px-4 lg:px-8 text-center">
            <p className="text-sm text-muted-foreground">
              Carbon calculations are based on life cycle assessment (LCA) methodology 
              following ISO 14040/14044 standards. Data is reviewed and validated by 
              Wavemaker Impact. For detailed methodology and verification documents, 
              please contact us.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 lg:py-20 bg-background">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="bg-primary rounded-3xl p-8 sm:p-12 text-center">
              <h2 className="font-serif text-3xl text-primary-foreground mb-4 text-balance">
                Choose Sustainable. Choose NuBam.
              </h2>
              <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8 text-pretty">
                Every NuBam engineered bamboo board you choose contributes to carbon reduction 
                and supports FSC-certified sustainable forestry practices worldwide.
              </p>
              <Link href="/products">
                <Button size="lg" variant="secondary" className="gap-2">
                  Browse Products
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

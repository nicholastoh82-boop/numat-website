import Link from 'next/link'
import { ArrowRight, Leaf, Award, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ESGCallout() {
  return (
    <section className="py-20 bg-primary/5">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Award className="w-4 h-4" />
              <span>Wavemaker Impact Partner</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl text-foreground">
              Building a Greener Future with Every Board
            </h2>

            <p className="mt-6 text-muted-foreground leading-relaxed">
              NUMAT is proud to be a Wavemaker Impact portfolio company. Our NuBam engineered bamboo 
              products are FSC-certified and verified carbon-negative, meaning they sequester more CO2 
              than they emit throughout their entire lifecycle from growth to delivery.
            </p>

            <div className="mt-8 grid sm:grid-cols-3 gap-6">
              <div className="text-center sm:text-left">
                <div className="text-3xl font-serif text-primary">-2.5</div>
                <p className="text-sm text-muted-foreground mt-1">tons CO2 per m3</p>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-3xl font-serif text-primary">100%</div>
                <p className="text-sm text-muted-foreground mt-1">FSC Certified</p>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-3xl font-serif text-primary">3-5</div>
                <p className="text-sm text-muted-foreground mt-1">year harvest cycle</p>
              </div>
            </div>

            <Link href="/esg" className="mt-8 inline-block">
              <Button variant="outline" className="gap-2 bg-transparent">
                Learn about our ESG commitment
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Leaf className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Carbon Impact</p>
                  <p className="font-serif text-2xl text-foreground">Carbon Negative</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <TrendingDown className="w-5 h-5 text-primary" />
                    <span className="text-sm text-foreground">Bamboo Growth</span>
                  </div>
                  <span className="font-medium text-primary">-3.0 t CO2</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-muted-foreground/30" />
                    <span className="text-sm text-foreground">Processing</span>
                  </div>
                  <span className="font-medium text-muted-foreground">+0.3 t CO2</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-muted-foreground/30" />
                    <span className="text-sm text-foreground">Transport</span>
                  </div>
                  <span className="font-medium text-muted-foreground">+0.2 t CO2</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <span className="font-medium text-foreground">Net Impact</span>
                  <span className="font-bold text-lg text-primary">-2.5 t CO2</span>
                </div>
              </div>
            </div>

            {/* Badge */}
            <div className="absolute -top-4 -right-4 bg-card rounded-xl shadow-lg border border-border p-4">
              <div className="flex items-center gap-2">
                <Award className="w-8 h-8 text-primary" />
                <div className="text-xs">
                  <p className="font-medium text-foreground">Wavemaker</p>
                  <p className="text-muted-foreground">Impact Verified</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

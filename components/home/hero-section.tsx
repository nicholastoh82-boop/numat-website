import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, MessageCircle, Leaf, Award, Clock } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent">
  <img
    src="/bamboo-forest.png"
    alt="Bamboo Forest"
    className="h-full w-full object-cover opacity-70"
  />
</div>
<div className="absolute inset-0 -z-10 bg-white/25"></div>

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:py-28 lg:py-36 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left text-white">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Leaf className="w-4 h-4" />
              <span>Sustainable Bamboo Solutions</span>
            </div>

            <h1 className="font-serif font-bold text-5xl sm:text-6xl lg:text-7xl text-white leading-tight drop-shadow-xl">
              Premium Bamboo for{' '}
              <span className="text-green-400 font-bold drop-shadow-lg">Sustainable</span>{' '}
              Building
            </h1>

            <p className="mt-6 text-xl text-white font-medium drop-shadow-lg max-w-2xl">
              From furniture to structural applications, our ESG-certified bamboo boards 
              deliver exceptional quality with minimal environmental impact. Get instant 
              quotes delivered via WhatsApp or Viber.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/products">
                <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Get Instant Quote
                </Button>
              </Link>
              <Link href="/products">
                <Button size="lg" variant="outline" className="bg-white text-black hover:bg-gray-200">
                  Browse Products
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-10 flex flex-wrap gap-6 justify-center lg:justify-start">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Award className="w-5 h-5 text-primary" />
                <span>Wavemaker Impact Partner</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-5 h-5 text-primary" />
                <span>10-Day Lead Time</span>
              </div>
            </div>
          </div>

          {/* Visual */}
          <div className="relative lg:h-[500px] hidden lg:flex items-center justify-center">
            <div className="relative w-full max-w-md">
              {/* Main card */}
              <div className="relative bg-card rounded-2xl shadow-xl border border-border p-8 transform rotate-2">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Quote Preview</span>
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                      Instant
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="h-3 bg-muted rounded-full w-3/4" />
                    <div className="h-3 bg-muted rounded-full w-1/2" />
                    <div className="h-3 bg-muted rounded-full w-2/3" />
                  </div>
                  <div className="pt-4 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <span className="font-serif text-2xl text-foreground">PHP 28,580</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 h-10 bg-accent/20 rounded-lg flex items-center justify-center text-xs font-medium text-accent-foreground">
                      Viber
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -top-4 -left-4 bg-card rounded-xl shadow-lg border border-border p-4 transform -rotate-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Leaf className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Carbon Negative</p>
                    <p className="font-semibold text-foreground">-2.5 tons CO2</p>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -right-4 bg-card rounded-xl shadow-lg border border-border p-4 transform rotate-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Award className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Bulk Discount</p>
                    <p className="font-semibold text-primary">15% OFF</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

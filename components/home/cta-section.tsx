import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MessageCircle, ArrowRight } from 'lucide-react'

export function CTASection() {
  return (
    <section className="py-20 bg-background">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="relative bg-primary rounded-3xl overflow-hidden">
          {/* Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 400 400" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          <div className="relative px-6 py-16 sm:px-12 sm:py-20 text-center">
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-primary-foreground max-w-3xl mx-auto text-balance">
              Ready to Build with Sustainable Bamboo?
            </h2>
            <p className="mt-6 text-lg text-primary-foreground/80 max-w-xl mx-auto text-pretty">
              Get your instant quote delivered via WhatsApp or Viber. 
              MOQ 10 boards, bulk discounts available.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/products">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Get Instant Quote
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent">
                  Contact Sales
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
